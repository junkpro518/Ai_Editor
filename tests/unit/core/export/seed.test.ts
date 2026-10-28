import { describe, it, expect } from 'vitest';
import { mulberry32, seededIndices } from '../../../../src/core/export/seed';

// الفهارس المبذورة لفحص التطابق (FR-014): 20 نقطة ثابتة لكل مشروع من seed المشروع.
describe('seededIndices', () => {
  it('حتمية: نفس البذرة → نفس الفهارس، مرتبة وفريدة وداخل [0, n)', () => {
    const a = seededIndices(42, 150);
    const b = seededIndices(42, 150);
    expect(a).toEqual(b);
    expect(a).toHaveLength(20);
    expect(new Set(a).size).toBe(20);
    expect([...a].sort((x, y) => x - y)).toEqual(a);
    for (const i of a) expect(i >= 0 && i < 150 && Number.isInteger(i)).toBe(true);
  });

  it('بذرة مختلفة → فهارس مختلفة', () => {
    expect(seededIndices(1, 150)).not.toEqual(seededIndices(2, 150));
  });

  it('مقطع أقصر من العدد المطلوب → كل الإطارات', () => {
    expect(seededIndices(7, 5)).toEqual([0, 1, 2, 3, 4]);
    expect(seededIndices(7, 0)).toEqual([]);
  });

  it('mulberry32 يعطي أعداداً في [0,1) ومتسلسلة حتمياً', () => {
    const r1 = mulberry32(123);
    const r2 = mulberry32(123);
    for (let i = 0; i < 100; i++) {
      const x = r1();
      expect(x).toBe(r2());
      expect(x >= 0 && x < 1).toBe(true);
    }
  });
});
