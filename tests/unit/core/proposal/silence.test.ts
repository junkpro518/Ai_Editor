import { describe, it, expect } from 'vitest';
import { detectSilence } from '../../../../src/core/proposal/silence';
import { readCutRules } from '../../../../src/core/proposal/types';
import { makeStyle, makeTranscript } from '../../../helpers/project';

const rules = readCutRules(makeStyle()); // silenceMaxUs 700000، protect 120000

describe('silence', () => {
  it('فجوة أطول من silenceMaxUs بين كلمتين → بند محمي الحواف بنص فارغ', () => {
    const t = makeTranscript([
      ['اهلا', 0, 1_000_000],
      ['وسهلا', 2_000_000, 3_000_000],
    ]);
    expect(detectSilence(t.words, 3_000_000, rules)).toEqual([
      { startUs: 1_120_000, endUs: 1_880_000, text: '', reason: 'silence', ruleId: 'cut.silenceMaxUs' },
    ]);
  });

  it('فجوة تساوي العتبة لا تُقترح؛ أكبر منها بميكروثانية تُقترح', () => {
    const eq = makeTranscript([
      ['ا', 0, 1_000_000],
      ['ب', 1_700_000, 2_000_000],
    ]);
    expect(detectSilence(eq.words, 2_000_000, rules)).toEqual([]);
    const gt = makeTranscript([
      ['ا', 0, 1_000_000],
      ['ب', 1_700_001, 2_000_000],
    ]);
    expect(detectSilence(gt.words, 2_000_000, rules)).toHaveLength(1);
  });

  it('بعد حماية الحواف يُهمل ما هو أقصر من 100ms', () => {
    const wide = { ...rules, protectSentenceEdgesUs: 350_000 };
    const t = makeTranscript([
      ['ا', 0, 1_000_000],
      ['ب', 1_750_000, 2_000_000], // 750ms − 700ms = 50ms فقط
    ]);
    expect(detectSilence(t.words, 2_000_000, wide)).toEqual([]);
  });

  it('صمت البداية من 0 وصمت النهاية حتى durationUs', () => {
    const t = makeTranscript([
      ['ا', 2_000_000, 3_000_000],
      ['ب', 3_100_000, 8_000_000],
    ]);
    expect(detectSilence(t.words, 10_000_000, rules)).toEqual([
      { startUs: 0, endUs: 1_880_000, text: '', reason: 'silence', ruleId: 'cut.silenceMaxUs' },
      { startUs: 8_120_000, endUs: 10_000_000, text: '', reason: 'silence', ruleId: 'cut.silenceMaxUs' },
    ]);
  });

  it('بداية/نهاية ضمن العتبة لا تُقترح', () => {
    const t = makeTranscript([['ا', 500_000, 1_000_000]]);
    expect(detectSilence(t.words, 1_600_000, rules)).toEqual([]);
  });

  it('بلا كلمات → لا بنود (ملف موسيقى فقط)', () => {
    expect(detectSilence([], 10_000_000, rules)).toEqual([]);
  });
});
