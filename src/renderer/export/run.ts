import { useSyncExternalStore } from 'react';
import { composeFrame, outputSize } from '../../core/captions/compose';
import type { ProjectDocument, StyleVersion } from '../../core/contracts/types';
import { seededIndices } from '../../core/export/seed';
import { expectedFrames as countFrames, frameToUs } from '../../core/time';
import { onEffect } from '../commands/runtime';
import { fontsReady } from '../fonts';
import { createFrameSource } from '../player/decoder';
import { openDemuxer } from '../player/demux';
import { createH264Encoder } from './encoder';
import type { EncoderKind, ExportError, ExportResult, ExportStartOptions, ExportStatus } from './types';

// خط التصدير (T050، R2): فك (مشغّل التطبيق) → composeFrame على OffscreenCanvas بدقة المصدر → VideoEncoder (Annex-B)
// → export:chunk بالترتيب → main يدمج بـFFmpeg ويفحص العدّ. المسار الاحتياطي: إطارات RGBA خام إلى مشفّر FFmpeg عتادي.

let status: ExportStatus = { phase: 'idle' };
const listeners = new Set<() => void>();
function set(next: ExportStatus): void {
  status = next;
  listeners.forEach((l) => l());
}
export function getExportStatus(): ExportStatus {
  return status;
}
export function useExport(): ExportStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
  );
}

let current: { abort: AbortController; promise: Promise<ExportResult> } | null = null;
/** وعد التصدير الجاري (للاختبارات والشاشة)؛ null إن لم يكن هناك تصدير. */
export function inflightExport(): Promise<ExportResult> | null {
  return current?.promise ?? null;
}
export function cancelExport(): void {
  current?.abort.abort();
}

const toError = (e: unknown): ExportError => {
  if (typeof e === 'object' && e !== null && typeof (e as ExportError).code === 'string') {
    return { code: (e as ExportError).code, message: String((e as ExportError).message ?? '') };
  }
  return { code: 'internal', message: e instanceof Error ? e.message : String(e) };
};

const KEYFRAME_SECONDS = 2;
const MAX_ENCODE_QUEUE = 8;

/** المشفّر العتادي الوحيد المسموح للمسار الاحتياطي (القرار 14): أول مشفّر h264 عتادي نجح ترميزه التجريبي. */
async function hardwareFfmpegEncoder(): Promise<string | null> {
  const report = await window.api.ffmpeg.encoders().catch(() => null);
  return report?.h264.find((e) => e.hardware && e.works)?.name ?? null;
}

async function exportProject(project: ProjectDocument, style: StyleVersion, outputPath: string, signal: AbortSignal): Promise<ExportResult> {
  const t0 = performance.now();
  const { source, timeline } = project;
  const fps = source.fps;
  const fpsNumber = fps.num / fps.den;
  const total = countFrames(timeline.clips);
  const geometry = { width: source.width, height: source.height, rotation: source.rotation ?? 0 };
  const { width, height } = outputSize(geometry);
  const refIndices = new Set(seededIndices(project.seed, total));
  const keyInterval = Math.max(1, Math.round(KEYFRAME_SECONDS * fpsNumber));
  const throwIfAborted = (): void => {
    if (signal.aborted) throw { code: 'aborted', message: 'أُلغي التصدير' } satisfies ExportError;
  };

  set({ phase: 'running', outputPath, done: 0, total, encoder: null });

  // الكتل تُرسل بالترتيب على سلسلة واحدة؛ أول فشل إرسال يوقف الحلقة
  let sessionId: string | null = null;
  let sendChain: Promise<void> = Promise.resolve();
  let sendError: unknown = null;
  const send = (fn: () => Promise<void>): void => {
    sendChain = sendChain.then(fn).catch((e: unknown) => {
      sendError ??= e;
    });
  };
  const enc: { error: Error | null } = { error: null };
  const handle = await createH264Encoder({
    width,
    height,
    fps: fpsNumber,
    output: (chunk) => {
      const buf = new ArrayBuffer(chunk.byteLength);
      chunk.copyTo(buf);
      const sid = sessionId!;
      send(() => window.api.export.chunk(sid, buf, chunk.type === 'key', chunk.timestamp));
    },
    error: (e) => {
      enc.error = e;
    },
  });
  let raw: ExportStartOptions['raw'];
  let encoderKind: EncoderKind;
  if (handle) encoderKind = handle.kind;
  else {
    const name = await hardwareFfmpegEncoder();
    if (!name) {
      throw {
        code: 'encoder_unavailable',
        message:
          'لا يوجد مشفّر H.264 على هذا الجهاز، فلا يمكن التصدير (القرار 14). يحتاج التصدير مشفّراً عتادياً: VideoToolbox على ماك، أو NVENC/QSV/AMF على ويندوز — حدّث تعريفات كرت الشاشة أو صدّر من جهاز آخر.',
      } satisfies ExportError;
    }
    raw = { width, height, encoder: name };
    encoderKind = `ffmpeg:${name}`;
  }
  set({ phase: 'running', outputPath, done: 0, total, encoder: encoderKind });

  const demuxer = await openDemuxer(window.api.media.urlFor(project.id));
  const frames = await createFrameSource(demuxer, fps);
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d', { willReadFrequently: raw !== undefined });
  if (!ctx) throw { code: 'internal', message: 'تعذّر إنشاء سياق 2D للتصدير' } satisfies ExportError;
  const fonts = { ready: fontsReady() };

  try {
    throwIfAborted();
    const edl = timeline.clips.map((c) => ({ inUs: frameToUs(c.inFrame, fps), outUs: frameToUs(c.outFrame, fps) }));
    const startOpts: ExportStartOptions = { outputPath, expectedFrames: total, fps, edl };
    if (raw) startOpts.raw = raw;
    ({ sessionId } = await window.api.export.start(project.id, startOpts));
    const sid = sessionId;

    let t = 0; // إطار الخط الزمني (الناتج)
    let lastProgress = 0;
    for (const clip of timeline.clips) {
      for (let src = clip.inFrame; src < clip.outFrame; src++, t++) {
        throwIfAborted();
        if (enc.error) throw { code: 'encode_failed', message: `فشل الترميز: ${enc.error.message}` } satisfies ExportError;
        if (sendError) throw sendError;
        const frame = await frames.getFrame(src);
        composeFrame(ctx, t, geometry, frame, project.captions.cues, style, fonts);
        const timestamp = frameToUs(t, fps);
        if (refIndices.has(t)) {
          const png = await (await canvas.convertToBlob({ type: 'image/png' })).arrayBuffer();
          const index = t;
          send(() => window.api.export.referenceFrame(sid, index, png));
        }
        if (raw) {
          const rgba = ctx.getImageData(0, 0, width, height).data.buffer as ArrayBuffer;
          send(() => window.api.export.chunk(sid, rgba, true, timestamp));
        } else {
          const vf = new VideoFrame(canvas, { timestamp });
          handle!.encoder.encode(vf, { keyFrame: t % keyInterval === 0 });
          vf.close();
          // ضغط رجعي: لا نسبق المشفّر بأكثر من MAX_ENCODE_QUEUE إطاراً (الذاكرة)
          while (handle!.encoder.encodeQueueSize > MAX_ENCODE_QUEUE && !enc.error) {
            await new Promise<void>((r) => handle!.encoder.addEventListener('dequeue', () => r(), { once: true }));
          }
        }
        if (performance.now() - lastProgress > 100) {
          lastProgress = performance.now();
          set({ phase: 'running', outputPath, done: t + 1, total, encoder: encoderKind });
        }
      }
    }
    if (handle) {
      await handle.encoder.flush();
      if (enc.error) throw { code: 'encode_failed', message: `فشل الترميز: ${enc.error.message}` } satisfies ExportError;
    }
    await sendChain;
    if (sendError) throw sendError;
    throwIfAborted();
    set({ phase: 'running', outputPath, done: total, total, encoder: encoderKind });
    const encodeMs = performance.now() - t0;
    const finish = await window.api.export.finish(sid);
    return { ...finish, encoder: encoderKind, encodeMs, elapsedMs: performance.now() - t0 };
  } catch (e) {
    // أي فشل أو إلغاء: main يقتل ffmpeg ويحذف الملف الناقص (FR-014)
    if (sessionId) await window.api.export.cancel(sessionId).catch(() => undefined);
    throw e;
  } finally {
    if (handle && handle.encoder.state !== 'closed') handle.encoder.close();
    frames.dispose();
  }
}

/** يبدأ تصديراً واحداً في كل مرة ويحدّث الحالة؛ يرفض بـ{code,message}. */
export function startExport(project: ProjectDocument, style: StyleVersion, outputPath: string): Promise<ExportResult> {
  if (current) return Promise.reject({ code: 'export_busy', message: 'يوجد تصدير جارٍ بالفعل' } satisfies ExportError);
  const abort = new AbortController();
  const promise = exportProject(project, style, outputPath, abort.signal)
    .then((result) => {
      set({ phase: 'done', result });
      return result;
    })
    .catch((e: unknown) => {
      const error = toError(e);
      set(error.code === 'aborted' ? { phase: 'cancelled', outputPath } : { phase: 'failed', outputPath, error });
      throw error;
    })
    .finally(() => {
      current = null;
    });
  current = { abort, promise };
  promise.catch(() => undefined);
  return promise;
}

// أثر الأمر export.mp4 (نقي في core) → التنفيذ الفعلي هنا
onEffect('export-mp4', (effect, project, style) => {
  void startExport(project, style, effect.outputPath).catch(() => undefined);
});
