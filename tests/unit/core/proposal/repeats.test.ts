import { describe, it, expect } from 'vitest';
import { detectRepeats, jaccard, sentencesOf } from '../../../../src/core/proposal/repeats';
import { readCutRules } from '../../../../src/core/proposal/types';
import { makeStyle, makeTranscript } from '../../../helpers/project';

const rules = readCutRules(makeStyle()); // repeatsSimilarity 0.8

describe('sentencesOf', () => {
  it('يستخدم segments إن وُجدت', () => {
    const t = makeTranscript(
      [
        ['اليوم', 0, 300_000],
        ['بنتكلم', 300_000, 700_000],
        ['عن', 800_000, 900_000],
        ['المونتاج', 900_000, 1_400_000],
      ],
      { segments: [[0, 1], [2, 3]] },
    );
    const s = sentencesOf(t, rules);
    expect(s.map((x) => x.text)).toEqual(['اليوم بنتكلم', 'عن المونتاج']);
    expect(s[0]).toMatchObject({ startUs: 0, endUs: 700_000, tokens: ['اليوم', 'بنتكلم'] });
  });

  it('بلا segments: يقسم عند فجوة ≥ silenceMaxUs أو علامة ترقيم ختامية', () => {
    const t = makeTranscript([
      ['اهلا', 0, 300_000],
      ['بكم.', 300_000, 700_000],
      ['اليوم', 750_000, 1_000_000],
      ['بنتكلم', 1_000_000, 1_400_000],
      ['عن', 2_100_000, 2_300_000], // فجوة 700ms
      ['المونتاج', 2_300_000, 2_800_000],
    ]);
    expect(sentencesOf(t, rules).map((x) => x.text)).toEqual(['اهلا بكم.', 'اليوم بنتكلم', 'عن المونتاج']);
  });
});

describe('jaccard', () => {
  it('على مجموعات الكلمات', () => {
    expect(jaccard(['ا', 'ب'], ['ا', 'ب'])).toBe(1);
    expect(jaccard(['ا'], ['ب'])).toBe(0);
    expect(jaccard([], [])).toBe(0);
    expect(jaccard(['ا', 'ب', 'ج', 'د'], ['ا', 'ب', 'ج', 'د', 'ه'])).toBe(0.8);
  });
});

describe('repeats', () => {
  const pair = makeTranscript(
    [
      ['اليوم', 0, 300_000],
      ['بنتكلم', 300_000, 700_000],
      ['عن', 700_000, 800_000],
      ['المونتاج', 800_000, 1_300_000],
      ['اليوم', 1_600_000, 1_900_000],
      ['بنتكلم', 1_900_000, 2_300_000],
      ['عن', 2_300_000, 2_400_000],
      ['المونتاج', 2_400_000, 2_900_000],
      ['الذكي', 2_900_000, 3_300_000],
    ],
    { segments: [[0, 1, 2, 3], [4, 5, 6, 7, 8]] },
  );

  it('جملتان متتاليتان بتشابه ≥ العتبة → حذف الأولى بنصها', () => {
    expect(detectRepeats(sentencesOf(pair, rules), rules)).toEqual([
      { startUs: 0, endUs: 1_300_000, text: 'اليوم بنتكلم عن المونتاج', reason: 'repeat', ruleId: 'cut.repeatsSimilarity' },
    ]);
  });

  it('التطبيع يوحّد الهمزات والتشكيل والتاء المربوطة', () => {
    const t = makeTranscript(
      [
        ['أَحمد', 0, 300_000],
        ['راح', 300_000, 600_000],
        ['المدرسة', 600_000, 1_000_000],
        ['احمد', 1_200_000, 1_500_000],
        ['راح', 1_500_000, 1_800_000],
        ['المدرسه', 1_800_000, 2_200_000],
      ],
      { segments: [[0, 1, 2], [3, 4, 5]] },
    );
    expect(detectRepeats(sentencesOf(t, rules), rules)).toHaveLength(1);
  });

  it('غير متتاليتين أو أقل من العتبة → لا شيء؛ repeatsEnabled=false يعطّل', () => {
    const far = makeTranscript(
      [
        ['اليوم', 0, 300_000],
        ['بنتكلم', 300_000, 700_000],
        ['شي', 900_000, 1_100_000],
        ['ثاني', 1_100_000, 1_400_000],
        ['تماماً', 1_400_000, 1_800_000],
        ['اليوم', 2_000_000, 2_300_000],
        ['بنتكلم', 2_300_000, 2_700_000],
      ],
      { segments: [[0, 1], [2, 3, 4], [5, 6]] },
    );
    expect(detectRepeats(sentencesOf(far, rules), rules)).toEqual([]);
    expect(detectRepeats(sentencesOf(pair, rules), { ...rules, repeatsEnabled: false })).toEqual([]);
    expect(detectRepeats(sentencesOf(pair, rules), { ...rules, repeatsSimilarity: 0.9 })).toEqual([]);
  });
});
