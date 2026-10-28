import { describe, it, expect } from 'vitest';
import { generateProposal, mergeCandidates } from '../../../../src/core/proposal/generate';
import type { Candidate } from '../../../../src/core/proposal/types';
import { readCutRules } from '../../../../src/core/proposal/types';
import type { StyleVersion } from '../../../../src/core/contracts/types';
import { makeCtx, makeStyle, makeTranscript, FIXED_NOW } from '../../../helpers/project';

const style = makeStyle();
const ctx = () => {
  const c = makeCtx();
  return { now: c.now, newId: c.newId };
};
const withMode = (s: StyleVersion, key: keyof StyleVersion['cut'], mode: 'mandatory' | 'preference'): StyleVersion => ({
  ...s,
  cut: { ...s.cut, [key]: { ...s.cut[key], mode } },
});

describe('mergeCandidates', () => {
  const c = (startUs: number, endUs: number, reason: Candidate['reason'], text = ''): Candidate => ({
    startUs,
    endUs,
    text,
    reason,
    ruleId: `cut.${reason}`,
  });

  it('المتداخلة تُدمج باتحاد المدى وسبب الأولوية الأعلى (repeat > abandoned > filler > silence)', () => {
    const merged = mergeCandidates([
      c(1_000_000, 2_000_000, 'silence'),
      c(0, 1_500_000, 'filler', 'اه'),
      c(1_800_000, 3_000_000, 'repeat', 'جملة'),
      c(5_000_000, 6_000_000, 'abandoned', 'قصير'),
      c(6_000_000, 7_000_000, 'silence'), // متلامس لا متداخل → يبقى
    ]);
    expect(merged).toEqual([
      { startUs: 0, endUs: 3_000_000, text: 'جملة', reason: 'repeat', ruleId: 'cut.repeat' },
      c(5_000_000, 6_000_000, 'abandoned', 'قصير'),
      c(6_000_000, 7_000_000, 'silence'),
    ]);
  });
});

describe('generateProposal', () => {
  const transcript = makeTranscript([
    ['اليوم', 2_000_000, 2_300_000], // صمت بداية 2s
    ['بنتكلم', 2_300_000, 2_700_000],
    ['يعني', 2_750_000, 3_000_000], // حشو
    ['عن', 3_000_000, 3_100_000],
    ['المونتاج', 3_100_000, 3_600_000],
    ['اليوم', 5_000_000, 5_300_000], // صمت 1.4s
    ['بنتكلم', 5_300_000, 5_700_000],
    ['عن', 5_700_000, 5_800_000],
    ['المونتاج', 5_800_000, 6_300_000],
  ]);
  const source = { durationUs: 7_100_000 };

  it('يجمع الأسباب، يرتّب بالبداية، معرّفات من ctx، draft + localOnly + styleRef + totals', () => {
    const p = generateProposal(transcript, style, source, ctx());
    expect(p).toMatchObject({
      id: 'id-1',
      createdAt: FIXED_NOW,
      styleRef: { styleId: style.styleId, version: style.version },
      state: 'draft',
      localOnly: true,
    });
    expect(p.items.map((i) => [i.startUs, i.endUs, i.reason, i.state])).toEqual([
      [0, 1_880_000, 'silence', 'proposed'],
      // الجملة الأولى (الحشو داخلها يُبتلع)؛ الشظية 120ms قبلها وبعدها بلا كلام فلا تُحظر
      [2_000_000, 3_600_000, 'repeat', 'proposed'],
      [3_720_000, 4_880_000, 'silence', 'proposed'],
      [6_420_000, 7_100_000, 'silence', 'proposed'],
    ]);
    expect(p.items.map((i) => i.id)).toEqual(['id-2', 'id-3', 'id-4', 'id-5']);
    expect(p.items[1]?.text).toBe('اليوم بنتكلم يعني عن المونتاج');
    expect(p.totals).toEqual({ byReason: { silence: 3, repeat: 1, abandoned: 0, filler: 0 }, savedUs: 1_880_000 + 1_600_000 + 1_160_000 + 680_000 });
    for (const i of p.items) expect(i.startUs).toBeLessThan(i.endUs);
  });

  it('minClipUs إلزامي: البند الذي يترك لقطة كلام أقصر من الحد يُحظر بـblockedBy', () => {
    const t = makeTranscript([
      ['ا', 0, 1_000_000],
      ['ب', 2_000_000, 2_100_000], // كلمة 100ms بين صمتين
      ['ج', 3_300_000, 5_000_000],
    ]);
    const p = generateProposal(t, style, { durationUs: 5_000_000 }, ctx());
    expect(p.items.map((i) => [i.startUs, i.endUs, i.state, i.blockedBy])).toEqual([
      [1_120_000, 1_880_000, 'proposed', undefined],
      [2_220_000, 3_180_000, 'blocked', 'cut.minClipUs'], // الفجوة قبله 340ms فيها كلام < 500ms
    ]);
    expect(p.totals).toEqual({ byReason: { silence: 1, repeat: 0, abandoned: 0, filler: 0 }, savedUs: 760_000 });

    // تفضيل فقط → لا حظر
    const pref = generateProposal(t, withMode(style, 'minClipUs', 'preference'), { durationUs: 5_000_000 }, ctx());
    expect(pref.items.every((i) => i.state === 'proposed')).toBe(true);
  });

  it('minClipUs إلزامي: بند يترك ذيلاً أقصر من الحد في نهاية الملف يُحظر', () => {
    const t = makeTranscript([
      ['ا', 0, 4_400_000],
      ['يعني', 4_400_000, 4_700_000],
      ['ب', 4_700_000, 5_000_000], // ذيل كلام 300ms
    ]);
    const p = generateProposal(t, style, { durationUs: 5_000_000 }, ctx());
    expect(p.items.map((i) => [i.reason, i.state, i.blockedBy])).toEqual([['filler', 'blocked', 'cut.minClipUs']]);
  });

  it('يقصّ ما يتجاوز durationUs المصدر ويحذف ما يصير فارغاً', () => {
    const t = makeTranscript(
      [
        ['ا', 0, 1_000_000],
        ['ب', 2_000_000, 4_000_000],
        ['ج', 5_000_000, 6_000_000],
      ],
      { durationUs: 9_000_000 },
    );
    const p = generateProposal(t, style, { durationUs: 1_500_000 }, ctx());
    // الصمت الأول يُقصّ عند 1.5s؛ الصمت الثاني يبدأ بعد نهاية المصدر فيُحذف؛ لا صمت ختامي
    expect(p.items.map((i) => [i.startUs, i.endUs])).toEqual([[1_120_000, 1_500_000]]);
  });

  it('تفريغ بلا كلمات → مقترح فارغ بأصفار', () => {
    const p = generateProposal(makeTranscript([]), style, { durationUs: 60_000_000 }, ctx());
    expect(p.items).toEqual([]);
    expect(p.totals).toEqual({ byReason: { silence: 0, repeat: 0, abandoned: 0, filler: 0 }, savedUs: 0 });
  });

  it('لا يغيّر التفريغ أو النمط المدخلين', () => {
    const t = makeTranscript([
      ['ا', 0, 1_000_000],
      ['يعني', 2_000_000, 2_300_000],
    ]);
    const tCopy = structuredClone(t);
    const sCopy = structuredClone(style);
    generateProposal(t, style, { durationUs: 3_000_000 }, ctx());
    expect(t).toEqual(tCopy);
    expect(style).toEqual(sCopy);
  });
});

describe('readCutRules', () => {
  it('يقرأ القيم المكتوبة ويرفض نوعاً خاطئاً', () => {
    const r = readCutRules(style);
    expect(r).toMatchObject({ silenceMaxUs: 700_000, repeatsEnabled: true, repeatsSimilarity: 0.8, minClipUs: 500_000, protectSentenceEdgesUs: 120_000, repeatedRejectionThreshold: 3, minClipMandatory: true });
    expect(r.fillerWords).toContain('يعني');
    const bad = { ...style, cut: { ...style.cut, silenceMaxUs: { ...style.cut.silenceMaxUs, value: 'x' } } };
    expect(() => readCutRules(bad)).toThrow(/silenceMaxUs/);
  });
});
