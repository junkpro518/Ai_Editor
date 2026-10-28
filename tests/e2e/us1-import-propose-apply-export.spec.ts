import { test, expect } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import { createServer } from 'node:http';
import type { IncomingMessage, Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fixture, launchApp, repo } from './helpers/launch';
import type { ProjectDocument } from '../../src/core/contracts/types';

// Playwright يعمل على Node ESM مباشرة (بلا vite): JSON يُقرأ لا يُستورد
const deepgramTiny = JSON.parse(readFileSync(fixture('providers/deepgram-tiny-5s.json'), 'utf8')) as Record<string, unknown>;

// T041 — US1 كاملة (Q1→Q2→Q3→Q4→Q6 بلا كابشن) باستجابة مزود مسجّلة: خادم محلي على 127.0.0.1 يقوم مقام Deepgram
// (AI_EDITOR_PROVIDER_BASE_URL يُقرأ في main فقط عندما AI_EDITOR_TEST=1). ثم الحالات الحدّية لـT052 في نفس الجلسة.
// لا شبكة حقيقية ولا مفتاح حقيقي.

test.describe.configure({ mode: 'serial' });

const outDir = join(repo, 'out/test-tmp');
const DUMMY_KEY = 'test-key-0000';

interface Seen {
  method: string;
  url: string;
  headers: IncomingMessage['headers'];
  bodyLength: number;
  magic: string;
}
let server: Server;
let baseUrl: string;
let reply: unknown = deepgramTiny;
const seen: Seen[] = [];

let app: ElectronApplication;
let page: Page;
let projectId = '';

const project = (): Promise<ProjectDocument> => page.evaluate(() => (window.__test!.state() as { project: ProjectDocument }).project);
const clipsOf = (p: ProjectDocument) => p.timeline.clips.map((c) => [c.inFrame, c.outFrame, c.timelineStartFrame]);
const nav = (screen: string) => page.locator(`.nav button[data-screen="${screen}"]`).click();
const confirmDialog = () => page.locator('[role="dialog"][aria-labelledby="confirm-title"] button.primary');

async function importFixture(name: string): Promise<string> {
  const r = await page.evaluate((p) => window.__test!.importPath(p), fixture(name));
  expect(r.ok, JSON.stringify(r)).toBe(true);
  await expect(page.locator('[data-testid="timeline"]')).toBeVisible();
  return (r as { projectId: string }).projectId;
}

async function waitForJob(state: 'done' | 'failed'): Promise<ProjectDocument> {
  await page.waitForFunction((s) => (window.__test!.state() as { project: ProjectDocument }).project?.transcriptJob.state === s, state, { timeout: 60_000 });
  return project();
}

test.beforeAll(async () => {
  mkdirSync(outDir, { recursive: true });
  server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      seen.push({ method: req.method ?? '', url: req.url ?? '', headers: req.headers, bodyLength: body.length, magic: body.subarray(0, 4).toString('hex') });
      if (req.method === 'POST' && (req.url ?? '').startsWith('/v1/listen')) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(reply));
      } else {
        res.writeHead(404, { 'content-type': 'application/json' });
        res.end('{"err_code":"NOT_FOUND"}');
      }
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  ({ app, page } = await launchApp({ AI_EDITOR_PROVIDER_BASE_URL: baseUrl }));
});

test.afterAll(async () => {
  await app.close();
  await new Promise<void>((r) => server.close(() => r()));
});

test('الإعدادات: حفظ مفتاح Deepgram يعرض الاسم وآخر 4 أحرف فقط', async () => {
  await expect(page.locator('.nav button[data-screen="settings"]')).toBeEnabled(); // بلا مشروع
  await nav('settings');
  await expect(page.locator('[data-testid="settings"]')).toBeVisible();
  await expect(page.locator('[data-testid="settings-provider"]')).toHaveValue('deepgram');
  await page.locator('[data-testid="settings-key"]').fill(DUMMY_KEY);
  await page.locator('[data-testid="settings-save-key"]').click();
  const keys = page.locator('[data-testid="settings-keys"] li');
  await expect(keys).toHaveCount(1);
  await expect(keys.first()).toContainText('deepgram (…0000)');
  await expect(keys.first()).not.toContainText('test-key');
  await expect(page.locator('[data-testid="settings-key"]')).toHaveValue('');
  // لا قناة قراءة للمفتاح في الواجهة (القرار 18)
  expect(await page.evaluate(() => Object.keys(window.api.secrets).sort())).toEqual(['available', 'delete', 'list', 'set']);
});

test('Q1/Q2: استيراد ثم إفصاح ثم تفريغ عبر الخادم المحلي؛ الصوت فقط يُرسَل والمفتاح لا يظهر', async () => {
  projectId = await importFixture('tiny-5s.mp4');
  await nav('proposal');
  await expect(page.locator('[data-testid="proposal-request"]')).toBeDisabled();
  await expect(page.locator('[data-testid="proposal-disabled-reason"]')).toContainText('لا تفريغ بعد');

  await page.locator('[data-testid="transcript-start"]').click();
  const disclosure = page.locator('[data-testid="disclosure"]');
  await expect(disclosure).toBeVisible();
  await expect(page.locator('[data-testid="disclosure-what"]')).toContainText('الصوت فقط');
  await expect(page.locator('[data-testid="disclosure-what"]')).toContainText('Opus');
  await expect(page.locator('[data-testid="disclosure-to"]')).toContainText('Deepgram — api.deepgram.com');
  await expect(page.locator('[data-testid="disclosure-key"]')).toContainText('deepgram (…0000)');
  await expect(disclosure).toContainText('mip_opt_out');
  // لا قصّ ولا تفريغ قبل الموافقة
  expect((await project()).transcriptJob.state).toBe('idle');

  await page.locator('[data-testid="disclosure-accept"]').click();
  await expect(page.locator('[data-testid="transcript-progress"]')).toBeVisible();
  const done = await waitForJob('done');
  expect(done.transcript?.words).toHaveLength(12);
  expect(done.transcript?.provider).toBe('deepgram');
  expect(done.transcriptJob).toMatchObject({ state: 'done', progress: 1, provider: 'deepgram', model: 'nova-3' });
  await expect(page.locator('[data-testid="transcript-progress"]')).toHaveCount(0);

  // الطلب الوحيد: صوت WebM (EBML) أصغر من الفيديو، Token بالمفتاح، mip_opt_out=true
  expect(seen).toHaveLength(1);
  const req = seen[0]!;
  expect(req.method).toBe('POST');
  expect(new URL(req.url, baseUrl).searchParams.get('mip_opt_out')).toBe('true');
  expect(req.headers['authorization']).toBe(`Token ${DUMMY_KEY}`);
  expect(req.headers['content-type']).toBe('audio/webm');
  expect(req.magic).toBe('1a45dfa3');
  expect(req.bodyLength).toBeGreaterThan(1000);

  const settings = await page.evaluate(() => window.api.settings.load());
  expect(settings.transcription.disclosures).toEqual([expect.objectContaining({ provider: 'deepgram', keyRef: 'deepgram (…0000)' })]);
  expect(settings.transcription.sendLog).toHaveLength(1);
  expect(settings.transcription.sendLog[0]).toMatchObject({ provider: 'deepgram' });
  // المحفوظ على القرص يحمل التفريغ (FR-016) — الحفظ ذري ومؤجَّل بعد تحديث الحالة، فننتظر القرص لا الذاكرة
  await page.waitForFunction(
    async (id) => ((await window.api.project.load(id)).transcript?.words.length ?? 0) === 12,
    projectId,
    { timeout: 15_000 },
  );
  const saved = await page.evaluate((id) => window.api.project.load(id), projectId);
  expect(saved.transcript?.words).toHaveLength(12);
  expect(JSON.stringify(saved)).not.toContain(DUMMY_KEY);
});

test('Q3: مقترح ببندَي صمت وحشو، 0 قصّات قبل الموافقة، استثناء الحشو ثم الموافقة تطبّق الصمت فقط', async () => {
  await page.locator('[data-testid="proposal-request"]').click();
  const items = page.locator('[data-testid="proposal-item"]');
  await expect(items).toHaveCount(2);
  const reasons = await items.evaluateAll((els) => els.map((e) => e.getAttribute('data-reason')));
  expect(reasons).toEqual(['silence', 'filler']);
  await expect(items.nth(0)).toContainText('صمت طويل');
  await expect(items.nth(0)).toContainText('00:02.03–00:02.23');
  await expect(items.nth(1)).toContainText('يعني');
  await expect(items.nth(1)).toContainText('حشو');
  await expect(page.locator('[data-testid="saved-us"]')).toHaveAttribute('data-us', '860000');
  await expect(page.locator('[data-testid="proposal-totals"] dd[data-reason="silence"]')).toHaveText('1');
  await expect(page.locator('[data-testid="proposal-totals"] dd[data-reason="filler"]')).toHaveText('1');
  await expect(page.locator('[data-testid="item-blocked"]')).toHaveCount(0);

  // SC-005: التايم لاين لم يتغير بالمقترح
  let doc = await project();
  expect(clipsOf(doc)).toEqual([[0, 150, 0]]);
  expect(doc.proposals.at(-1)?.state).toBe('draft');

  // استثناء الحشو بالنقر → reviewed + تصحيح exclude_item بالسبب، وما زال 0 قصّات
  await items.nth(1).locator('[data-testid="item-exclude"]').check();
  await expect(items.nth(1)).toHaveAttribute('data-state', 'excluded');
  doc = await project();
  expect(clipsOf(doc)).toEqual([[0, 150, 0]]);
  expect(doc.proposals.at(-1)?.state).toBe('reviewed');
  expect(doc.corrections).toEqual([expect.objectContaining({ kind: 'exclude_item', reason: 'filler', ruleId: 'cut.fillerWords', quote: 'يعني' })]);
  await expect(page.locator('[data-testid="saved-us"]')).toHaveAttribute('data-us', '660000');

  // الموافقة بتأكيد ← proposal.apply ← التايم لاين
  await page.locator('[data-testid="proposal-apply"]').click();
  await expect(confirmDialog()).toBeVisible();
  expect(clipsOf(await project())).toEqual([[0, 150, 0]]);
  await confirmDialog().click();
  await expect(page.locator('[data-testid="timeline"]')).toBeVisible();
  doc = await project();
  expect(clipsOf(doc)).toEqual([
    [0, 63, 0],
    [83, 150, 63],
  ]);
  const applied = doc.proposals.at(-1)!;
  expect(applied.state).toBe('applied');
  expect(applied.items.map((i) => i.state)).toEqual(['applied', 'excluded']);
  await expect(page.locator('[data-testid="clip"]')).toHaveCount(2);
  // التراجع أمر واحد يعيد اللقطة الكاملة (data-model §3)
  const undone = await page.evaluate(() => window.__test!.run!('history.undo', {}));
  expect(undone.ok).toBe(true);
  expect(clipsOf(await project())).toEqual([[0, 150, 0]]);
  const redone = await page.evaluate(() => window.__test!.run!('history.redo', {}));
  expect(redone.ok).toBe(true);
  expect(clipsOf(await project())).toEqual([
    [0, 63, 0],
    [83, 150, 63],
  ]);
});

test('Q6: التصدير يعطي 130 إطاراً ±1 وفحص التطابق ok', async () => {
  test.setTimeout(240_000);
  const support = await page.evaluate(async () => {
    if (typeof VideoEncoder === 'undefined') return false;
    const cfg = { codec: 'avc1.64001f', width: 320, height: 180, framerate: 30, bitrate: 1_000_000, avc: { format: 'annexb' as const } };
    const hw = await VideoEncoder.isConfigSupported({ ...cfg, hardwareAcceleration: 'prefer-hardware' });
    const sw = await VideoEncoder.isConfigSupported({ ...cfg, hardwareAcceleration: 'no-preference' });
    return hw.supported === true || sw.supported === true;
  });
  test.skip(!support, 'encoder_unavailable: لا مشفّر H.264 في Electron هذا');
  const outPath = join(outDir, 'us1-export.mp4');
  rmSync(outPath, { force: true });
  const r = await page.evaluate((p) => window.__test!.exportMp4!(p), outPath);
  expect(r.ok, JSON.stringify(r)).toBe(true);
  if (!r.ok) return;
  expect(Math.abs(r.result.frames - 130)).toBeLessThanOrEqual(1);
  expect(r.result.parityCheck.frames).toMatchObject({ expected: 130, ok: true });
  expect(r.result.parityCheck.status).toBe('ok');
  expect(existsSync(outPath)).toBe(true);
});

test('حدّية: ملف بلا مسار صوت → الاستيراد يعمل والتفريغ والمقترح معطّلان برسالة', async () => {
  await importFixture('tiny-noaudio-5s.mp4');
  await nav('proposal');
  await expect(page.locator('[data-testid="transcript-start"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="proposal-request"]')).toBeDisabled();
  await expect(page.locator('[data-testid="proposal-disabled-reason"]')).toContainText('بلا مسار صوت');
  // الأمر النقي نفسه يرفض بالرمز no_audio
  const r = await page.evaluate(() => window.__test!.run!('transcript.request', {}));
  expect(r).toMatchObject({ ok: false, code: 'no_audio' });
});

test('حدّية: ملف موسيقى بلا كلام → تفريغ بلا كلمات ومقترح فارغ برسالة لا خطأ', async () => {
  reply = { ...deepgramTiny, results: { channels: [{ alternatives: [{ transcript: '', confidence: 0, words: [] }] }] } };
  projectId = await importFixture('music-only.mp4');
  await nav('proposal');
  await page.locator('[data-testid="transcript-start"]').click();
  // الإفصاح سبق قبوله لهذا المزود والمفتاح → تأكيد الأمر فقط
  await expect(page.locator('[data-testid="disclosure"]')).toHaveCount(0);
  await confirmDialog().click();
  const done = await waitForJob('done');
  expect(done.transcript?.words).toHaveLength(0);
  await page.locator('[data-testid="proposal-request"]').click();
  await expect(page.locator('[data-testid="proposal-empty"]')).toHaveText('ما لقيت كلاماً في المقطع.');
  await expect(page.locator('[data-testid="proposal-status"]')).not.toHaveClass(/warn/);
  const doc = await project();
  expect(clipsOf(doc)).toEqual([[0, doc.source.frameCount, 0]]); // music-only أطول من tiny؛ المهم: لا قصّ
});

test('حدّية: إغلاق أثناء التفريغ → عند الفتح «تفريغ لم يكتمل» وإعادة التفريغ تكتمل', async () => {
  reply = deepgramTiny;
  // نحاكي مستنداً حُفظ وسط المهمة ثم أُعيد فتحه (نفس خدعة export.spec: حفظ ثم loadProject)
  const doc = await project();
  const mid: ProjectDocument = { ...doc, transcript: null, transcriptJob: { state: 'uploading', provider: 'deepgram', model: 'nova-3', progress: 0.4 } };
  await page.evaluate((id) => window.__test!.loadProject!(id), projectId); // يفرّغ الحفظ المؤجَّل أولاً كي لا يكتب فوق مستندنا
  await page.evaluate((d) => window.api.project.save(d), mid);
  await page.evaluate((id) => window.__test!.loadProject!(id), projectId);
  const stale = page.locator('[data-testid="transcript-stale"]');
  await expect(stale).toBeVisible();
  await expect(stale).toContainText('تفريغ لم يكتمل');
  await page.locator('[data-testid="transcript-resume"]').click();
  await confirmDialog().click();
  const done = await waitForJob('done');
  expect(done.transcript?.words).toHaveLength(12);
  await expect(stale).toHaveCount(0);
});

test('حدّية: بلا اتصال → رسالة تذكر ما يحتاج إنترنت وما يعمل بلا اتصال، والمشروع صالح', async () => {
  await new Promise<void>((r) => server.close(() => r()));
  projectId = await importFixture('tiny-5s.mp4');
  await nav('proposal');
  await page.locator('[data-testid="transcript-start"]').click();
  await confirmDialog().click();
  const failed = await waitForJob('failed');
  expect(failed.transcriptJob.error).toBe('offline');
  const bar = page.locator('[data-testid="transcript-failed"]');
  await expect(bar).toHaveAttribute('data-code', 'offline');
  await expect(bar).toContainText('لا يوجد اتصال — التفريغ يحتاج إنترنت؛ الاستيراد والمعاينة والقص والتصدير تعمل بلا اتصال');
  await expect(page.locator('[data-testid="transcript-retry"]')).toBeVisible();
  // المشروع صالح بلا تفريغ: القص اليدوي يعمل
  const clipId = failed.timeline.clips[0]!.id;
  const split = await page.evaluate((c) => window.__test!.run!('clip.split', { clipId: c, atFrame: 60 }), clipId);
  expect(split.ok, JSON.stringify(split)).toBe(true);
  expect(clipsOf(await project())).toEqual([
    [0, 60, 0],
    [60, 150, 60],
  ]);
});

test('حدّية: نقل ملف المصدر → «حدّد مكان الملف» يعيد الربط بالبصمة ويرفض ملفاً مختلفاً', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ai-editor-moved-'));
  const original = join(dir, 'moved-src.mp4');
  const moved = join(dir, 'moved-src-renamed.mp4');
  copyFileSync(fixture('tiny-5s.mp4'), original);
  const r = await page.evaluate((p) => window.__test!.importPath(p), original);
  expect(r.ok, JSON.stringify(r)).toBe(true);
  const id = (r as { projectId: string }).projectId;
  await expect(page.locator('[data-testid="source-missing"]')).toHaveCount(0);

  renameSync(original, moved);
  await page.evaluate((i) => window.__test!.loadProject!(i), id);
  await expect(page.locator('[data-testid="source-missing"]')).toBeVisible();

  // حوار الملفات يُستبدل من جهة main (لا يمكن النقر على حوار النظام في xvfb)
  const pick = (path: string) =>
    app.evaluate(({ dialog }, p) => {
      dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [p] })) as typeof dialog.showOpenDialog;
    }, path);

  // ملف مختلف بنفس الصيغة → البصمة لا تطابق
  await pick(fixture('tiny-noaudio-5s.mp4'));
  await page.locator('[data-testid="relink"]').click();
  await expect(page.locator('[data-testid="source-missing"]')).toContainText('الملف المختار ليس نفس المقطع');
  expect((await project()).source.path).toBe(original);

  await pick(moved);
  await page.locator('[data-testid="relink"]').click();
  await expect(page.locator('[data-testid="source-missing"]')).toHaveCount(0);
  const doc = await project();
  expect(doc.source.path).toBe(moved);
  expect(doc.source.fileName).toBe('moved-src-renamed.mp4');
  const saved = await page.evaluate((i) => window.api.project.load(i), id);
  expect(saved.source.path).toBe(moved);
  // media:// يخدم المسار الجديد
  const status = await page.evaluate(async (i) => (await fetch(window.api.media.urlFor(i), { headers: { Range: 'bytes=0-15' } })).status, id);
  expect(status).toBe(206);
  rmSync(dir, { recursive: true, force: true });
});
