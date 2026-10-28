import type { StyleVersion } from '../contracts/types';
import type { Rational } from '../time';
import { usToFrame } from '../time';
import type { Clip } from './ops';

export const MIN_CLIP_RULE = 'cut.minClipUs';

/** الحد الأدنى لطول اللقطة بالإطارات على شبكة المشروع. */
export function minClipFrames(style: StyleVersion, fps: Rational): number {
  return usToFrame(style.cut.minClipUs.value as number, fps);
}

/**
 * تحذيرات لقطة من حالتها (لا من الأمر): below_min_clip عند قصرها عن minClipUs،
 * و violates_mandatory_rule إضافةً إليه عندما تكون القاعدة إلزامية (FR-009) — الواجهة تُبقي الشارة على اللقطة.
 */
export function clipWarnings(clip: Clip, style: StyleVersion, fps: Rational): string[] {
  if (clip.outFrame - clip.inFrame >= minClipFrames(style, fps)) return [];
  return style.cut.minClipUs.mode === 'mandatory'
    ? ['below_min_clip', 'violates_mandatory_rule']
    : ['below_min_clip'];
}
