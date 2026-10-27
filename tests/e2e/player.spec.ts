import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { fixture, launchApp } from './helpers/launch';

// المعاينة عبر WebCodecs (T027/T028): استيراد → window.__preview.show → window.__test.frame(n).
// على Linux قد يغيب VideoDecoder من بناء Electron؛ عندها نتخطى بسبب واضح بدل التعليق أو الفشل.

type FrameResult =
  | { ok: true; width: number; height: number; pixelHash: string }
  | { ok: false; code: string; message: string };

async function importAndShow(page: Page, file: string): Promise<string> {
  const imported = await page.evaluate((p) => window.__test!.importPath(p), file);
  expect(imported.ok, JSON.stringify(imported)).toBe(true);
  const projectId = (imported as { projectId: string }).projectId;
  // لا نعتمد على نداء E لـ__preview بعد الاستيراد؛ نطلب المعاينة بأنفسنا
  await page
    .waitForFunction(() => typeof window.__preview?.show === 'function', null, { timeout: 20_000 })
    .catch(() => {
      throw new Error('window.__preview غير موجود — حزمة الواجهة لا تستورد src/renderer/player/index.ts');
    });
  await page.evaluate((id) => window.__preview!.show(id, 0), projectId);
  await page.waitForFunction(
    () => typeof (window.__test as { frame?: unknown } | undefined)?.frame === 'function',
    null,
    { timeout: 20_000 },
  );
  return projectId;
}

function frame(page: Page, n: number): Promise<FrameResult> {
  return page.evaluate(
    (i) => (window.__test as unknown as { frame(i: number): Promise<FrameResult> }).frame(i),
    n,
  );
}

test('يفك إطارات tiny-5s عبر WebCodecs ويعطي بصمات مختلفة', async () => {
  const { app, page } = await launchApp();
  try {
    const support = await page.evaluate(async () => {
      if (typeof VideoDecoder === 'undefined') return { available: false, supported: false };
      const r = await VideoDecoder.isConfigSupported({
        codec: 'avc1.42c00d',
        codedWidth: 320,
        codedHeight: 180,
      });
      return { available: true, supported: r.supported === true };
    });
    console.log('WebCodecs VideoDecoder:', JSON.stringify(support));
    test.skip(!support.available, 'decoder_unavailable: VideoDecoder غير موجود في بناء Electron هذا');
    test.skip(!support.supported, 'codec_unsupported: avc1.42c00d غير مدعوم على هذا الجهاز');

    await importAndShow(page, fixture('tiny-5s.mp4'));
    const f0 = await frame(page, 0);
    const f1 = await frame(page, 1);
    const f100 = await frame(page, 100);
    console.log('frames:', JSON.stringify({ f0, f1, f100 }));
    for (const f of [f0, f1, f100]) {
      expect(f.ok, JSON.stringify(f)).toBe(true);
      if (f.ok) expect([f.width, f.height]).toEqual([320, 180]);
    }
    if (f0.ok && f1.ok && f100.ok) {
      expect(f1.pixelHash).not.toBe(f0.pixelHash);
      expect(f100.pixelHash).not.toBe(f0.pixelHash);
      // حتمية: الرجوع للخلف (reset + إعادة فك من الإطار المفتاحي) ثم التقدم → نفس البصمة
      await frame(page, 50);
      const again = await frame(page, 100);
      expect(again).toEqual(f100);
    }
  } finally {
    await app.close();
  }
});

test('يدوّر المصدر 180×320 (rotation=90) إلى ناتج 320×180', async () => {
  const { app, page } = await launchApp();
  try {
    const available = await page.evaluate(() => typeof VideoDecoder !== 'undefined');
    test.skip(!available, 'decoder_unavailable: VideoDecoder غير موجود في بناء Electron هذا');
    await importAndShow(page, fixture('tiny-rotated-5s.mp4'));
    const f0 = await frame(page, 0);
    console.log('rotated frame 0:', JSON.stringify(f0));
    expect(f0.ok, JSON.stringify(f0)).toBe(true);
    if (f0.ok) expect([f0.width, f0.height]).toEqual([320, 180]);
  } finally {
    await app.close();
  }
});
