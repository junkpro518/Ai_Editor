import { test, expect } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import { launchApp } from './helpers/launch';

// T056 — فحوص العربية الدلالية (research.md R6، SC-004): لا OCR ولا صور مرجعية؛ نقيس ونرسم بنفس دوال الكابشن
// (window.__test من src/renderer/captions/testHooks.ts) ونحكم على الأرقام: اتصال الحروف، ترتيب RTL، كلمة إنجليزية
// في موضعها وبحروف LTR، أرقام لا تنقلب، لام-ألف مستطيل واحد، التفاف عند الكلمات فقط، إبراز محصور، تشكيل لا يزحزح.

type Dir = 'rtl' | 'ltr';
type Rect = [number, number, number, number];
type Hooks = {
  fontsReady(): boolean;
  measure(text: string, dir?: Dir): { ok: true; width: number; height: number; wordRects: Rect[] } | { ok: false; code: string; message: string };
  glyphs(text: string, dir?: Dir): { ok: true; hash: string; inkWidth: number } | { ok: false; code: string; message: string };
  caption(text: string, activeIndex?: number): { ok: true; lines: string[]; fontSizePx: number; fits: boolean; rects: Rect[]; hash: string } | { ok: false; code: string; message: string };
  highlightDiff(text: string, activeIndex: number): { ok: true; rect: Rect; diffBox: Rect | null; count: number } | { ok: false; code: string; message: string };
};
// الدوال داخل page.evaluate تُسلسَل: لا إغلاق على دوال Node، فنصل إلى window.__test داخلها مباشرة
type W = Window & { __test: Hooks };

let app: ElectronApplication;
let page: Page;

async function width(text: string, dir: Dir = 'rtl'): Promise<number> {
  const r = await page.evaluate(([t, d]) => (window as unknown as W).__test.measure(t as string, d as Dir), [text, dir] as [string, Dir]);
  expect(r.ok, JSON.stringify(r)).toBe(true);
  return r.ok ? r.width : NaN;
}
async function glyphs(text: string, dir: Dir = 'rtl'): Promise<{ hash: string; inkWidth: number }> {
  const r = await page.evaluate(([t, d]) => (window as unknown as W).__test.glyphs(t as string, d as Dir), [text, dir] as [string, Dir]);
  expect(r.ok, JSON.stringify(r)).toBe(true);
  return r.ok ? r : { hash: '', inkWidth: 0 };
}
async function caption(text: string, active = 0) {
  const r = await page.evaluate(([t, a]) => (window as unknown as W).__test.caption(t as string, a as number), [text, active] as [string, number]);
  expect(r.ok, JSON.stringify(r)).toBe(true);
  if (!r.ok) throw new Error(r.message);
  return r;
}

test.beforeAll(async () => {
  ({ app, page } = await launchApp());
  await page.waitForFunction(() => typeof (window as unknown as { __test?: Partial<Hooks> }).__test?.fontsReady === 'function');
  // الخطوط المشحونة محمَّلة فعلاً قبل أي قياس (وإلا تُخبَّأ قياسات خط بديل)
  await page.waitForFunction(() => (window as unknown as W).__test.fontsReady(), undefined, { timeout: 30_000 });
});

test.afterAll(async () => {
  await app.close();
});

test('1. اتصال الحروف: «سلام» سلسلة واحدة تختلف عن حروفها مفصولة، وأضيق من مجموع الحروف المنفردة', async () => {
  const joined = await glyphs('سلام');
  const broken = await glyphs('س‌ل‌ا‌م'); // ZWNJ يمنع الاتصال بلا عرض — نفس الخط والحروف
  expect(joined.hash).not.toBe(broken.hash);
  const w = await width('سلام');
  const letters = await Promise.all(['س', 'ل', 'ا', 'م'].map((c) => width(c)));
  const sum = letters.reduce((a, b) => a + b, 0);
  console.log(`connected: width(سلام)=${w.toFixed(2)} < Σ isolated=${sum.toFixed(2)} [${letters.map((x) => x.toFixed(1)).join(', ')}]; ink ${joined.inkWidth} vs ${broken.inkWidth}px; hash ${joined.hash} vs ${broken.hash}`);
  expect(w).toBeLessThan(sum);
  expect(joined.inkWidth).toBeLessThan(broken.inkWidth);
});

test('2. ترتيب RTL: مستطيلات الكلمات تتناقص في x مع ترتيب الكلمات', async () => {
  const c = await caption('السلام عليكم اليوم نشرح');
  expect(c.lines).toEqual(['السلام عليكم اليوم نشرح']);
  const xs = c.rects.map((r) => r[0]);
  console.log(`rtl order x: [${xs.join(', ')}] size ${c.fontSizePx}px`);
  for (let i = 1; i < xs.length; i++) expect(xs[i]!).toBeLessThan(xs[i - 1]!);
  // المستطيلات لا تتداخل
  for (let i = 1; i < c.rects.length; i++) expect(c.rects[i]![0] + c.rects[i]![2]).toBeLessThanOrEqual(c.rects[i - 1]![0]);
});

test('3. كلمة إنجليزية داخل جملة عربية: في موضعها بين جارتيها وبعرض وحروف LTR', async () => {
  const c = await caption('اليوم نشرح Hello بسرعة');
  expect(c.lines).toEqual(['اليوم نشرح Hello بسرعة']);
  const [, before, hello, after] = c.rects as [Rect, Rect, Rect, Rect];
  expect(hello[0]).toBeLessThan(before[0]);
  expect(hello[0]).toBeGreaterThan(after[0]);
  const ltr = await width('Hello', 'ltr');
  const inRtl = await width('Hello', 'rtl');
  console.log(`Hello: rect x=${hello[0]} w=${hello[2]} between ${before[0]} and ${after[0]}; width ltr=${ltr.toFixed(2)} rtl=${inRtl.toFixed(2)}`);
  expect(Math.abs(hello[2] - ltr)).toBeLessThanOrEqual(2);
  expect(Math.abs(inRtl - ltr)).toBeLessThanOrEqual(0.01);
  // حروفها لا تنعكس: رسمها في سياق rtl يطابق رسمها ltr
  expect((await glyphs('Hello', 'rtl')).hash).toBe((await glyphs('Hello', 'ltr')).hash);
});

test('4. الأرقام لا تنقلب: «25» و«٢٥» بالاتجاهين نفس البكسلات، و«25» ≠ «52»', async () => {
  for (const digits of ['25', '٢٥']) {
    const rtl = await glyphs(digits, 'rtl');
    const ltr = await glyphs(digits, 'ltr');
    console.log(`digits ${digits}: rtl ${rtl.hash} ltr ${ltr.hash} ink ${rtl.inkWidth}px`);
    expect(rtl.hash).toBe(ltr.hash);
    expect(await width(digits, 'rtl')).toBe(await width(digits, 'ltr'));
  }
  expect((await glyphs('25')).hash).not.toBe((await glyphs('52')).hash);
  expect((await glyphs('٢٥')).hash).not.toBe((await glyphs('٥٢')).hash);
  // داخل جملة عربية: مستطيل الرقم بين جارتيه
  const c = await caption('عندنا 25 طالباً');
  expect(c.rects[1]![0]).toBeLessThan(c.rects[0]![0]);
  expect(c.rects[1]![0]).toBeGreaterThan(c.rects[2]![0]);
});

test('5. لام-ألف مجموعة واحدة: أضيق من ل + ا', async () => {
  const la = await width('لا');
  const l = await width('ل');
  const a = await width('ا');
  console.log(`lam-alef: width(لا)=${la.toFixed(2)} < ${l.toFixed(2)} + ${a.toFixed(2)} = ${(l + a).toFixed(2)}`);
  expect(la).toBeLessThan(l + a);
  const c = await caption('لا تنسَ لا');
  expect(c.rects).toHaveLength(3);
});

test('6. الالتفاف عند حدود الكلمات فقط: الأسطر مجتمعة = النص، ولا سطر ينتهي داخل كلمة', async () => {
  const text = 'في هذا الدرس الطويل نشرح كيف يعمل الكابشن العربي مع الكلمات الإنجليزية Hello World والأرقام 2026 بوضوح';
  const c = await caption(text);
  console.log(`wrap: ${c.lines.length} lines @ ${c.fontSizePx}px fits=${c.fits}: ${JSON.stringify(c.lines)}`);
  expect(c.lines.length).toBeGreaterThanOrEqual(2);
  expect(c.fits).toBe(true);
  expect(c.lines.join(' ')).toBe(text);
  const original = text.split(' ');
  let k = 0;
  for (const line of c.lines) {
    const ws = line.split(' ');
    expect(ws.length).toBeGreaterThan(0);
    for (const w of ws) expect(w).toBe(original[k++]);
  }
  expect(k).toBe(original.length);
  // السطر الأول في الأعلى، وكل سطر داخل المنطقة الآمنة 80% من 1920
  const rows = [...new Set(c.rects.map((r) => r[1]))].sort((p, q) => p - q);
  expect(rows).toHaveLength(c.lines.length);
  for (const r of c.rects) {
    expect(r[0]).toBeGreaterThanOrEqual(192 - 2);
    expect(r[0] + r[2]).toBeLessThanOrEqual(1728 + 2);
  }
});

test('7. إبراز كلمة في سطر مختلط يغيّر بكسلات داخل مستطيلها فقط (±2px)', async () => {
  const text = 'اليوم نشرح Hello بسرعة';
  for (const active of [1, 2]) {
    const r = await page.evaluate(([t, a]) => (window as unknown as W).__test.highlightDiff(t as string, a as number), [text, active] as [string, number]);
    expect(r.ok, JSON.stringify(r)).toBe(true);
    if (!r.ok) return;
    console.log(`highlight word ${active}: rect ${JSON.stringify(r.rect)} diffBox ${JSON.stringify(r.diffBox)} count ${r.count}`);
    expect(r.count).toBeGreaterThan(0);
    expect(r.diffBox).not.toBeNull();
    const [x, y, w, h] = r.rect;
    const [dx, dy, dw, dh] = r.diffBox!;
    expect(dx).toBeGreaterThanOrEqual(x - 2);
    expect(dy).toBeGreaterThanOrEqual(y - 2);
    expect(dx + dw).toBeLessThanOrEqual(x + w + 2);
    expect(dy + dh).toBeLessThanOrEqual(y + h + 2);
  }
});

test('8. التشكيل لا يزحزح العرض: «محمد» و«مُحَمَّد» ضمن 2px', async () => {
  const plain = await width('محمد');
  const marked = await width('مُحَمَّد');
  console.log(`tashkeel: width(محمد)=${plain.toFixed(2)} width(مُحَمَّد)=${marked.toFixed(2)} Δ=${Math.abs(plain - marked).toFixed(2)}`);
  expect(Math.abs(plain - marked)).toBeLessThanOrEqual(2);
  // وداخل جملة: مستطيل الكلمة المشكّلة بعرض الكلمة غير المشكّلة ±2
  const a = await caption('قال محمد كذا');
  const b = await caption('قال مُحَمَّد كذا');
  expect(Math.abs(a.rects[1]![2] - b.rects[1]![2])).toBeLessThanOrEqual(2);
});
