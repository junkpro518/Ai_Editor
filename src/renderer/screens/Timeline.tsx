import { useCallback, useEffect, useRef, useState } from 'react';
import type { StyleVersion } from '../../core/contracts/types';
import type { Rational } from '../../core/time';
import { expectedFrames, frameToUs, usToFrame } from '../../core/time';
import type { Clip } from '../../core/timeline/ops';
import { clipAtTimelineFrame, timelineToSource } from '../../core/timeline/ops';
import { clipWarnings } from '../../core/timeline/warnings';
import { TimelineTrack } from '../components/TimelineTrack';
import type { TrimRequest } from '../components/TimelineTrack';
import { run, toIpcError, useRuntime } from '../commands/runtime';
import { formatDurationUs, formatNumber, t } from '../i18n';
import { mountPreview } from '../player';
import type { Player } from '../player';
import { installTimelineTestHooks } from './timelineTestHooks';
import './timeline.css';

/** mm:ss.ff من إطار التايم لاين: الثواني من frameToUs والإطار داخل الثانية بالفرق عن usToFrame(ثانية) */
export function timecode(frame: number, fps: Rational): string {
  const s = Math.floor(frameToUs(frame, fps) / 1e6);
  const ff = frame - usToFrame(s * 1e6, fps);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}.${String(ff).padStart(2, '0')}`;
}

type ErrorKey = 'error.last_clip' | 'error.nothing_to_undo' | 'error.nothing_to_redo';
const KNOWN_ERRORS: ReadonlySet<string> = new Set(['last_clip', 'nothing_to_undo', 'nothing_to_redo']);

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

export function Timeline() {
  const { project, style } = useRuntime();
  if (!project || !style) return <section className="screen">{t('timeline.empty')}</section>;
  return <Editor key={project.id} projectId={project.id} clips={project.timeline.clips} fps={project.source.fps} frameCount={project.source.frameCount} style={style} name={project.name} durationUs={project.source.durationUs} />;
}

function Editor({
  projectId,
  clips,
  fps,
  frameCount,
  style,
  name,
  durationUs,
}: {
  projectId: string;
  clips: ReadonlyArray<Clip>;
  fps: Rational;
  frameCount: number;
  style: StyleVersion;
  name: string;
  durationUs: number;
}) {
  const total = expectedFrames(clips);
  const [playhead, setPlayhead] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState<{ text: string; warn: boolean } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<Player | null>(null);
  const playingRef = useRef(false);
  const clipsRef = useRef(clips);
  clipsRef.current = clips;

  const stop = useCallback((): void => {
    playingRef.current = false;
    setPlaying(false);
    playerRef.current?.pause();
  }, []);

  // المعاينة: نربط canvas هذه الشاشة بمشغّل المشروع (نفس المشغّل الذي أنشأته شاشة الاستيراد)
  useEffect(() => {
    installTimelineTestHooks();
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    mountPreview(canvas, projectId)
      .then((p) => {
        if (cancelled) return;
        playerRef.current = p;
        setPreviewError(null);
        const src = timelineToSource(clipsRef.current, 0);
        if (src !== null) void p.show(src);
      })
      .catch((e: unknown) => {
        if (!cancelled) setPreviewError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
      stop();
    };
  }, [projectId, stop]);

  // بعد كل تعديل أو تحريك للمؤشر (خارج التشغيل): اعرض إطار المؤشر، ولا تتركه خارج التايم لاين
  useEffect(() => {
    if (total > 0 && playhead >= total) {
      setPlayhead(total - 1);
      return;
    }
    if (playingRef.current) return;
    const src = timelineToSource(clips, playhead);
    if (src !== null) void playerRef.current?.show(src).catch(() => undefined);
  }, [clips, playhead, total]);

  useEffect(() => {
    if (selectedId && !clips.some((c) => c.id === selectedId)) setSelectedId(null);
  }, [clips, selectedId]);

  const report = useCallback((r: { description: string; warnings?: string[] } | null): void => {
    if (!r) return;
    const warn = (r.warnings ?? []).includes('violates_mandatory_rule');
    setStatus({ text: warn ? `${r.description} — ${t('timeline.warn.mandatory')}` : r.description, warn });
  }, []);

  const fail = useCallback((e: unknown): void => {
    const err = toIpcError(e);
    setStatus({ text: KNOWN_ERRORS.has(err.code) ? t(`error.${err.code}` as ErrorKey) : err.message, warn: true });
  }, []);

  const edit = useCallback(
    async (fn: () => ReturnType<typeof run>): Promise<void> => {
      stop();
      try {
        report(await fn());
      } catch (e) {
        fail(e);
      }
    },
    [stop, report, fail],
  );

  const seek = useCallback(
    (frame: number): void => {
      stop();
      setPlayhead(Math.max(0, Math.min(Math.max(0, total - 1), frame)));
    },
    [stop, total],
  );

  const splitAtPlayhead = useCallback((): void => {
    const hit = clipAtTimelineFrame(clipsRef.current, playhead);
    if (!hit) return;
    if (hit.offset === 0) {
      setStatus({ text: t('timeline.splitEdge'), warn: true });
      return;
    }
    void edit(() => run('clip.split', { clipId: hit.clip.id, atFrame: hit.clip.inFrame + hit.offset }));
  }, [edit, playhead]);

  const deleteSelected = useCallback((): void => {
    if (!selectedId) {
      setStatus({ text: t('timeline.selectFirst'), warn: true });
      return;
    }
    void edit(() => run('clip.delete', { clipId: selectedId }));
  }, [edit, selectedId]);

  const move = useCallback(
    (dir: -1 | 1): void => {
      const idx = clipsRef.current.findIndex((c) => c.id === selectedId);
      if (idx < 0) return;
      const toIndex = idx + dir;
      if (toIndex < 0 || toIndex >= clipsRef.current.length) return;
      void edit(() => run('clip.move', { clipId: selectedId!, toIndex }));
    },
    [edit, selectedId],
  );

  const trim = useCallback((req: TrimRequest): void => void edit(() => run('clip.trim', req)), [edit]);
  const undo = useCallback((): void => void edit(() => run('history.undo', {})), [edit]);
  const redo = useCallback((): void => void edit(() => run('history.redo', {})), [edit]);

  /** تشغيل التايم لاين فوق مشغّل المصدر: نتابع إطار المصدر ونقفز عند حدود اللقطات (الفجوات تُتجاوز والصوت يتبع). */
  const play = useCallback((): void => {
    const player = playerRef.current;
    const hit = clipAtTimelineFrame(clipsRef.current, playhead);
    if (!player || !hit) return;
    playingRef.current = true;
    setPlaying(true);
    let seg = hit.index;
    const tick = (): void => {
      if (!playingRef.current) return;
      const cs = clipsRef.current;
      const clip = cs[seg];
      if (!clip) return stop();
      const cur = player.currentFrame();
      const ended = cur >= clip.outFrame || cur >= frameCount - 1;
      if (!ended) {
        setPlayhead(clip.timelineStartFrame + Math.max(0, cur - clip.inFrame));
        requestAnimationFrame(tick);
        return;
      }
      const next = cs[seg + 1];
      if (!next) {
        stop();
        setPlayhead(clip.timelineStartFrame + (clip.outFrame - clip.inFrame) - 1);
        return;
      }
      seg += 1;
      player.pause();
      void player
        .show(next.inFrame)
        .then(() => {
          if (!playingRef.current) return;
          setPlayhead(next.timelineStartFrame);
          player.play();
          requestAnimationFrame(tick);
        })
        .catch(() => stop());
    };
    void player
      .show(hit.clip.inFrame + hit.offset)
      .then(() => {
        if (!playingRef.current) return;
        player.play();
        requestAnimationFrame(tick);
      })
      .catch(() => stop());
  }, [playhead, frameCount, stop]);

  // اختصارات على مستوى النافذة (ليس على عنصر مركَّز): مسافة، الأسهم، S، Delete، Ctrl/Cmd+Z، Ctrl+Shift+Z / Ctrl+Y
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (isEditableTarget(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && key === 'y') {
        e.preventDefault();
        redo();
      } else if (mod) {
        return;
      } else if (e.key === ' ') {
        e.preventDefault();
        if (playingRef.current) stop();
        else play();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        seek(playhead + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        seek(playhead - 1);
      } else if (key === 's') {
        e.preventDefault();
        splitAtPlayhead();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, play, stop, seek, playhead, splitAtPlayhead, deleteSelected]);

  const selectedIndex = clips.findIndex((c) => c.id === selectedId);
  return (
    <section className="screen timeline" data-testid="timeline" data-project-id={projectId}>
      <div className="head">
        <h1>{name}</h1>
        <span className="facts-line">
          {formatDurationUs(durationUs)} · {fps.num}/{fps.den} fps · {formatNumber(frameCount)} {t('timeline.frames')} · {t('timeline.clips')}{' '}
          <span data-testid="clip-count">{formatNumber(clips.length)}</span>
        </span>
      </div>

      <div className="preview-root">
        <canvas ref={canvasRef} id="preview-canvas" width={640} height={360} />
      </div>
      {previewError && (
        <p className="error" role="alert" data-testid="preview-error">
          {t('timeline.previewError')} {previewError}
        </p>
      )}

      <div className="transport" role="toolbar">
        <button type="button" title={t('timeline.prevFrame')} data-testid="prev-frame" onClick={() => seek(playhead - 1)}>
          ◀
        </button>
        <button type="button" className="primary" data-testid="play" onClick={() => (playing ? stop() : play())}>
          {playing ? t('timeline.pause') : t('timeline.play')}
        </button>
        <button type="button" title={t('timeline.nextFrame')} data-testid="next-frame" onClick={() => seek(playhead + 1)}>
          ▶
        </button>
        <span className="timecode">
          <span data-testid="timecode">{timecode(playhead, fps)}</span>
          <span className="total" data-testid="timecode-total">
            {' / '}
            {timecode(total, fps)}
          </span>
        </span>
        <button type="button" data-testid="split" onClick={splitAtPlayhead}>
          {t('timeline.split')}
        </button>
        <button type="button" data-testid="delete" onClick={deleteSelected} disabled={!selectedId}>
          {t('timeline.delete')}
        </button>
        <button type="button" data-testid="undo" onClick={undo}>
          {t('timeline.undo')}
        </button>
        <button type="button" data-testid="redo" onClick={redo}>
          {t('timeline.redo')}
        </button>
      </div>

      <TimelineTrack
        clips={clips}
        frameCount={frameCount}
        playhead={playhead}
        selectedId={selectedId}
        warningsOf={(c) => clipWarnings(c, style, fps)}
        onSelect={setSelectedId}
        onSeek={seek}
        onTrim={trim}
      />

      <div className="clip-actions">
        {selectedIndex >= 0 && (
          <>
            <span>
              {t('timeline.clip')} {formatNumber(selectedIndex + 1)}
            </span>
            <button type="button" data-testid="move-earlier" title={t('timeline.moveEarlier')} disabled={selectedIndex === 0} onClick={() => move(-1)}>
              ◀
            </button>
            <button type="button" data-testid="move-later" title={t('timeline.moveLater')} disabled={selectedIndex === clips.length - 1} onClick={() => move(1)}>
              ▶
            </button>
          </>
        )}
      </div>

      <p className={`status${status?.warn ? ' warn' : ''}`} data-testid="status" role="status">
        {status?.text ?? ''}
      </p>
      <p className="hint">{t('timeline.shortcuts')}</p>
    </section>
  );
}
