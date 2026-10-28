import type { ProjectDocument } from '../contracts/types';

export type Clip = ProjectDocument['timeline']['clips'][number];

/** يعيد حساب timelineStartFrame حتى تبقى اللقطات متجاورة بلا فجوات ولا تداخل (data-model §1.3). */
export function recomputeStarts(clips: ReadonlyArray<Clip>): Clip[] {
  let start = 0;
  return clips.map((c) => {
    const next = { ...c, timelineStartFrame: start };
    start += c.outFrame - c.inFrame;
    return next;
  });
}

/** اللقطة التي يقع فيها إطار التايم لاين، مع إزاحته داخلها؛ null خارج التايم لاين. */
export function clipAtTimelineFrame(
  clips: ReadonlyArray<Clip>,
  frame: number,
): { clip: Clip; index: number; offset: number } | null {
  for (let index = 0; index < clips.length; index++) {
    const clip = clips[index]!;
    const offset = frame - clip.timelineStartFrame;
    if (offset >= 0 && offset < clip.outFrame - clip.inFrame) return { clip, index, offset };
  }
  return null;
}

/** إطار التايم لاين → إطار المصدر (الفجوات بين اللقطات تُتجاوز)؛ null خارج التايم لاين. */
export function timelineToSource(clips: ReadonlyArray<Clip>, frame: number): number | null {
  const hit = clipAtTimelineFrame(clips, frame);
  return hit ? hit.clip.inFrame + hit.offset : null;
}
