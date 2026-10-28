import { describe, expect, it } from 'vitest';
import { applyField, createVersion, rollbackContent } from '../../../../src/core/style/library';
import { validateStyle } from '../../../../src/core/contracts/validate';
import type { Precedent } from '../../../../src/core/contracts/types';
import { makeStyle, FIXED_NOW } from '../../../helpers/project';

// T067 — إصدارات النمط ملفات غير قابلة للتعديل: كل حفظ إصدار جديد مرقّم بتاريخ وسبب ونسب (basedOn)،
// والرجوع إصدار جديد بمحتوى قديم. التراجع لا يحذف إصداراً (data-model §1.9) — هذا شأن runtime لا core.

function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o as object)) deepFreeze(v);
  }
  return o;
}
const codeOf = (fn: () => unknown): string => {
  try {
    fn();
  } catch (e) {
    return (e as { code: string }).code;
  }
  return 'no_error';
};
const LATER = '2026-11-01T10:00:00.000Z';
const userSource = { kind: 'user' as const, at: LATER };

describe('createVersion', () => {
  it('إصدار جديد = الأساس + 1، بتاريخ وسبب ونسب، والأساس لا يُمسّ', () => {
    const base = deepFreeze(makeStyle());
    const next = createVersion(
      base,
      { cut: { silenceMaxUs: { value: 1_000_000, mode: 'preference', source: userSource } } },
      { reason: 'user', now: LATER },
    );
    expect(() => validateStyle(next)).not.toThrow();
    expect(next.version).toBe(2);
    expect(next.date).toBe(LATER);
    expect(next.reason).toBe('user');
    expect(next.basedOn).toEqual({ styleId: 'default', version: 1 });
    expect(next.basedOnCorrections).toBeUndefined();
    expect(next.cut.silenceMaxUs.value).toBe(1_000_000);
    // بقية الحقول تُنسخ كما هي
    expect(next.cut.minClipUs).toEqual(base.cut.minClipUs);
    expect(next.captions).toEqual(base.captions);
    expect(next.styleGuide).toBe(base.styleGuide);
    expect(base.version).toBe(1);
    expect(base.cut.silenceMaxUs.value).toBe(700_000);
  });

  it('السوابق تُلحق في الآخر ولا يُعاد ترقيمها؛ basedOnCorrections يُحفظ', () => {
    const base = makeStyle();
    const p1: Precedent = { id: 'p-1', ruleId: 'cut.fillerWords', rule: 'قاعدة', quote: 'يعني', check: 'سؤال', source: { kind: 'learned', ref: 'c-1', at: LATER }, addedInVersion: 2 };
    const v2 = createVersion(base, { precedents: [p1] }, { reason: 'learned', now: LATER, basedOnCorrections: ['c-1'] });
    const p2: Precedent = { ...p1, id: 'p-2', quote: 'اه', addedInVersion: 3 };
    const v3 = createVersion(v2, { precedents: [p2] }, { reason: 'learned', now: LATER, basedOnCorrections: ['c-2'] });
    expect(v2.basedOnCorrections).toEqual(['c-1']);
    expect(v3.precedents.map((p) => p.id)).toEqual(['p-1', 'p-2']);
    expect(v3.version).toBe(3);
    expect(v3.basedOn).toEqual({ styleId: 'default', version: 2 });
  });

  it('المكتبة قد تحوي إصداراً أحدث من المثبّت: الرقم الجديد = max(الأساس، الأحدث) + 1', () => {
    const base = makeStyle(); // v1 مثبّت، والمكتبة فيها v4
    const next = createVersion(base, {}, { reason: 'user', now: LATER, latestVersion: 4 });
    expect(next.version).toBe(5);
    expect(next.basedOn).toEqual({ styleId: 'default', version: 1 });
  });

  it('رقعة تخالف المخطط → خطأ عقد (لا إصدار نصف صالح)', () => {
    const base = makeStyle();
    expect(() =>
      createVersion(base, { cut: { silenceMaxUs: { value: 1, mode: 'sometimes' as unknown as 'preference', source: userSource } } }, { reason: 'user', now: LATER }),
    ).toThrow();
  });
});

describe('applyField', () => {
  it('يبدّل قيمة حقل بمساره ويضع المصدر؛ الوضع يبقى إن لم يُحدَّد ويتغير إن حُدِّد', () => {
    const base = deepFreeze(makeStyle());
    const a = applyField(base, 'cut.silenceMaxUs', 900_000, undefined, userSource);
    expect(a.cut.silenceMaxUs).toEqual({ value: 900_000, mode: 'preference', source: userSource, note: base.cut.silenceMaxUs.note });
    const b = applyField(base, 'captions.position', 'top', 'mandatory', userSource);
    expect(b.captions.position).toEqual({ value: 'top', mode: 'mandatory', source: userSource });
    expect(a.version).toBe(base.version); // applyField لا يرقّم؛ createVersion يفعل
    expect(base.cut.silenceMaxUs.value).toBe(700_000);
  });

  it('حقل غير معروف → unknown_style_field؛ قيمة من نوع خاطئ → invalid_style_rule', () => {
    const base = makeStyle();
    expect(codeOf(() => applyField(base, 'cut.nope', 1, undefined, userSource))).toBe('unknown_style_field');
    expect(codeOf(() => applyField(base, 'cut.toString', 1, undefined, userSource))).toBe('unknown_style_field');
    expect(codeOf(() => applyField(base, 'captions.__proto__', 1, undefined, userSource))).toBe('unknown_style_field');
    expect(codeOf(() => applyField(base, 'cut.silenceMaxUs', 'كثير', undefined, userSource))).toBe('invalid_style_rule');
    expect(codeOf(() => applyField(base, 'cut.silenceMaxUs', Number.NaN, undefined, userSource))).toBe('invalid_style_rule');
    expect(codeOf(() => applyField(base, 'cut.fillerWords', ['يعني', 5], undefined, userSource))).toBe('invalid_style_rule');
    expect(codeOf(() => applyField(base, 'captions.position', 'left', undefined, userSource))).toBe('invalid_style_rule');
    expect(codeOf(() => applyField(base, 'captions.wordsPerChunk', { min: 3 }, undefined, userSource))).toBe('invalid_style_rule');
    expect(codeOf(() => applyField(base, 'captions.flagLowConfidence', 'yes', undefined, userSource))).toBe('invalid_style_rule');
    expect(codeOf(() => applyField(base, 'cut.repeatedRejectionThreshold', 1, undefined, userSource))).toBe('invalid_style_rule');
    expect(codeOf(() => applyField(base, 'cut.repeatedRejectionThreshold', 2.5, undefined, userSource))).toBe('invalid_style_rule');
    expect(codeOf(() => applyField(base, 'cut.repeatedRejectionThreshold', 2, undefined, userSource))).toBe('no_error');
    expect(codeOf(() => applyField(base, 'captions.flagLowConfidence', false, undefined, userSource))).toBe('no_error');
  });
});

describe('rollbackContent', () => {
  it('إصدار جديد بمحتوى إصدار قديم: الرقم بعد الحالي، السبب rollback to vN، النسب إلى الهدف', () => {
    const v1 = deepFreeze(makeStyle());
    const v2 = createVersion(v1, { cut: { silenceMaxUs: { value: 1_000_000, mode: 'preference', source: userSource } } }, { reason: 'user', now: LATER });
    const v3 = rollbackContent(v1, v2.version, '2026-11-02T00:00:00.000Z');
    expect(() => validateStyle(v3)).not.toThrow();
    expect(v3.version).toBe(3);
    expect(v3.reason).toBe('rollback to v1');
    expect(v3.date).toBe('2026-11-02T00:00:00.000Z');
    expect(v3.basedOn).toEqual({ styleId: 'default', version: 1 });
    expect(v3.cut).toEqual(v1.cut);
    expect(v3.captions).toEqual(v1.captions);
    expect(v3.precedents).toEqual(v1.precedents);
    expect(v3.styleGuide).toBe(v1.styleGuide);
    expect(v3.basedOnCorrections).toBeUndefined();
    expect(v1.date).toBe(FIXED_NOW);
  });
});
