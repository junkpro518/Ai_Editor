import { test, expect } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import { fixture, launchApp } from './helpers/launch';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// دخان T024–T029: القشرة RTL بالعربية، الاستيراد ≤5 ثوانٍ (FR-001)، والرفض برسالة عربية (FR-019).
let app: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  ({ app, page } = await launchApp());
});

test.afterAll(async () => {
  await app.close();
});

test('الواجهة RTL وشريط التنقل بالعربية', async () => {
  await expect(page.locator('[data-testid="pick-file"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.dir)).toBe('rtl');
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('ar');
  await expect(page.locator('.nav .brand')).toHaveText('محرر المونتاج الذكي');
  await expect(page.locator('.nav button[data-screen="import"]')).toHaveText('استيراد');
  await expect(page.locator('.nav button[data-screen="timeline"]')).toHaveText('التايم لاين');
  expect(await page.evaluate(() => typeof window.__test)).toBe('object');
});

test('استيراد tiny-5s يعرض التايم لاين بلقطة واحدة 150 إطاراً خلال 5 ثوانٍ', async () => {
  const path = fixture('tiny-5s.mp4');
  const started = Date.now();
  const r = await page.evaluate((p) => window.__test!.importPath(p), path);
  expect(r.ok).toBe(true);
  await expect(page.locator('[data-testid="timeline"]')).toBeVisible();
  expect(Date.now() - started).toBeLessThan(5000);
  await expect(page.locator('[data-testid="clip"]')).toHaveCount(1);
  await expect(page.locator('[data-testid="clip"]')).toHaveAttribute('data-frames', '150');
  await expect(page.locator('[data-testid="clip-count"]')).toHaveText('1');

  const projectId = r.ok ? r.projectId : '';
  const list = await page.evaluate(() => window.api.project.list());
  expect(list.map((p) => p.id)).toContain(projectId);
  expect(list.find((p) => p.id === projectId)?.name).toBe('tiny-5s');
  // النمط مثبَّت على الإصدار الافتراضي (T030)
  const saved = await page.evaluate((id) => window.api.project.load(id), projectId);
  expect(saved.style).toEqual({ styleId: 'default', version: 1 });
  expect(saved.timeline.clips[0]).toMatchObject({ inFrame: 0, outFrame: 150, timelineStartFrame: 0 });
});

test('long-16min يُرفض برسالة عربية ولا يُنشئ مشروعاً', async () => {
  await page.locator('.nav button[data-screen="import"]').click();
  const before = (await page.evaluate(() => window.api.project.list())).length;
  const r = await page.evaluate((p) => window.__test!.importPath(p), fixture('long-16min.mp4'));
  expect(r.ok).toBe(false);
  expect(!r.ok && r.code).toBe('too_long');
  const alert = page.locator('[data-testid="import-error"]');
  await expect(alert).toBeVisible();
  await expect(alert).toHaveAttribute('data-code', 'too_long');
  await expect(alert).toContainText('15 دقيقة');
  expect((await page.evaluate(() => window.api.project.list())).length).toBe(before);
});

test('media:// يخدم مصدر المشروع المسجّل فقط مع Range', async () => {
  const list = await page.evaluate(() => window.api.project.list());
  const id = list[0]?.id ?? '';
  const r = await page.evaluate(async (projectId) => {
    const url = window.api.media.urlFor(projectId);
    const part = await fetch(url, { headers: { Range: 'bytes=0-15' } });
    const body = new Uint8Array(await part.arrayBuffer());
    const unknown = await fetch(window.api.media.urlFor('no-such-project'));
    return {
      status: part.status,
      type: part.headers.get('content-type'),
      range: part.headers.get('content-range'),
      len: body.length,
      ftyp: String.fromCharCode(...body.slice(4, 8)),
      unknown: unknown.status,
    };
  }, id);
  expect(r.status).toBe(206);
  expect(r.type).toBe('video/mp4');
  expect(r.range).toMatch(/^bytes 0-15\/\d+$/);
  expect(r.len).toBe(16);
  expect(r.ftyp).toBe('ftyp');
  expect(r.unknown).toBe(404);
});

test('التنقل إلى ملف HTML خارجي ممنوع ولا نوافذ جديدة (مراجعة phase-2 #2)', async () => {
  // يحاكي إسقاط ملف HTML خبيث على النافذة: تنقّل renderer إلى file:// آخر
  const evil = join(tmpdir(), `ai-editor-evil-${process.pid}.html`);
  writeFileSync(evil, '<html><body><script>document.title="pwned"</script></body></html>');
  const before = page.url();
  await page.evaluate((u) => {
    location.href = u;
  }, pathToFileURL(evil).href);
  await page.waitForTimeout(700);
  expect(page.url()).toBe(before);
  expect(await page.title()).not.toBe('pwned');
  expect(await page.evaluate(() => window.open('https://example.com') === null)).toBe(true);
  expect(app.windows().length).toBe(1);
  expect(await page.evaluate(() => typeof window.__test)).toBe('object');
});

