import { test, expect } from '@playwright/test';
import type { ElectronApplication, Locator, Page } from '@playwright/test';
import { fixture, launchApp } from './helpers/launch';

// T049: شاشة التايم لاين — تقسيم/قصّ/حذف/تراجع/إعادة عبر الأوامر، اختصارات لوحة المفاتيح، التايم كود،
// شارة التحذير على اللقطة المخالفة (FR-009)، والمعاينة تعرض إطاراً حقيقياً بعد التعديل.

type Clip = { id: string; inFrame: number; outFrame: number; timelineStartFrame: number };
type RunResult =
  | { ok: true; project: { timeline: { clips: Clip[] }; corrections: Array<{ kind: string; violates?: string }> } }
  | { ok: false; code: string; message: string };
// run مشترك مع خطافات التصدير (نفس الشكل { ok, project })؛ clips من timelineTestHooks
type Hooks = { run(name: string, params: unknown): Promise<RunResult>; clips(): Clip[] };

// الاختبارات تبني على بعضها؛ عند فشل واحد تُتخطى البقية بدل إعادة تشغيل التطبيق باستيراد جديد
test.describe.configure({ mode: 'serial' });

let app: ElectronApplication;
let page: Page;
let decoder = false;

// الدوال داخل page.evaluate تُسلسَل: لا إغلاق على متغيرات Node
const runCmd = (name: string, params: unknown): Promise<RunResult> =>
  page.evaluate(([n, p]) => (window as unknown as { __test: Hooks }).__test.run(n as string, p), [name, params] as [string, unknown]);
const clips = (): Promise<Clip[]> =>
  page.evaluate(() => (window as unknown as { __test: Hooks }).__test.clips());
const frames = async (): Promise<number[]> => {
  const list = page.locator('[data-testid="clip"]');
  const n = await list.count();
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(Number(await list.nth(i).getAttribute('data-frames')));
  return out;
};
const timecode = (): Locator => page.locator('[data-testid="timecode"]');

/** عدد البكسلات غير السوداء (RGB) في canvas المعاينة الظاهر */
async function litPixels(): Promise<number> {
  return page.evaluate(() => {
    const c = document.getElementById('preview-canvas') as HTMLCanvasElement | null;
    if (!c) return -1;
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i]! + d[i + 1]! + d[i + 2]! > 30) n++;
    return n;
  });
}

test.beforeAll(async () => {
  ({ app, page } = await launchApp());
  decoder = await page.evaluate(() => typeof VideoDecoder !== 'undefined');
  console.log('VideoDecoder available:', decoder);
  const r = await page.evaluate((p) => window.__test!.importPath(p), fixture('tiny-5s.mp4'));
  expect(r.ok, JSON.stringify(r)).toBe(true);
  await expect(page.locator('[data-testid="timeline"]')).toBeVisible();
  await page.waitForFunction(() => {
    const h = (window as unknown as { __test: Partial<Hooks> }).__test;
    return typeof h.run === 'function' && typeof h.clips === 'function';
  });
});

test.afterAll(async () => {
  await app.close();
});

test('الحالة الأولية: لقطة واحدة 150 إطاراً، التايم كود 00:00.00 / 00:05.00', async () => {
  expect(await frames()).toEqual([150]);
  await expect(page.locator('[data-testid="clip-count"]')).toHaveText('1');
  await expect(timecode()).toHaveText('00:00.00');
  await expect(page.locator('[data-testid="timecode-total"]')).toContainText('00:05.00');
  await expect(page.locator('[data-testid="clip-warning"]')).toHaveCount(0);
});

test('الأسهم تحرّك المؤشر إطاراً إطاراً والتايم كود يتبعه', async () => {
  for (let i = 0; i < 31; i++) await page.keyboard.press('ArrowRight');
  await expect(timecode()).toHaveText('00:01.01');
  await page.keyboard.press('ArrowLeft');
  await expect(timecode()).toHaveText('00:01.00');
  expect(await page.locator('[data-testid="playhead"]').getAttribute('style')).toContain('20%');
});

test('التقسيم عند الإطار 60 عبر الأمر ثم بمفتاح S عند المؤشر', async () => {
  const [c0] = await clips();
  const r = await runCmd('clip.split', { clipId: c0!.id, atFrame: 60 });
  expect(r.ok, JSON.stringify(r)).toBe(true);
  await expect(page.locator('[data-testid="clip"]')).toHaveCount(2);
  expect(await frames()).toEqual([60, 90]);
  // المؤشر عند 30 داخل اللقطة الأولى → S يقسمها عند إطار المصدر 30
  await page.keyboard.press('s');
  await expect(page.locator('[data-testid="clip"]')).toHaveCount(3);
  expect(await frames()).toEqual([30, 30, 90]);
  expect((await clips()).map((c) => [c.inFrame, c.outFrame, c.timelineStartFrame])).toEqual([
    [0, 30, 0],
    [30, 60, 30],
    [60, 150, 60],
  ]);
});

test('القصّ عبر الأمر يعيد حساب البدايات، والقصّ تحت الحد الإلزامي يُظهر شارة تبقى على اللقطة (FR-009)', async () => {
  const cs = await clips();
  const r = await runCmd('clip.trim', { clipId: cs[2]!.id, inFrame: 90 });
  expect(r.ok, JSON.stringify(r)).toBe(true);
  expect(await frames()).toEqual([30, 30, 60]);
  await expect(page.locator('[data-testid="timecode-total"]')).toContainText('00:04.00');
  expect((await clips())[2]).toMatchObject({ inFrame: 90, outFrame: 150, timelineStartFrame: 60 });

  // 500 ms عند 30 fps = 15 إطاراً؛ 10 إطارات تخالف القاعدة الإلزامية minClipUs
  const w = await runCmd('clip.trim', { clipId: cs[1]!.id, outFrame: 40 });
  expect(w.ok, JSON.stringify(w)).toBe(true);
  expect(w.ok && w.project.corrections).toHaveLength(1);
  const badge = page.locator('[data-testid="clip-warning"]');
  await expect(badge).toHaveCount(1);
  await expect(page.locator('[data-testid="clip"][data-warning~="violates_mandatory_rule"]')).toHaveAttribute('data-frames', '10');
  // الشارة تبقى بعد تعديل آخر لا يمسّ اللقطة
  await page.keyboard.press('ArrowLeft');
  await expect(badge).toHaveCount(1);
  // الحفظ مؤجَّل 300ms (FR-016)؛ التسجيل يصل إلى القرص
  const projectId = (await page.locator('[data-testid="timeline"]').getAttribute('data-project-id'))!;
  await expect
    .poll(() => page.evaluate((id) => window.api.project.load(id).then((d) => d.corrections), projectId))
    .toMatchObject([{ kind: 'manual_edit', violates: 'cut.minClipUs' }]);
});

test('اختيار لقطة وحذفها بمفتاح Delete، ثم Ctrl+Z يعيدها و Ctrl+Shift+Z يحذفها مجدداً', async () => {
  const clipEls = page.locator('[data-testid="clip"]');
  await clipEls.nth(1).click();
  await expect(clipEls.nth(1)).toHaveClass(/selected/);
  await page.keyboard.press('Delete');
  await expect(clipEls).toHaveCount(2);
  expect(await frames()).toEqual([30, 60]);
  await expect(page.locator('[data-testid="clip-warning"]')).toHaveCount(0);

  await page.keyboard.press('Control+z');
  await expect(clipEls).toHaveCount(3);
  expect(await frames()).toEqual([30, 10, 60]);
  await page.keyboard.press('Control+Shift+z');
  await expect(clipEls).toHaveCount(2);
  expect(await frames()).toEqual([30, 60]);
  // تراجع مرتين: الحذف ثم القصّ المخالف → 3 لقطات بلا شارة
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+z');
  expect(await frames()).toEqual([30, 30, 60]);
  await expect(page.locator('[data-testid="clip-warning"]')).toHaveCount(0);
});

test('سحب حافة اللقطة بالفأرة يقصّها، وأزرار ◀ ▶ تنقلها', async () => {
  const track = page.locator('[data-testid="track"]');
  const box = (await track.boundingBox())!;
  const total = (await frames()).reduce((a, b) => a + b, 0); // 120
  const pxPerFrame = box.width / total;
  const last = page.locator('[data-testid="clip"]').nth(2);
  const handle = last.locator('[data-testid="handle-out"]');
  const hb = (await handle.boundingBox())!;
  // نسحب حافة الخروج 20 إطاراً إلى اليسار
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb.x + hb.width / 2 - 20 * pxPerFrame, hb.y + hb.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => frames()).toEqual([30, 30, 40]);
  expect((await clips())[2]).toMatchObject({ inFrame: 90, outFrame: 130 });

  await last.click();
  await page.locator('[data-testid="move-earlier"]').click();
  expect(await frames()).toEqual([30, 40, 30]);
  expect((await clips()).map((c) => c.timelineStartFrame)).toEqual([0, 30, 70]);
  await page.locator('[data-testid="move-later"]').click();
  expect(await frames()).toEqual([30, 30, 40]);
});

test('حذف آخر لقطة مرفوض برسالة عربية', async () => {
  const cs = await clips();
  for (const c of cs.slice(1)) expect((await runCmd('clip.delete', { clipId: c.id })).ok).toBe(true);
  const r = await runCmd('clip.delete', { clipId: cs[0]!.id });
  expect(r.ok).toBe(false);
  expect(!r.ok && r.code).toBe('last_clip');
  await page.locator('[data-testid="clip"]').first().click();
  await page.keyboard.press('Delete');
  await expect(page.locator('[data-testid="status"]')).toHaveText('لا يمكن حذف آخر لقطة في التايم لاين.');
});

test('المعاينة تعرض إطاراً حقيقياً (بكسلات غير سوداء) بعد التعديل', async () => {
  test.skip(!decoder, 'decoder_unavailable: VideoDecoder غير موجود في بناء Electron هذا');
  await expect(page.locator('[data-testid="preview-error"]')).toHaveCount(0);
  await expect.poll(() => litPixels(), { timeout: 15_000 }).toBeGreaterThan(1000);
  // بعد تعديل يغيّر إطار المؤشر (المؤشر 0 → لقطة تبدأ من إطار مصدر آخر) تبقى المعاينة حيّة
  const [c0] = await clips();
  expect((await runCmd('clip.trim', { clipId: c0!.id, inFrame: 100, outFrame: 150 })).ok).toBe(true);
  await expect.poll(() => litPixels(), { timeout: 15_000 }).toBeGreaterThan(1000);
});
