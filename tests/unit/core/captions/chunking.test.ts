import { describe, expect, it } from 'vitest';
import { chunkWords } from '../../../../src/core/captions/chunking';
import type { ChunkRules } from '../../../../src/core/captions/chunking';

// T054 — التقسيم إلى مجموعات (بحث B §4): 3–5 كلمات، كسر عند نهاية جملة أو وقفة ≥ breakAtPauseUs أو حد الكلمات.
const RULES: ChunkRules = { wordsPerChunk: { min: 3, max: 5 }, breakAtPauseUs: 150_000 };

/** كلمات متتالية كل 300ms مع فجوة 50ms (أقل من الوقفة) */
function words(texts: string[], startUs = 0, gapUs = 50_000): Array<{ id: string; text: string; startUs: number; endUs: number }> {
  let t = startUs;
  return texts.map((text, i) => {
    const w = { id: `w${i + 1}`, text, startUs: t, endUs: t + 250_000 };
    t += 250_000 + gapUs;
    return w;
  });
}

describe('chunkWords', () => {
  it('يكسر عند حد الكلمات الأقصى (5) ويترك الأخيرة أقصر من الحد الأدنى', () => {
    const ws = words(['١', '٢', '٣', '٤', '٥', '٦', '٧']);
    const chunks = chunkWords(ws, RULES);
    expect(chunks.map((c) => c.wordIds)).toEqual([
      ['w1', 'w2', 'w3', 'w4', 'w5'],
      ['w6', 'w7'],
    ]);
  });

  it('يكسر عند نهاية الجملة (. ! ? ؟ …) بعد بلوغ الحد الأدنى فقط', () => {
    const ws = words(['السلام', 'عليكم.', 'اليوم', 'نشرح', 'الدرس.', 'نبدأ', 'من', 'الأول؟', 'تمام']);
    const chunks = chunkWords(ws, RULES);
    // «عليكم.» تنهي جملة لكن المجموعة كلمتان فقط (< 3) فلا كسر؛ «الدرس.» تكسر عند 5؛ «الأول؟» تكسر عند 3
    expect(chunks.map((c) => c.wordIds)).toEqual([
      ['w1', 'w2', 'w3', 'w4', 'w5'],
      ['w6', 'w7', 'w8'],
      ['w9'],
    ]);
  });

  it('يكسر عند وقفة ≥ breakAtPauseUs بعد الحد الأدنى، ويمدّ نهاية المجموعة عبر الوقفات القصيرة فقط', () => {
    const ws = words(['أ', 'ب', 'ج', 'د', 'هـ', 'و']);
    // وقفة طويلة (900ms) بعد الكلمة الثالثة
    const shifted = ws.map((w, i) => (i >= 3 ? { ...w, startUs: w.startUs + 900_000, endUs: w.endUs + 900_000 } : w));
    const chunks = chunkWords(shifted, RULES);
    expect(chunks.map((c) => c.wordIds)).toEqual([
      ['w1', 'w2', 'w3'],
      ['w4', 'w5', 'w6'],
    ]);
    // الأولى تغلق عند نهاية آخر كلمة فيها (الفجوة ≥ الوقفة لا تُمدّ)
    expect(chunks[0]).toMatchObject({ startUs: shifted[0]!.startUs, endUs: shifted[2]!.endUs });
    // مجموعة تليها مجموعة بفجوة قصيرة تُمدّ حتى بداية التالية (تبقى على الشاشة)
    const seven = words(['١', '٢', '٣', '٤', '٥', '٦', '٧']);
    const c2 = chunkWords(seven, RULES);
    expect(c2[0]!.endUs).toBe(seven[5]!.startUs);
    expect(c2[1]!.endUs).toBe(seven[6]!.endUs);
  });

  it('مجموعة واحدة في وقت واحد: لا تداخل، وكل مجموعة تفتح عند أول كلمة وتغلق عند/بعد آخرها', () => {
    const ws = words(['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '١٠', '١١'], 100_000, 120_000);
    const chunks = chunkWords(ws, RULES);
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i]!;
      const first = ws.find((w) => w.id === c.wordIds[0])!;
      const last = ws.find((w) => w.id === c.wordIds[c.wordIds.length - 1])!;
      expect(c.startUs).toBe(first.startUs);
      expect(c.endUs).toBeGreaterThanOrEqual(last.endUs);
      if (i > 0) expect(c.startUs).toBeGreaterThanOrEqual(chunks[i - 1]!.endUs);
    }
  });

  it('الربط بالمعرّف لا بالنص: الكلمة المكررة تحتفظ بتوقيتها', () => {
    const ws = words(['لا', 'لا', 'لا', 'لا']);
    const chunks = chunkWords(ws, RULES);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.wordIds).toEqual(['w1', 'w2', 'w3', 'w4']);
  });

  it('حتمي: نفس المدخل يعطي نفس المخرج؛ ولا يغيّر المدخل؛ ومصفوفة فارغة تعطي []', () => {
    const ws = words(['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز']);
    const frozen = Object.freeze(ws.map((w) => Object.freeze({ ...w })));
    expect(chunkWords(frozen, RULES)).toEqual(chunkWords(frozen, RULES));
    expect(chunkWords([], RULES)).toEqual([]);
  });

  it('min=max=1 يعطي كلمة لكل مجموعة', () => {
    const ws = words(['أ', 'ب']);
    expect(chunkWords(ws, { wordsPerChunk: { min: 1, max: 1 }, breakAtPauseUs: 150_000 }).map((c) => c.wordIds)).toEqual([['w1'], ['w2']]);
  });
});
