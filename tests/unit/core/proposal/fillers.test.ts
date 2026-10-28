import { describe, it, expect } from 'vitest';
import { detectFillers } from '../../../../src/core/proposal/fillers';
import { readCutRules } from '../../../../src/core/proposal/types';
import { makeStyle, makeTranscript } from '../../../helpers/project';

const rules = readCutRules(makeStyle()); // fillerWords: يعني، اه، آه، امم ...

describe('fillers', () => {
  it('كلمة حشو كاملة فقط؛ الجزئية لا تُحسب', () => {
    const t = makeTranscript([
      ['يعني', 0, 300_000],
      ['يعنيها', 300_000, 700_000],
      ['كذا', 700_000, 1_000_000],
    ]);
    expect(detectFillers(t.words, rules)).toEqual([
      { startUs: 0, endUs: 300_000, text: 'يعني', reason: 'filler', ruleId: 'cut.fillerWords' },
    ]);
  });

  it('المقارنة بعد التطبيع (آه = اه، يعنى = يعني مع تشكيل)', () => {
    const t = makeTranscript([
      ['كذا', 0, 300_000],
      ['آه', 400_000, 600_000],
      ['كذا', 600_000, 900_000],
      ['يَعْنِي', 900_000, 1_200_000],
    ]);
    expect(detectFillers(t.words, rules).map((c) => [c.startUs, c.endUs])).toEqual([
      [400_000, 600_000],
      [900_000, 1_200_000],
    ]);
  });

  it('كلمات حشو متجاورة تُدمج في بند واحد', () => {
    const t = makeTranscript([
      ['كذا', 0, 300_000],
      ['اه', 300_000, 500_000],
      ['يعني', 550_000, 800_000],
      ['كذا', 800_000, 1_100_000],
    ]);
    expect(detectFillers(t.words, rules)).toEqual([
      { startUs: 300_000, endUs: 800_000, text: 'اه يعني', reason: 'filler', ruleId: 'cut.fillerWords' },
    ]);
  });

  it('قائمة فارغة → لا شيء', () => {
    const t = makeTranscript([['يعني', 0, 300_000]]);
    expect(detectFillers(t.words, { ...rules, fillerWords: [] })).toEqual([]);
  });
});
