import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// مراجعة us2 #2: مخبأ measureText بلا سقف كان يحتفظ بكل سطر مجمَّع من نص المزود طول الجلسة. vitest على Node بلا DOM،
// فنحقن document صغيراً يعدّ استدعاءات القياس (getBoundingClientRect) — إصابة المخبأ = لا استدعاء.
let measured = 0;
function stubDocument(): void {
  const el = {
    style: {} as Record<string, string>,
    dir: '',
    isConnected: true,
    textContent: '',
    firstChild: {},
    setAttribute(): void {},
    getBoundingClientRect() {
      measured++;
      return { left: 0, top: 0, width: 10, height: 10 };
    },
  };
  vi.stubGlobal('document', {
    createElement: () => el,
    body: { appendChild(): void {} },
    createRange: () => ({ setStart(): void {}, setEnd(): void {}, getClientRects: () => [] }),
  });
}

const font = { family: 'IBM Plex Sans Arabic', sizePx: 78, weight: 700 };

describe('measureText cache', () => {
  beforeEach(() => {
    measured = 0;
    stubDocument();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('يخبّئ بالمفتاح dir|font|text ويفرّغ عند بلوغ السقف بدل النمو بلا حد', async () => {
    const { MAX_CACHE_ENTRIES, clearMeasureCache, measureText } = await import('../../../../src/renderer/captions/measure');
    clearMeasureCache();
    const first = measureText('سلام', font, 'rtl');
    expect(first.width).toBe(10);
    expect(measured).toBe(1);
    measureText('سلام', font, 'rtl');
    expect(measured).toBe(1); // إصابة
    expect(MAX_CACHE_ENTRIES).toBeLessThanOrEqual(20_000);
    for (let i = 0; i < MAX_CACHE_ENTRIES; i++) measureText(`كلمة${i}`, font, 'rtl');
    // بلغ السقف فتفرّغ: المفتاح الأول صار غائباً ويُقاس من جديد
    measureText('سلام', font, 'rtl');
    expect(measured).toBe(1 + MAX_CACHE_ENTRIES + 1);
  });
});
