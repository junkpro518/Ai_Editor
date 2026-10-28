import { describe, expect, it } from 'vitest';
import { blockLayout, captionFont, captionScale, fallbackMeasure, fontString, layoutChunk, readCaptionRules, resolveFontFamily } from '../../../../src/core/captions/layout';
import type { MeasureFn } from '../../../../src/core/commands/types';
import { makeStyle } from '../../../helpers/project';

// T061 — fitFontSize ومستطيلات الكلمات عبر دالة قياس محقونة. هنا القياس الاحتياطي الحتمي (لا DOM):
// عرض الحرف 0.55·الحجم والارتفاع 1.3·الحجم — المستطيلات تقريبية وليست على مستوى الحروف الحقيقية.
const rules = readCaptionRules(makeStyle());
const HD = { width: 1920, height: 1080 };

describe('captionScale/captionFont', () => {
  it('المقياس من الارتفاع للأفقي ومن العرض للعمودي (ريلز 1080×1920 تحافظ على 78px)', () => {
    expect(captionScale(HD)).toBe(1);
    expect(captionScale({ width: 1080, height: 1920 })).toBe(1);
    expect(captionScale({ width: 320, height: 180 })).toBeCloseTo(180 / 1080);
  });

  it('عائلة غير مشحونة → IBM Plex Sans Arabic (ممنوع خطوط النظام)؛ الخط سلسلة واحدة للرسم والقياس', () => {
    expect(resolveFontFamily('Cairo')).toEqual({ family: 'Cairo', fallback: false });
    expect(resolveFontFamily('Arial')).toEqual({ family: 'IBM Plex Sans Arabic', fallback: true });
    const font = captionFont('Arial', 40);
    expect(font).toEqual({ family: 'IBM Plex Sans Arabic', sizePx: 40, weight: 700 });
    expect(fontString(font)).toBe('700 40px "IBM Plex Sans Arabic"');
  });
});

describe('fallbackMeasure', () => {
  it('rtl: الكلمة الأولى منطقياً على اليمين، والمستطيلات بعدد الرموز المفصولة بمسافات', () => {
    const m = fallbackMeasure('سلام عليكم', { family: 'IBM Plex Sans Arabic', sizePx: 100, weight: 700 }, 'rtl');
    expect(m.wordRects).toHaveLength(2);
    expect(m.height).toBe(130);
    expect(m.width).toBeCloseTo((4 + 1 + 5) * 55);
    const first = m.wordRects[0]!;
    const second = m.wordRects[1]!;
    expect(first[0]!).toBeGreaterThan(second[0]!);
    expect(first[0]! + first[2]!).toBeCloseTo(m.width);
    expect(second[0]).toBe(0);
    const ltr = fallbackMeasure('ab cd', { family: 'x', sizePx: 100 }, 'ltr');
    expect(ltr.wordRects[0]![0]).toBe(0);
  });
});

describe('blockLayout', () => {
  it('bottom: أسفل الكتلة عند H·(1−(1−safe/100)/2)؛ top متماثل؛ center في المنتصف؛ العرض = المنطقة الآمنة', () => {
    const b = blockLayout(2, 78, HD, { ...rules, position: 'bottom' });
    expect(b.lineHeight).toBe(Math.round(78 * 1.3));
    expect(b.top + b.height).toBe(972);
    expect(b.width).toBe(1536);
    expect(b.left).toBe(192);
    const t = blockLayout(2, 78, HD, { ...rules, position: 'top' });
    expect(t.top).toBe(108);
    const c = blockLayout(1, 78, HD, { ...rules, position: 'center' });
    expect(c.top).toBe(Math.round((1080 - Math.round(78 * 1.3)) / 2));
  });
});

describe('layoutChunk', () => {
  it('يبدأ من الأساس المقيَّس ويبقي المجموعة القصيرة في سطر واحد بالحجم الكامل', () => {
    const r = layoutChunk(['السلام', 'عليكم', 'ورحمة', 'الله'], rules, HD, fallbackMeasure);
    expect(r.fontSizePx).toBe(78);
    expect(r.lines).toEqual(['السلام عليكم ورحمة الله']);
    expect(r.fits).toBe(true);
    expect(r.wordRects).toHaveLength(4);
  });

  it('يصغّر الخط بخطوة 2 حتى يتسع في maxLines ضمن المنطقة الآمنة، ويلتف عند حدود الكلمات فقط', () => {
    const longWords = Array.from({ length: 5 }, () => 'كلمةطويلةجدا'); // 12 رمزاً: 5 كلمات لا تتسع في سطرين عند 78px وتتسع عند 70px
    const r = layoutChunk(longWords, rules, HD, fallbackMeasure);
    expect(r.fits).toBe(true);
    expect(r.lines.length).toBeLessThanOrEqual(2);
    expect(r.fontSizePx).toBeLessThan(78);
    expect(r.fontSizePx % 2).toBe(0);
    expect(r.lines.join(' ')).toBe(longWords.join(' '));
    for (const line of r.lines) expect(fallbackMeasure(line, captionFont(rules.fontFamily, r.fontSizePx), 'rtl').width).toBeLessThanOrEqual(1536);
  });

  it('عند العجز حتى الحد الأدنى (42·scale) يعيد fits=false بالحد الأدنى بلا كسر داخل كلمة', () => {
    const huge = Array.from({ length: 5 }, () => 'ـ'.repeat(120));
    const r = layoutChunk(huge, rules, HD, fallbackMeasure);
    expect(r.fits).toBe(false);
    expect(r.fontSizePx).toBe(42);
    expect(r.lines.join(' ')).toBe(huge.join(' '));
  });

  it('المستطيلات بإحداثيات canvas مطلقة: السطر الأول أعلى، والكلمة الأولى يميناً، وداخل الكتلة', () => {
    const texts = ['واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة'];
    const narrow = { ...rules, safeAreaPct: 30 }; // يُجبر على سطرين
    const r = layoutChunk(texts, narrow, HD, fallbackMeasure);
    expect(r.lines.length).toBe(2);
    const block = blockLayout(r.lines.length, r.fontSizePx, HD, narrow);
    const firstLineWords = r.lines[0]!.split(' ').length;
    for (let i = 0; i < r.wordRects.length; i++) {
      const [x, y, w, h] = r.wordRects[i]!;
      expect(y).toBe(block.top + (i < firstLineWords ? 0 : block.lineHeight));
      expect(h).toBe(block.lineHeight);
      expect(x).toBeGreaterThanOrEqual(block.left - 1);
      expect(x + w).toBeLessThanOrEqual(block.left + block.width + 1);
      if (i > 0 && i < firstLineWords) expect(x).toBeLessThan(r.wordRects[i - 1]![0]!); // RTL داخل السطر
    }
  });

  it('يستعمل دالة القياس المحقونة بالخط الصحيح والاتجاه rtl', () => {
    const seen: Array<[string, string, string]> = [];
    const spy: MeasureFn = (text, font, dir) => {
      seen.push([text, fontString(font), dir]);
      return fallbackMeasure(text, font, dir);
    };
    layoutChunk(['أهلاً', 'وسهلاً'], rules, { width: 320, height: 180 }, spy);
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every(([, f, d]) => d === 'rtl' && f === `700 ${Math.round((78 * 180) / 1080)}px "IBM Plex Sans Arabic"`)).toBe(true);
  });
});
