import { describe, it, expect } from 'vitest';
import { playableRanges } from '../../../../src/core/proposal/listen';
import type { Proposal } from '../../../../src/core/contracts/types';

// T048 / القرار 22 (أ): تشغيل المشروع مع تخطّي البنود المقترحة — المدى القابل للتشغيل بإطارات المصدر.
type Item = Proposal['items'][number];
const item = (startUs: number, endUs: number, state: Item['state'] = 'proposed'): Item => ({
  id: `i-${startUs}`,
  startUs,
  endUs,
  text: '',
  reason: 'silence',
  ruleId: 'cut.silenceMaxUs',
  state,
});
const fps = { num: 30, den: 1 };
const clip = (inFrame: number, outFrame: number, timelineStartFrame: number) => ({ id: `c${inFrame}`, sourceId: 's', inFrame, outFrame, timelineStartFrame });

describe('playableRanges', () => {
  it('بلا بنود → اللقطات كما هي', () => {
    expect(playableRanges([clip(0, 150, 0)], [], fps)).toEqual([{ inFrame: 0, outFrame: 150 }]);
  });

  it('يطرح البنود proposed فقط (المستثنى والمحظور يُشغَّلان) ويقسم اللقطة', () => {
    const items = [item(1_000_000, 2_000_000), item(3_000_000, 3_500_000, 'excluded'), item(4_000_000, 4_500_000, 'blocked')];
    expect(playableRanges([clip(0, 150, 0)], items, fps)).toEqual([
      { inFrame: 0, outFrame: 30 },
      { inFrame: 60, outFrame: 150 },
    ]);
  });

  it('بند يمتد عبر لقطتين أو يغطي لقطة كاملة؛ الترتيب ترتيب التايم لاين', () => {
    const clips = [clip(90, 150, 0), clip(0, 60, 60)];
    const items = [item(1_500_000, 3_200_000)]; // إطارات [45, 96)
    expect(playableRanges(clips, items, fps)).toEqual([
      { inFrame: 96, outFrame: 150 },
      { inFrame: 0, outFrame: 45 },
    ]);
    expect(playableRanges([clip(0, 30, 0), clip(60, 90, 30)], [item(0, 1_000_000)], fps)).toEqual([{ inFrame: 60, outFrame: 90 }]);
  });

  it('بند أقصر من إطار لا يقطع شيئاً', () => {
    expect(playableRanges([clip(0, 150, 0)], [item(1_000_000, 1_010_000)], fps)).toEqual([{ inFrame: 0, outFrame: 150 }]);
  });
});
