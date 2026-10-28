import type { ProjectDocument, Proposal } from '../contracts/types';
import type { Rational } from '../time';
import { usToFrame } from '../time';

type Clip = ProjectDocument['timeline']['clips'][number];
export interface FrameRange {
  inFrame: number;
  outFrame: number;
}

/**
 * وضع الاستماع (أ) في القرار 22 / FR-004: مدى التشغيل = اللقطات بترتيب التايم لاين ناقص البنود `proposed`
 * (المستثنى والمحظور لن يُقصّا فيُسمعان). نفس تحويل الإطارات الذي يستعمله proposal.apply.
 */
export function playableRanges(clips: readonly Clip[], items: readonly Proposal['items'][number][], fps: Rational): FrameRange[] {
  const skips = items
    .filter((i) => i.state === 'proposed')
    .map((i) => ({ inFrame: usToFrame(i.startUs, fps), outFrame: usToFrame(i.endUs, fps) }))
    .filter((r) => r.inFrame < r.outFrame)
    .sort((a, b) => a.inFrame - b.inFrame);
  const out: FrameRange[] = [];
  for (const clip of [...clips].sort((a, b) => a.timelineStartFrame - b.timelineStartFrame)) {
    let cursor = clip.inFrame;
    for (const s of skips) {
      if (s.outFrame <= cursor || s.inFrame >= clip.outFrame) continue;
      if (s.inFrame > cursor) out.push({ inFrame: cursor, outFrame: s.inFrame });
      cursor = Math.max(cursor, s.outFrame);
    }
    if (cursor < clip.outFrame) out.push({ inFrame: cursor, outFrame: clip.outFrame });
  }
  return out;
}
