import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Clip } from '../../core/timeline/ops';
import { formatNumber, t } from '../i18n';

export interface TrimRequest {
  clipId: string;
  inFrame?: number;
  outFrame?: number;
}

interface Drag {
  clipId: string;
  side: 'in' | 'out';
  startX: number;
  delta: number;
}

/**
 * مسار اللقطات: عرض كل لقطة ∝ عدد إطاراتها، مقابض سحب للقصّ (pointer)، اختيار بالنقر، شارة تحذير تبقى
 * على اللقطة المخالفة (FR-009). التعديل الفعلي يمرّ عبر onTrim ← runtime.run.
 */
export function TimelineTrack({
  clips,
  frameCount,
  playhead,
  selectedId,
  warningsOf,
  onSelect,
  onSeek,
  onTrim,
}: {
  clips: ReadonlyArray<Clip>;
  frameCount: number;
  playhead: number;
  selectedId: string | null;
  warningsOf: (clip: Clip) => string[];
  onSelect: (clipId: string) => void;
  onSeek: (frame: number) => void;
  onTrim: (req: TrimRequest) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const total = clips.reduce((s, c) => s + (c.outFrame - c.inFrame), 0);

  function pxPerFrame(): number {
    const w = trackRef.current?.clientWidth ?? 1;
    return total > 0 ? w / total : 1;
  }

  /** حدود اللقطة أثناء السحب (معاينة محلية؛ لا أمر حتى pointerup) */
  function bounds(c: Clip): { inFrame: number; outFrame: number } {
    if (!drag || drag.clipId !== c.id) return c;
    if (drag.side === 'in') return { inFrame: Math.min(Math.max(0, c.inFrame + drag.delta), c.outFrame - 1), outFrame: c.outFrame };
    return { inFrame: c.inFrame, outFrame: Math.max(Math.min(frameCount, c.outFrame + drag.delta), c.inFrame + 1) };
  }

  function startDrag(e: ReactPointerEvent<HTMLDivElement>, clipId: string, side: 'in' | 'out'): void {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    onSelect(clipId);
    setDrag({ clipId, side, startX: e.clientX, delta: 0 });
  }
  function moveDrag(e: ReactPointerEvent<HTMLDivElement>): void {
    if (!drag) return;
    setDrag({ ...drag, delta: Math.round((e.clientX - drag.startX) / pxPerFrame()) });
  }
  function endDrag(): void {
    if (!drag) return;
    const clip = clips.find((c) => c.id === drag.clipId);
    setDrag(null);
    if (!clip || drag.delta === 0) return;
    const b = bounds(clip);
    if (drag.side === 'in' && b.inFrame !== clip.inFrame) onTrim({ clipId: clip.id, inFrame: b.inFrame });
    if (drag.side === 'out' && b.outFrame !== clip.outFrame) onTrim({ clipId: clip.id, outFrame: b.outFrame });
  }

  function seekAt(e: ReactPointerEvent<HTMLDivElement>): void {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || total === 0) return;
    const frame = Math.floor(((e.clientX - rect.left) / rect.width) * total);
    onSeek(Math.max(0, Math.min(total - 1, frame)));
  }

  return (
    <div ref={trackRef} className="track" data-testid="track" onPointerDown={seekAt}>
      {clips.map((c, i) => {
        const b = bounds(c);
        const frames = b.outFrame - b.inFrame;
        const warnings = warningsOf(c);
        const mandatory = warnings.includes('violates_mandatory_rule');
        const cls = ['clip', c.id === selectedId && 'selected', mandatory && 'warning', drag?.clipId === c.id && 'dragging']
          .filter(Boolean)
          .join(' ');
        return (
          <div
            key={c.id}
            className={cls}
            style={{ flexGrow: frames }}
            data-testid="clip"
            data-clip-id={c.id}
            data-frames={c.outFrame - c.inFrame}
            data-warning={warnings.length ? warnings.join(' ') : undefined}
            title={`${t('timeline.clip')} ${formatNumber(i + 1)}: ${formatNumber(c.inFrame)}–${formatNumber(c.outFrame)}`}
            onPointerDown={(e) => {
              onSelect(c.id);
              seekAt(e);
            }}
          >
            <span>{formatNumber(i + 1)}</span>
            <span className="hint">{formatNumber(frames)}</span>
            {warnings.length > 0 && (
              <span
                className="badge"
                data-testid="clip-warning"
                role="img"
                aria-label={t('timeline.warningBadge')}
                title={t(mandatory ? 'timeline.warn.mandatory' : 'timeline.warn.preference')}
              >
                ⚠
              </span>
            )}
            <div className="handle in" data-testid="handle-in" onPointerDown={(e) => startDrag(e, c.id, 'in')} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} />
            <div className="handle out" data-testid="handle-out" onPointerDown={(e) => startDrag(e, c.id, 'out')} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} />
          </div>
        );
      })}
      {total > 0 && <div className="playhead" data-testid="playhead" style={{ left: `${(playhead / total) * 100}%` }} />}
    </div>
  );
}
