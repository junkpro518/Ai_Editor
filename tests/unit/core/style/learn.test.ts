import { describe, expect, it } from 'vitest';
import { buildStyleUpdateProposal, MAX_PRECEDENT_QUOTE } from '../../../../src/core/style/learn';
import type { Correction, Precedent, ProjectDocument, Proposal, Reason, StyleVersion } from '../../../../src/core/contracts/types';
import { makeProject, makeStyle, FIXED_NOW } from '../../../helpers/project';

// T069 — التعلّم من التصحيحات (FR-011، SC-007): ≥ العتبة استثناءات بالسبب نفسه → StyleUpdateProposal
// بـtrigger.correctionIds وdiff وnewPrecedents (rule + quote + check + source)؛ الأقل من العتبة يُحتسب لاحقاً
// في المقترحات التالية لنفس المشروع؛ التصحيح المستهلك في اقتراح سابق لا يُعاد عدّه.

function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o as object)) deepFreeze(v);
  }
  return o;
}

const RULE: Record<Reason, string> = { silence: 'cut.silenceMaxUs', filler: 'cut.fillerWords', repeat: 'cut.repeatsSimilarity', abandoned: 'cut.abandoned' };
type Item = Proposal['items'][number];

const item = (id: string, startUs: number, endUs: number, reason: Reason, text = ''): Item => ({ id, startUs, endUs, text, reason, ruleId: RULE[reason], state: 'excluded' });
const proposal = (id: string, items: Item[]): Proposal => ({
  id,
  createdAt: FIXED_NOW,
  styleRef: { styleId: 'default', version: 1 },
  items,
  totals: { byReason: { silence: 0, repeat: 0, abandoned: 0, filler: 0 }, savedUs: 0 },
  state: 'applied',
  localOnly: true,
});
const exclusion = (id: string, proposalId: string, i: Item): Correction => ({
  id,
  at: FIXED_NOW,
  actor: 'user',
  kind: 'exclude_item',
  proposalId,
  itemId: i.id,
  ruleId: i.ruleId,
  reason: i.reason,
  quote: i.text || 'صمت',
});

/** مشروع بمقترح واحد كل بنوده مستثناة وتصحيح لكل بند (c1..cn) */
function project(items: Item[], extra: Partial<ProjectDocument> = {}): ProjectDocument {
  return deepFreeze(
    makeProject({
      proposals: [proposal('prop-1', items)],
      corrections: items.map((i, k) => exclusion(`c${k + 1}`, 'prop-1', i)),
      ...extra,
    }),
  );
}
function ctx() {
  let n = 0;
  return { now: () => FIXED_NOW, newId: () => `id-${++n}` };
}
const precedents = (p: { newPrecedents: unknown[] }) => p.newPrecedents as Precedent[];

describe('buildStyleUpdateProposal', () => {
  it('حشو ×3 → اقتراح pending: الزناد بالتصحيحات الثلاثة، diff يحذف الكلمات (بالتطبيع) من قائمة الحشو، وسابقة لكل تصحيح', () => {
    const p = project([
      item('i1', 500_000, 700_000, 'filler', 'يعني'),
      item('i2', 1_500_000, 1_700_000, 'filler', 'اه'),
      item('i3', 2_500_000, 2_700_000, 'filler', 'يعني'),
    ]);
    const style = deepFreeze(makeStyle());
    const sup = buildStyleUpdateProposal(p, style, ctx());
    expect(sup).not.toBeNull();
    expect(sup).toMatchObject({
      id: 'id-1',
      createdAt: FIXED_NOW,
      styleRef: { styleId: 'default', version: 1 },
      trigger: { kind: 'repeated_rejection', reason: 'filler', count: 3, correctionIds: ['c1', 'c2', 'c3'] },
      state: 'pending',
    });
    // «يعني» تطبيعها يطابق «يعنى» أيضاً، و«اه» تطابق «آه»؛ المدخلات الأصلية تبقى بصيغتها
    expect(sup!.diff).toEqual([
      { path: 'cut.fillerWords', from: style.cut.fillerWords.value, to: ['امم', 'أمم', 'اممم', 'ايه', 'إيه'] },
    ]);
    const ps = precedents(sup!);
    expect(ps).toHaveLength(3);
    expect(ps.map((x) => x.quote)).toEqual(['يعني', 'اه', 'يعني']);
    for (const [k, x] of ps.entries()) {
      expect(x.id).toBe(`id-${k + 2}`);
      expect(x.ruleId).toBe('cut.fillerWords');
      expect(x.source).toEqual({ kind: 'learned', ref: `c${k + 1}`, at: FIXED_NOW });
      expect(x.addedInVersion).toBe(2);
      expect(x.rule).toContain(x.quote);
      expect(x.rule.length).toBeGreaterThan(x.quote.length);
      expect(x.check.endsWith('؟')).toBe(true);
    }
  });

  it('أقل من العتبة → null؛ وتُحتسب التصحيحات الأقدم مع مقترح لاحق لنفس المشروع (FR-011)', () => {
    const two = [item('i1', 500_000, 700_000, 'filler', 'يعني'), item('i2', 1_500_000, 1_700_000, 'filler', 'يعني')];
    const p2 = project(two);
    expect(buildStyleUpdateProposal(p2, makeStyle(), ctx())).toBeNull();

    const third = item('j1', 3_000_000, 3_200_000, 'filler', 'يعني');
    const p3 = deepFreeze(
      makeProject({
        proposals: [proposal('prop-1', two), proposal('prop-2', [third])],
        corrections: [...two.map((i, k) => exclusion(`c${k + 1}`, 'prop-1', i)), exclusion('c3', 'prop-2', third)],
      }),
    );
    const sup = buildStyleUpdateProposal(p3, makeStyle(), ctx());
    expect(sup?.trigger).toEqual({ kind: 'repeated_rejection', reason: 'filler', count: 3, correctionIds: ['c1', 'c2', 'c3'] });
  });

  it('التصحيح الذي دخل في اقتراح سابق (بأي حالة) لا يُعاد عدّه', () => {
    const items = [item('i1', 500_000, 700_000, 'filler', 'يعني'), item('i2', 1_500_000, 1_700_000, 'filler', 'يعني'), item('i3', 2_500_000, 2_700_000, 'filler', 'يعني')];
    const consumed = project(items, {
      styleUpdateProposals: [
        { id: 'sup-0', createdAt: FIXED_NOW, styleRef: { styleId: 'default', version: 1 }, trigger: { kind: 'repeated_rejection', reason: 'filler', count: 3, correctionIds: ['c1', 'c2', 'c3'] }, diff: [], newPrecedents: [], state: 'rejected', decidedAt: FIXED_NOW },
      ],
    });
    expect(buildStyleUpdateProposal(consumed, makeStyle(), ctx())).toBeNull();
  });

  // القرار 32: الاقتراح الملغى (superseded) لا يستهلك تصحيحاته؛ المعلّق والمحسوم يستهلكانها (لا اقتراح مكرر)
  it('تصحيحات اقتراح superseded تُعدّ من جديد، والمعلّق يستهلكها', () => {
    const items = [item('i1', 500_000, 700_000, 'filler', 'يعني'), item('i2', 1_500_000, 1_700_000, 'filler', 'يعني'), item('i3', 2_500_000, 2_700_000, 'filler', 'يعني')];
    const prior = (state: 'superseded' | 'pending') => ({
      id: 'sup-0', createdAt: FIXED_NOW, styleRef: { styleId: 'default', version: 1 },
      trigger: { kind: 'repeated_rejection' as const, reason: 'filler' as const, count: 3, correctionIds: ['c1', 'c2', 'c3'] },
      diff: [], newPrecedents: [], state, ...(state === 'superseded' ? { decidedAt: FIXED_NOW } : {}),
    });
    const again = buildStyleUpdateProposal(project(items, { styleUpdateProposals: [prior('superseded')] }), makeStyle(), ctx());
    expect(again?.trigger.correctionIds).toEqual(['c1', 'c2', 'c3']);
    expect(buildStyleUpdateProposal(project(items, { styleUpdateProposals: [prior('pending')] }), makeStyle(), ctx())).toBeNull();
  });

  // مراجعة US3: اقتباس repeat/abandoned جملة كاملة من نص المزود (حتى 100k كلمة × 256 حرفاً بلا ترقيم) يُنسخ في كل إصدار نمط لاحق
  it('اقتباس السابقة يُقصّ إلى MAX_PRECEDENT_QUOTE حرفاً بعلامة «…» (والتصحيح نفسه في المشروع يبقى كاملاً)', () => {
    const long = 'كلمة '.repeat(5000).trim();
    const items = [item('i1', 500_000, 700_000, 'repeat', long), item('i2', 1_500_000, 1_700_000, 'repeat', long), item('i3', 2_500_000, 2_700_000, 'repeat', 'قصيرة')];
    const p = project(items);
    const sup = buildStyleUpdateProposal(p, makeStyle(), ctx())!;
    const [a, , c] = precedents(sup);
    expect(a!.quote.length).toBe(MAX_PRECEDENT_QUOTE);
    expect(a!.quote.endsWith('…')).toBe(true);
    expect(a!.rule.length).toBeLessThan(MAX_PRECEDENT_QUOTE + 200);
    expect(c!.quote).toBe('قصيرة');
    expect(p.corrections[0]!.quote).toBe(long);
  });

  it('صمت: يرفع silenceMaxUs إلى أطول صمت مستثنى + هامشا الحماية + 100ms؛ وإن كانت العتبة أعلى أصلاً فلا diff لكن السوابق تبقى', () => {
    const p = project([
      item('i1', 1_000_000, 1_900_000, 'silence'), // 0.9s
      item('i2', 3_000_000, 4_200_000, 'silence'), // 1.2s
      item('i3', 5_000_000, 6_000_000, 'silence'), // 1.0s
    ]);
    const style = makeStyle(); // silenceMaxUs 700000، protect 120000
    const sup = buildStyleUpdateProposal(p, style, ctx())!;
    expect(sup.diff).toEqual([{ path: 'cut.silenceMaxUs', from: 700_000, to: 1_200_000 + 2 * 120_000 + 100_000 }]);
    expect(precedents(sup).map((x) => x.quote)).toEqual(['صمت', 'صمت', 'صمت']);
    expect(precedents(sup)[0]!.ruleId).toBe('cut.silenceMaxUs');

    const high: StyleVersion = { ...style, cut: { ...style.cut, silenceMaxUs: { ...style.cut.silenceMaxUs, value: 2_000_000 } } };
    const none = buildStyleUpdateProposal(p, high, ctx())!;
    expect(none.diff).toEqual([]);
    expect(none.newPrecedents).toHaveLength(3);
  });

  it('إعادة: يرفع repeatsSimilarity بـ0.05 (بلا ذيل عشري) وبسقف 0.99', () => {
    const p = project([
      item('i1', 1_000_000, 1_900_000, 'repeat', 'اليوم بنتكلم'),
      item('i2', 3_000_000, 4_200_000, 'repeat', 'عن الدرس'),
      item('i3', 5_000_000, 6_000_000, 'repeat', 'الثاني'),
    ]);
    const style = makeStyle();
    expect(buildStyleUpdateProposal(p, style, ctx())!.diff).toEqual([{ path: 'cut.repeatsSimilarity', from: 0.8, to: 0.85 }]);
    const near: StyleVersion = { ...style, cut: { ...style.cut, repeatsSimilarity: { ...style.cut.repeatsSimilarity, value: 0.97 } } };
    expect(buildStyleUpdateProposal(p, near, ctx())!.diff).toEqual([{ path: 'cut.repeatsSimilarity', from: 0.97, to: 0.99 }]);
  });

  it('جملة متروكة: لا قاعدة مخصصة → diff فارغ وسوابق فقط', () => {
    const p = project([
      item('i1', 1_000_000, 1_900_000, 'abandoned', 'اليوم بن'),
      item('i2', 3_000_000, 4_200_000, 'abandoned', 'طيب خل'),
      item('i3', 5_000_000, 6_000_000, 'abandoned', 'وبعدين'),
    ]);
    const sup = buildStyleUpdateProposal(p, makeStyle(), ctx())!;
    expect(sup.diff).toEqual([]);
    expect(sup.trigger.reason).toBe('abandoned');
    expect(precedents(sup).map((x) => x.quote)).toEqual(['اليوم بن', 'طيب خل', 'وبعدين']);
  });

  it('عدة أسباب فوق العتبة → الأكبر عدداً؛ والعتبة تُقرأ من النمط', () => {
    const p = project([
      item('i1', 500_000, 700_000, 'filler', 'يعني'),
      item('i2', 1_500_000, 1_700_000, 'filler', 'يعني'),
      item('i3', 2_500_000, 2_700_000, 'filler', 'يعني'),
      item('s1', 3_000_000, 3_900_000, 'silence'),
      item('s2', 4_000_000, 4_900_000, 'silence'),
      item('s3', 5_000_000, 5_900_000, 'silence'),
      item('s4', 6_000_000, 6_900_000, 'silence'),
    ]);
    expect(buildStyleUpdateProposal(p, makeStyle(), ctx())!.trigger).toMatchObject({ reason: 'silence', count: 4 });

    const style = makeStyle();
    const two: StyleVersion = { ...style, cut: { ...style.cut, repeatedRejectionThreshold: { ...style.cut.repeatedRejectionThreshold, value: 2 } } };
    const p2 = project([item('i1', 500_000, 700_000, 'filler', 'يعني'), item('i2', 1_500_000, 1_700_000, 'filler', 'يعني')]);
    expect(buildStyleUpdateProposal(p2, two, ctx())?.trigger.count).toBe(2);
  });
});
