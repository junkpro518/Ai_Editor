import { describe, it, expect } from 'vitest';
import { detectAbandoned } from '../../../../src/core/proposal/abandoned';
import { sentencesOf } from '../../../../src/core/proposal/repeats';
import { readCutRules } from '../../../../src/core/proposal/types';
import { makeStyle, makeTranscript } from '../../../helpers/project';

const rules = readCutRules(makeStyle()); // silenceMaxUs/2 = 350ms

describe('abandoned', () => {
  it('مقطع قصير (≤4 كلمات) + وقفة ≥ silenceMaxUs/2 + بداية مشابهة → حذف القصير', () => {
    const t = makeTranscript(
      [
        ['اليوم', 0, 300_000],
        ['بنتكلم', 300_000, 700_000],
        ['اليوم', 1_100_000, 1_400_000], // وقفة 400ms
        ['بنتكلم', 1_400_000, 1_800_000],
        ['عن', 1_800_000, 1_900_000],
        ['كذا', 1_900_000, 2_200_000],
        ['وكذا', 2_200_000, 2_500_000],
        ['وكذا', 2_500_000, 2_800_000],
      ],
      { segments: [[0, 1], [2, 3, 4, 5, 6, 7]] },
    );
    expect(detectAbandoned(sentencesOf(t, rules), rules)).toEqual([
      { startUs: 0, endUs: 700_000, text: 'اليوم بنتكلم', reason: 'abandoned', ruleId: 'cut.silenceMaxUs' },
    ]);
  });

  it('مقطع من كلمة واحدة يُقارن بكلمته الأولى فقط', () => {
    const t = makeTranscript(
      [
        ['طيب', 0, 300_000],
        ['طيب', 700_000, 1_000_000],
        ['اليوم', 1_000_000, 1_300_000],
        ['نبدأ', 1_300_000, 1_700_000],
      ],
      { segments: [[0], [1, 2, 3]] },
    );
    expect(detectAbandoned(sentencesOf(t, rules), rules)).toHaveLength(1);
  });

  it('وقفة قصيرة، أو مقطع طويل، أو بداية مختلفة → لا شيء', () => {
    const shortPause = makeTranscript(
      [
        ['اليوم', 0, 300_000],
        ['بنتكلم', 300_000, 700_000],
        ['اليوم', 1_000_000, 1_300_000], // 300ms < 350ms
        ['بنتكلم', 1_300_000, 1_700_000],
        ['عن', 1_700_000, 1_800_000],
      ],
      { segments: [[0, 1], [2, 3, 4]] },
    );
    expect(detectAbandoned(sentencesOf(shortPause, rules), rules)).toEqual([]);

    const long = makeTranscript(
      [
        ['اليوم', 0, 200_000],
        ['بنتكلم', 200_000, 400_000],
        ['عن', 400_000, 500_000],
        ['شي', 500_000, 700_000],
        ['مهم', 700_000, 900_000],
        ['اليوم', 1_400_000, 1_700_000],
        ['بنتكلم', 1_700_000, 2_100_000],
        ['عن', 2_100_000, 2_200_000],
      ],
      { segments: [[0, 1, 2, 3, 4], [5, 6, 7]] },
    );
    expect(detectAbandoned(sentencesOf(long, rules), rules)).toEqual([]);

    const different = makeTranscript(
      [
        ['اليوم', 0, 300_000],
        ['بنتكلم', 300_000, 700_000],
        ['امس', 1_100_000, 1_400_000],
        ['بنتكلم', 1_400_000, 1_800_000],
        ['عن', 1_800_000, 1_900_000],
      ],
      { segments: [[0, 1], [2, 3, 4]] },
    );
    expect(detectAbandoned(sentencesOf(different, rules), rules)).toEqual([]);
  });
});
