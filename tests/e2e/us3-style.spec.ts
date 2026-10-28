import { test, expect } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { readFileSync } from 'node:fs';
import { fixture, launchApp } from './helpers/launch';
import type { ProjectDocument, StyleVersion } from '../../src/core/contracts/types';

// Q7 (US3) من طرف إلى طرف بتفريغ مسجَّل فيه 3 كلمات حشو «يعني» منفصلة وفجوة صمت 900 ms (deepgram-tiny-5s-fillers.json):
// (1) تغيير عتبة الصمت من لوحة النمط → إصدار جديد reason=user والمشروع مثبّت عليه وإعادة المقترح تُسقط بند الصمت؛
// (3) استثناء 3 بنود حشو ← الموافقة → اقتراح تحديث النمط بالاقتباسات الثلاثة والفرق؛ الرفض لا يغيّر شيئاً (SC-007)؛
//     إعادة الاستثناء ← القبول (تأكيد) → إصدار learned بسوابق في ملف الإصدار والمشروع مثبّت عليه؛
// (5) مشروع ثانٍ يرفع المكتبة ← فتح الأول يعرض إشعار «إصدار أحدث» بلا تغيير تلقائي؛ الترقية (تأكيد) تثبّت وتلغي
//     المقترح المفتوح؛ «رجوع» ينشئ إصداراً بمحتوى القديم؛ (2) قاعدة إلزامية مخالَفة تحظر البنود وتعرض السبب.
// الترتيب يراعي أن حالة التطبيق واحدة ومتراكمة عبر الاختبارات.

test.describe.configure({ mode: 'serial' });

const deepgramFillers = JSON.parse(readFileSync(fixture('providers/deepgram-tiny-5s-fillers.json'), 'utf8')) as Record<string, unknown>;
const STYLE_ID = 'default';

let server: Server;
let app: ElectronApplication;
let page: Page;
let projectA = '';

type Hooks = {
  state(): { project: ProjectDocument };
  run(name: string, params: unknown): Promise<{ ok: true; project: ProjectDocument } | { ok: false; code: string; message: string }>;
  fontsReady(): boolean;
  loadProject(id: string): Promise<void>;
  styleState(): { pinned: { styleId: string; version: number } | null; current: number | null; latest: number | null; pendingUpdates: string[] };
};
type W = { __test: Hooks };

const project = (): Promise<ProjectDocument> => page.evaluate(() => (window as unknown as W).__test.state().project);
const styleState = () => page.evaluate(() => (window as unknown as W).__test.styleState());
const nav = (screen: string) => page.locator(`.nav button[data-screen="${screen}"]`).click();
const cmd = (name: string, params: unknown) => page.evaluate(([n, p]) => (window as unknown as W).__test.run(n as string, p), [name, params] as [string, unknown]);
const confirmDialog = () => page.locator('[role="dialog"][aria-labelledby="confirm-title"] button.primary');
const versions = () => page.evaluate((id) => window.api.style.listVersions(id), STYLE_ID);
const loadVersion = (v: number): Promise<StyleVersion> => page.evaluate(([id, n]) => window.api.style.loadVersion(id as string, n as number), [STYLE_ID, v] as [string, number]);
const field = (path: string) => page.locator(`[data-testid="style-field"][data-path="${path}"]`);
const items = () => page.locator('[data-testid="proposal-item"]');
const clipsOf = (p: ProjectDocument) => p.timeline.clips.map((c) => [c.inFrame, c.outFrame, c.timelineStartFrame]);

async function setFieldViaPanel(path: string, value: string): Promise<void> {
  const input = field(path).locator('[data-testid="style-input"]');
  await input.fill(value);
  await input.press('Enter');
}

async function requestProposal(expectedReasons: string[]): Promise<void> {
  await nav('proposal');
  await page.locator('[data-testid="proposal-request"]').click();
  await expect(items()).toHaveCount(expectedReasons.length);
  expect(await items().evaluateAll((els) => els.map((e) => e.getAttribute('data-reason')))).toEqual(expectedReasons);
}

/** يستثني كل بنود الحشو بالنقر ثم يوافق بتأكيد؛ يعيد المشروع بعد التطبيق */
async function excludeFillersAndApply(): Promise<ProjectDocument> {
  const fillers = page.locator('[data-testid="proposal-item"][data-reason="filler"]');
  await expect(fillers).toHaveCount(3);
  for (let i = 0; i < 3; i++) {
    await fillers.nth(i).locator('[data-testid="item-exclude"]').check();
    await expect(fillers.nth(i)).toHaveAttribute('data-state', 'excluded');
  }
  await page.locator('[data-testid="proposal-apply"]').click();
  await expect(confirmDialog()).toBeVisible();
  await confirmDialog().click();
  await expect(page.locator('[data-testid="timeline"]')).toBeVisible();
  return project();
}

test.beforeAll(async () => {
  server = createServer((req, res) => {
    req.on('data', () => undefined);
    req.on('end', () => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(deepgramFillers));
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  ({ app, page } = await launchApp({ AI_EDITOR_PROVIDER_BASE_URL: `http://127.0.0.1:${(server.address() as AddressInfo).port}` }));
  await page.waitForFunction(() => typeof (window as unknown as { __test?: Partial<Hooks> }).__test?.fontsReady === 'function');
  await page.waitForFunction(() => (window as unknown as W).__test.fontsReady(), undefined, { timeout: 30_000 });
});

test.afterAll(async () => {
  await app.close();
  await new Promise<void>((r) => server.close(() => r()));
});

test('استيراد وتفريغ → مقترح بثلاثة بنود حشو وبند صمت، كلها قابلة للاستثناء', async () => {
  const r = await page.evaluate((p) => window.__test!.importPath(p), fixture('tiny-5s.mp4'));
  expect(r.ok, JSON.stringify(r)).toBe(true);
  projectA = (r as { projectId: string }).projectId;
  await expect(page.locator('[data-testid="timeline"]')).toBeVisible();
  // النمط يُفتح الحين (لم يكن «لاحقاً»)
  await expect(page.locator('.nav button[data-screen="style"]')).toBeEnabled();
  await expect(page.locator('.nav button[data-screen="style"]')).toHaveText('النمط');
  await expect(page.locator('[data-testid="style-upgrade-notice"]')).toHaveCount(0);

  await page.evaluate(() => window.api.secrets.set('deepgram', 'test-key-0000'));
  await page.evaluate(() => window.api.transcript.acceptDisclosure('deepgram'));
  const req = await cmd('transcript.request', {});
  expect(req.ok, JSON.stringify(req)).toBe(true);
  await page.waitForFunction(() => (window as unknown as W).__test.state().project.transcriptJob.state === 'done', undefined, { timeout: 60_000 });
  expect((await project()).transcript?.words).toHaveLength(11);

  await requestProposal(['filler', 'silence', 'filler', 'filler']);
  await expect(page.locator('[data-testid="item-blocked"]')).toHaveCount(0);
  expect(await styleState()).toMatchObject({ pinned: { styleId: STYLE_ID, version: 1 }, current: 1, latest: 1, pendingUpdates: [] });
});

test('Q7-1: تغيير «أقل صمت يُحذف» من لوحة النمط → إصدار v2 بسبب user مثبّت على المشروع، وإعادة المقترح تُسقط بند الصمت', async () => {
  await nav('style');
  await expect(page.locator('[data-testid="style-panel"]')).toBeVisible();
  await expect(page.locator('[data-testid="style-pinned"]')).toHaveAttribute('data-version', '1');
  const rows = page.locator('[data-testid="style-version"]');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toHaveAttribute('data-reason', 'default');
  await expect(rows.first()).toHaveAttribute('data-current', 'true');

  const silence = field('cut.silenceMaxUs');
  await expect(silence).toContainText('أقل صمت يُحذف');
  await expect(silence.locator('[data-testid="style-input"]')).toHaveValue('700'); // µs → ms
  await expect(silence.locator('[data-testid="style-source"]')).toHaveAttribute('data-kind', 'default');
  await expect(silence.locator('[data-testid="style-source"]')).toContainText('افتراضي');
  await expect(field('cut.protectSentenceEdgesUs')).toContainText('احتفظ قبل/بعد الكلام');
  await expect(field('cut.fillerWords').locator('[data-testid="style-word"]')).toHaveCount(9);
  await expect(field('captions.fontFamily').locator('select')).toHaveValue('IBM Plex Sans Arabic');

  await setFieldViaPanel('cut.silenceMaxUs', '1000');
  await expect(page.locator('[data-testid="style-status"]')).toHaveText('غيّر silenceMaxUs في النمط (الإصدار 2)');
  await expect(page.locator('[data-testid="style-pinned"]')).toHaveAttribute('data-version', '2');
  await expect(silence.locator('[data-testid="style-source"]')).toHaveAttribute('data-kind', 'user');
  await expect(silence.locator('[data-testid="style-source"]')).toContainText('أنت');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(1)).toHaveAttribute('data-version', '2');
  await expect(rows.nth(1)).toHaveAttribute('data-reason', 'user');
  await expect(rows.nth(1)).toHaveAttribute('data-current', 'true');
  await expect(rows.nth(1)).toContainText('تعديل يدوي');
  await expect(rows.nth(0).locator('[data-testid="style-rollback"]')).toBeVisible();

  // المكتبة على القرص: ملف v2 جديد، v1 كما هو (الإصدارات لا تُعدَّل في مكانها)
  await expect.poll(() => versions().then((v) => v.map((x) => [x.version, x.reason]))).toEqual([
    [1, 'default'],
    [2, 'user'],
  ]);
  const v2 = await loadVersion(2);
  expect(v2.cut.silenceMaxUs).toMatchObject({ value: 1_000_000, mode: 'preference', source: { kind: 'user' } });
  expect(v2.basedOn).toEqual({ styleId: STYLE_ID, version: 1 });
  expect((await loadVersion(1)).cut.silenceMaxUs.value).toBe(700_000);
  expect((await project()).style).toEqual({ styleId: STYLE_ID, version: 2 });

  // فجوة 900 ms لم تعد تتجاوز العتبة
  await requestProposal(['filler', 'filler', 'filler']);

  // نعيدها 700 من اللوحة نفسها (v3) ليعود بند الصمت للسيناريو التالي
  await nav('style');
  await setFieldViaPanel('cut.silenceMaxUs', '700');
  await expect(page.locator('[data-testid="style-pinned"]')).toHaveAttribute('data-version', '3');
  await requestProposal(['filler', 'silence', 'filler', 'filler']);
});

test('Q7-3: استثناء 3 بنود حشو ثم الموافقة → اقتراح تحديث بالاقتباسات الثلاثة والفرق؛ الرفض لا يغيّر النمط (SC-007)', async () => {
  const doc = await excludeFillersAndApply();
  expect(clipsOf(doc)).toEqual([
    [0, 45, 0],
    [65, 150, 45],
  ]); // قُصّ الصمت [1.52s, 2.18s) وحده
  expect(doc.corrections.filter((c) => c.kind === 'exclude_item' && c.reason === 'filler')).toHaveLength(3);
  expect(doc.styleUpdateProposals).toHaveLength(1);
  expect(doc.styleUpdateProposals[0]).toMatchObject({ state: 'pending', styleRef: { styleId: STYLE_ID, version: 3 }, trigger: { kind: 'repeated_rejection', reason: 'filler', count: 3 } });
  expect(doc.style.version).toBe(3); // لا تغيير بلا قبول

  await expect(page.locator('[data-testid="style-update-badge"]')).toHaveText('1');
  await nav('styleUpdate');
  const card = page.locator('[data-testid="style-update"]');
  await expect(card).toHaveCount(1);
  await expect(card).toHaveAttribute('data-reason', 'filler');
  await expect(card).toContainText('استثنيت 3 بنود بسبب «حشو»');
  const quotes = card.locator('[data-testid="style-update-quote"]');
  await expect(quotes).toHaveCount(3);
  for (let i = 0; i < 3; i++) await expect(quotes.nth(i)).toHaveText('«يعني»');
  const diff = card.locator('[data-testid="style-update-diff"]');
  await expect(diff).toHaveCount(1);
  await expect(diff).toHaveAttribute('data-path', 'cut.fillerWords');
  await expect(diff).toContainText('كلمات الحشو');
  await expect(diff.locator('[data-testid="diff-from"]')).toContainText('يعني');
  await expect(diff.locator('[data-testid="diff-to"]')).not.toContainText('يعني');
  await expect(diff.locator('[data-testid="diff-to"]')).toContainText('امم');
  const precedents = card.locator('[data-testid="style-update-precedent"]');
  await expect(precedents).toHaveCount(3);
  await expect(precedents.first()).toContainText('لا تعتبر «يعني» حشواً');
  await expect(precedents.first()).toContainText('سؤال الفحص:');

  // الرفض: الاقتراح rejected ولا إصدار جديد ولا تغيير في التثبيت
  await card.locator('[data-testid="style-update-reject"]').click();
  await expect(page.locator('[data-testid="style-update-status"]')).toHaveText('رفض تحديث النمط');
  await expect(card).toHaveCount(0);
  await expect(page.locator('[data-testid="style-update-past"]')).toHaveAttribute('data-state', 'rejected');
  await expect(page.locator('[data-testid="style-update-badge"]')).toHaveCount(0);
  const after = await project();
  expect(after.style.version).toBe(3);
  expect(after.styleUpdateProposals[0]).toMatchObject({ state: 'rejected' });
  expect(after.styleUpdateProposals[0]!.decidedAt).toBeTruthy();
  expect((await versions()).map((v) => v.version)).toEqual([1, 2, 3]);
  expect((await loadVersion(3)).cut.fillerWords.value).toContain('يعني');
});

test('Q7-3 تابع: إعادة الاستثناء ثلاثاً ثم القبول (تأكيد) → إصدار learned بسوابقه في ملف المكتبة والمشروع مثبّت عليه', async () => {
  // التصحيحات الثلاثة الأولى استُهلكت في الاقتراح المرفوض؛ ثلاثة جديدة تطلق اقتراحاً جديداً
  await requestProposal(['filler', 'silence', 'filler', 'filler']);
  const doc = await excludeFillersAndApply();
  expect(doc.styleUpdateProposals).toHaveLength(2);
  expect(doc.styleUpdateProposals[1]).toMatchObject({ state: 'pending', trigger: { reason: 'filler', count: 3 } });
  expect(doc.styleUpdateProposals[1]!.trigger.correctionIds).not.toEqual(doc.styleUpdateProposals[0]!.trigger.correctionIds);
  expect(clipsOf(doc)).toEqual([
    [0, 45, 0],
    [65, 150, 45],
  ]); // الصمت مقصوص أصلاً — لا تغيير

  await nav('styleUpdate');
  const card = page.locator('[data-testid="style-update"]');
  await expect(card).toHaveCount(1);
  await card.locator('[data-testid="style-update-accept"]').click();
  await expect(confirmDialog()).toBeVisible();
  expect((await project()).style.version).toBe(3); // لا شيء قبل التأكيد
  await confirmDialog().click();
  await expect(page.locator('[data-testid="style-update-status"]')).toHaveText('قبل تحديث النمط (الإصدار 4)');
  await expect(card).toHaveCount(0);
  await expect(page.locator('[data-testid="style-update-past"]').first()).toHaveAttribute('data-state', 'accepted');

  const after = await project();
  expect(after.style).toEqual({ styleId: STYLE_ID, version: 4 });
  expect(after.styleUpdateProposals.map((p) => p.state)).toEqual(['rejected', 'accepted']);
  await expect.poll(() => versions().then((v) => v.map((x) => [x.version, x.reason]))).toEqual([
    [1, 'default'],
    [2, 'user'],
    [3, 'user'],
    [4, 'learned'],
  ]);
  const learned = await loadVersion(4);
  expect(learned.reason).toBe('learned');
  expect(learned.basedOn).toEqual({ styleId: STYLE_ID, version: 3 });
  expect(learned.basedOnCorrections).toEqual(after.styleUpdateProposals[1]!.trigger.correctionIds);
  expect(learned.cut.fillerWords.value).not.toContain('يعني');
  expect(learned.cut.fillerWords.source).toMatchObject({ kind: 'learned', ref: after.styleUpdateProposals[1]!.id });
  expect(learned.precedents).toHaveLength(3);
  for (const p of learned.precedents) {
    expect(p).toMatchObject({ ruleId: 'cut.fillerWords', quote: 'يعني', addedInVersion: 4, source: { kind: 'learned' } });
    expect(p.rule).toContain('يعني');
    expect(p.check.length).toBeGreaterThan(0);
  }

  // لوحة النمط تعكس الإصدار المتعلَّم: شارة «متعلَّم» على كلمات الحشو وصف learned في السجل
  await nav('style');
  await expect(page.locator('[data-testid="style-pinned"]')).toHaveAttribute('data-version', '4');
  await expect(field('cut.fillerWords').locator('[data-testid="style-source"]')).toHaveAttribute('data-kind', 'learned');
  await expect(field('cut.fillerWords').locator('[data-testid="style-word"]')).toHaveCount(7); // سقطت «يعني» و«يعنى» (نفس التطبيع)
  const v4row = page.locator('[data-testid="style-version"][data-version="4"]');
  await expect(v4row).toHaveAttribute('data-reason', 'learned');
  await expect(v4row).toHaveAttribute('data-current', 'true');
  await expect(v4row).toContainText('متعلَّم من تصحيحاتك');
  // بالنمط المتعلَّم «يعني» لم تعد حشواً
  await requestProposal(['silence']);
});

test('Q7-5: مشروع ثانٍ يرفع المكتبة ← فتح الأول يعرض إشعار «إصدار أحدث» بلا تغيير تلقائي؛ الترقية (تأكيد) تثبّت وتلغي المقترح المفتوح؛ «رجوع» ينشئ إصداراً بمحتوى القديم', async () => {
  // المشروع الأول يبقى على مقترح مفتوح (draft) ليُلغى عند الترقية
  expect((await project()).proposals.at(-1)?.state).toBe('draft');
  await expect(page.locator('[data-testid="style-upgrade-notice"]')).toHaveCount(0);

  // المشروع الثاني يثبّت أحدث إصدار (v4) ثم يرفع المكتبة إلى v5
  const r = await page.evaluate((p) => window.__test!.importPath(p), fixture('tiny-noaudio-5s.mp4'));
  expect(r.ok, JSON.stringify(r)).toBe(true);
  await expect(page.locator('[data-testid="timeline"]')).toBeVisible();
  expect((await project()).style.version).toBe(4);
  const set = await cmd('style.setField', { path: 'cut.minClipUs', value: 600_000 });
  expect(set.ok, JSON.stringify(set)).toBe(true);
  expect((await project()).style.version).toBe(5);
  await expect(page.locator('[data-testid="style-upgrade-notice"]')).toHaveCount(0); // هو على الأحدث

  // فتح الأول: مثبّت على v4 والمكتبة عند v5 → إشعار فقط
  await page.evaluate((id) => (window as unknown as W).__test.loadProject(id), projectA);
  await expect(page.locator('[data-testid="timeline"]')).toBeVisible();
  const notice = page.locator('[data-testid="style-upgrade-notice"]');
  await expect(notice).toBeVisible();
  await expect(notice).toHaveAttribute('data-latest', '5');
  await expect(notice).toHaveAttribute('data-current', '4');
  await expect(notice).toContainText('إصدار أحدث من النمط متاح (v5)');
  let doc = await project();
  expect(doc.style.version).toBe(4);
  expect(doc.proposals.at(-1)?.state).toBe('draft');
  expect(await styleState()).toMatchObject({ pinned: { version: 4 }, current: 4, latest: 5 });

  // الترقية بتأكيد: التثبيت v5، المقترح المفتوح discarded، لا إصدار جديد
  await notice.locator('[data-testid="style-upgrade"]').click();
  await expect(confirmDialog()).toBeVisible();
  expect((await project()).style.version).toBe(4);
  await confirmDialog().click();
  await expect(notice).toHaveCount(0);
  doc = await project();
  expect(doc.style).toEqual({ styleId: STYLE_ID, version: 5 });
  expect(doc.proposals.at(-1)?.state).toBe('discarded');
  expect((await versions()).map((v) => v.version)).toEqual([1, 2, 3, 4, 5]);
  // والترقية أمر واحد قابل للتراجع
  expect((await cmd('history.undo', {})).ok).toBe(true);
  doc = await project();
  expect(doc.style.version).toBe(4);
  expect(doc.proposals.at(-1)?.state).toBe('draft');
  await expect(notice).toBeVisible();
  expect((await cmd('history.redo', {})).ok).toBe(true);
  expect((await project()).style.version).toBe(5);
  await expect(notice).toHaveCount(0);

  // الرجوع إلى v1 من سجل الإصدارات: إصدار v6 بمحتوى v1 («يعني» حشو من جديد، بلا سوابق)؛ v1..v5 تبقى
  await nav('style');
  const rows = page.locator('[data-testid="style-version"]');
  await expect(rows).toHaveCount(5);
  await rows.nth(0).locator('[data-testid="style-rollback"]').click();
  await expect(confirmDialog()).toBeVisible();
  await confirmDialog().click();
  await expect(page.locator('[data-testid="style-status"]')).toHaveText('رجع النمط إلى محتوى الإصدار 1 (الإصدار 6)');
  await expect(rows).toHaveCount(6);
  const v6row = page.locator('[data-testid="style-version"][data-version="6"]');
  await expect(v6row).toHaveAttribute('data-reason', 'rollback to v1');
  await expect(v6row).toHaveAttribute('data-current', 'true');
  await expect(v6row).toContainText('رجوع إلى الإصدار v1');
  const v6 = await loadVersion(6);
  expect(v6.basedOn).toEqual({ styleId: STYLE_ID, version: 1 });
  expect(v6.cut.fillerWords.value).toContain('يعني');
  expect(v6.cut.minClipUs.value).toBe(500_000);
  expect(v6.precedents).toEqual([]);
  expect((await project()).style.version).toBe(6);
  expect((await loadVersion(4)).precedents).toHaveLength(3); // التاريخ لا يُحذف
});

test('Q7-2: قاعدة إلزامية («أقل طول للقطة» 2 ثوانٍ) تحظر البنود وتعرض السبب؛ تحويلها إلى تفضيل يرفع الحظر', async () => {
  const minClip = field('cut.minClipUs');
  await expect(minClip).toHaveAttribute('data-mode', 'mandatory');
  await expect(minClip.locator('[data-testid="style-mode"]')).toBeChecked();
  await setFieldViaPanel('cut.minClipUs', '2000');
  await expect(page.locator('[data-testid="style-pinned"]')).toHaveAttribute('data-version', '7');
  // صف السجل يظهر بعد كتابة الملف (أثر style-version-created)؛ قبله قد لا يكون v7 على القرص بعد
  await expect(page.locator('[data-testid="style-version"][data-version="7"]')).toBeVisible();
  expect((await loadVersion(7)).cut.minClipUs).toMatchObject({ value: 2_000_000, mode: 'mandatory' });

  await requestProposal(['filler', 'silence', 'filler', 'filler']);
  const blocked = page.locator('[data-testid="item-blocked"]');
  await expect(blocked).toHaveCount(4);
  await expect(blocked.first()).toHaveText('محظور: أقل طول للقطة');
  expect(await items().evaluateAll((els) => els.map((e) => e.getAttribute('data-state')))).toEqual(['blocked', 'blocked', 'blocked', 'blocked']);
  await expect(page.locator('[data-testid="item-exclude"]').first()).toBeDisabled();
  await expect(page.locator('[data-testid="saved-us"]')).toHaveAttribute('data-us', '0');
  const doc = await project();
  expect(doc.proposals.at(-1)!.items.every((i) => i.state === 'blocked' && i.blockedBy === 'cut.minClipUs')).toBe(true);

  // مفتاح إلزامي/تفضيل: القاعدة نفسها كتفضيل لا تحظر (FR-008/FR-009)
  await nav('style');
  // مربّع مُتحكَّم به: حالته تتبع النمط بعد تنفيذ الأمر، فننقر ثم ننتظر data-mode بدل uncheck() الذي يفحص فوراً
  await minClip.locator('[data-testid="style-mode"]').click();
  await expect(minClip).toHaveAttribute('data-mode', 'preference');
  await expect(page.locator('[data-testid="style-pinned"]')).toHaveAttribute('data-version', '8');
  await expect(page.locator('[data-testid="style-version"][data-version="8"]')).toBeVisible();
  expect((await loadVersion(8)).cut.minClipUs).toMatchObject({ value: 2_000_000, mode: 'preference' });
  await requestProposal(['filler', 'silence', 'filler', 'filler']);
  await expect(page.locator('[data-testid="item-blocked"]')).toHaveCount(0);
});
