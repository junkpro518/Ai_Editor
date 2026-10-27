import type { SourceGeometry } from '../../core/captions/types';
import type { ProjectDocument, StyleVersion } from '../../core/contracts/types';
import type { Rational } from '../../core/time';
import { createAudio } from './audio';
import type { AudioTrack } from './audio';
import { createFrameSource } from './decoder';
import { openDemuxer, PlayerError } from './demux';
import { createPreview } from './preview';

export { PlayerError } from './demux';

export interface PlayerOptions {
  projectId: string;
  fps: Rational;
  source: SourceGeometry & { frameCount: number; hasAudio: boolean };
  canvas: HTMLCanvasElement;
  style: StyleVersion;
  /** افتراضياً media://source/<projectId> عبر api.media.urlFor */
  url?: string;
}

export interface Player {
  show(frameIndex: number): Promise<void>;
  play(): void;
  pause(): void;
  currentFrame(): number;
  dispose(): void;
  /** للاختبارات: أبعاد الناتج وبصمة بكسلات آخر إطار مركّب. */
  snapshot(): { width: number; height: number; pixelHash: string };
  attach(canvas: HTMLCanvasElement): void;
}

// الحد الأدنى مما نحتاجه من preload (Agent E)؛ نوع محلي حتى لا يتعارض مع تصريح Window هناك
interface ApiLike {
  project: { load(id: string): Promise<ProjectDocument> };
  style: { loadVersion(styleId: string, version: number): Promise<StyleVersion> };
  media: { urlFor(projectId: string): string };
}
function api(): ApiLike {
  const a = (window as unknown as { api?: ApiLike }).api;
  if (!a) throw new Error('window.api غير متاح (preload)');
  return a;
}

export async function createPlayer(opts: PlayerOptions): Promise<Player> {
  const url = opts.url ?? api().media.urlFor(opts.projectId);
  const demuxer = await openDemuxer(url);
  const frames = await createFrameSource(demuxer, opts.fps);
  const preview = createPreview(opts.canvas, opts.source, opts.style);
  const audio: AudioTrack | null = opts.source.hasAudio ? createAudio(url, opts.fps) : null;
  const lastFrame = opts.source.frameCount - 1;

  let current = 0;
  let playing = false;
  let chain: Promise<void> = Promise.resolve(); // طلبات العرض متسلسلة: المفكّك لا يقبل طلبين معاً
  let inflight = false;
  // بلا صوت: ساعة حائط من لحظة التشغيل (rAF يختار الإطار فقط — لا يحدد ناتج التصدير أبداً)
  let wallStart = 0;
  let wallFrame = 0;

  async function render(frameIndex: number): Promise<void> {
    const i = Math.max(0, Math.min(lastFrame, frameIndex));
    const frame = await frames.getFrame(i);
    preview.draw(i, frame);
    current = i;
  }

  function show(frameIndex: number): Promise<void> {
    const run = chain.then(() => render(frameIndex));
    chain = run.catch(() => undefined);
    return run;
  }

  function clockFrame(): number {
    if (audio) return audio.currentFrame();
    const elapsedUs = Math.round((performance.now() - wallStart) * 1000);
    return wallFrame + Math.floor((elapsedUs * opts.fps.num) / (opts.fps.den * 1e6));
  }

  function tick(): void {
    if (!playing) return;
    const f = clockFrame();
    if (f >= lastFrame) {
      pause();
      void show(lastFrame);
      return;
    }
    if (f !== current && !inflight) {
      inflight = true;
      void show(f)
        .catch(() => undefined)
        .finally(() => {
          inflight = false;
        });
    }
    requestAnimationFrame(tick);
  }

  function pause(): void {
    playing = false;
    audio?.pause();
  }

  return {
    show,
    play() {
      if (playing) return;
      playing = true;
      if (audio) {
        audio.seekTo(current);
        void audio.play();
      } else {
        wallStart = performance.now();
        wallFrame = current;
      }
      requestAnimationFrame(tick);
    },
    pause,
    currentFrame: () => current,
    snapshot: () => ({ width: preview.width, height: preview.height, pixelHash: preview.pixelHash() }),
    attach: (canvas) => preview.attach(canvas),
    dispose() {
      pause();
      frames.dispose();
      audio?.dispose();
    },
  };
}

// ---- ربط بالواجهة: window.__preview و window.__test.frame (شاشة الاستيراد عند Agent E) ----

let active: { projectId: string; player: Player } | null = null;

async function loadProject(projectId: string): Promise<ProjectDocument> {
  // الحفظ عند E مؤجَّل 300ms بعد الاستيراد؛ نعيد المحاولة قبل الاستسلام
  let lastErr: unknown;
  for (let i = 0; i < 8; i++) {
    try {
      return await api().project.load(projectId);
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

function findCanvas(): HTMLCanvasElement {
  const existing = document.getElementById('preview-canvas');
  if (existing instanceof HTMLCanvasElement) return existing;
  const canvas = document.createElement('canvas');
  canvas.id = 'preview-canvas';
  canvas.width = 640;
  canvas.height = 360;
  (document.getElementById('preview-root') ?? document.body).appendChild(canvas);
  return canvas;
}

/** يربط معاينة مشروع بـcanvas معيّن (يبدّل المشغّل السابق). */
export async function mountPreview(canvas: HTMLCanvasElement, projectId: string): Promise<Player> {
  if (active?.projectId === projectId) {
    active.player.attach(canvas);
    return active.player;
  }
  active?.player.dispose();
  active = null;
  const project = await loadProject(projectId);
  const style = await api().style.loadVersion(project.style.styleId, project.style.version);
  const player = await createPlayer({
    projectId,
    fps: project.source.fps,
    source: {
      width: project.source.width,
      height: project.source.height,
      rotation: project.source.rotation ?? 0,
      frameCount: project.source.frameCount,
      hasAudio: project.source.hasAudio,
    },
    canvas,
    style,
  });
  active = { projectId, player };
  return player;
}

type FrameResult =
  | { ok: true; width: number; height: number; pixelHash: string }
  | { ok: false; code: string; message: string };

async function testFrame(frameIndex: number): Promise<FrameResult> {
  try {
    if (!active) throw new PlayerError('decode_failed', 'لا معاينة نشطة — استورد ملفاً أولاً');
    await active.player.show(frameIndex);
    return { ok: true, ...active.player.snapshot() };
  } catch (e) {
    return {
      ok: false,
      code: e instanceof PlayerError ? e.code : 'error',
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

/** نضيف frame إلى window.__test إن وُجد (نضيف خاصية ولا نستبدل الكائن — الكائن ملك E). */
function attachTestHook(): void {
  const w = window as unknown as { __test?: Record<string, unknown> };
  if (w.__test && typeof w.__test.frame !== 'function') w.__test.frame = testFrame;
}

const preview = {
  async show(projectId: string, frameIndex: number): Promise<void> {
    attachTestHook();
    const player = await mountPreview(findCanvas(), projectId);
    attachTestHook();
    await player.show(frameIndex);
  },
};
(window as unknown as { __preview?: typeof preview }).__preview = preview;
attachTestHook();
