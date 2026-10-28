import { describe, it, expect } from 'vitest';
import { computeTotals } from '../../../../src/core/proposal/totals';
import type { ProposalItem } from '../../../../src/core/proposal/types';

const item = (p: Partial<ProposalItem> & Pick<ProposalItem, 'startUs' | 'endUs' | 'reason'>): ProposalItem => ({
  id: 'i',
  text: '',
  ruleId: 'cut.x',
  state: 'proposed',
  ...p,
});

describe('totals', () => {
  it('المفاتيح الأربعة حاضرة دائماً؛ المحظور والمستثنى لا يُحتسبان', () => {
    const items = [
      item({ startUs: 0, endUs: 1_000_000, reason: 'silence' }),
      item({ startUs: 2_000_000, endUs: 2_500_000, reason: 'filler' }),
      item({ startUs: 3_000_000, endUs: 3_200_000, reason: 'filler', state: 'applied' }),
      item({ startUs: 4_000_000, endUs: 9_000_000, reason: 'repeat', state: 'blocked', blockedBy: 'cut.minClipUs' }),
      item({ startUs: 9_500_000, endUs: 9_900_000, reason: 'abandoned', state: 'excluded' }),
    ];
    expect(computeTotals(items)).toEqual({
      byReason: { silence: 1, repeat: 0, abandoned: 0, filler: 2 },
      savedUs: 1_700_000,
    });
  });

  it('بلا بنود → أصفار', () => {
    expect(computeTotals([])).toEqual({ byReason: { silence: 0, repeat: 0, abandoned: 0, filler: 0 }, savedUs: 0 });
  });
});
