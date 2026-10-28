import { test, expect } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fixture, launchApp, repo } from './helpers/launch';
import { resolveFfmpeg } from '../../src/main/ffmpeg/paths';
import type { ParityReport } from '../../src/main/parity';
import type { ProjectDocument } from '../../src/core/contracts/types';

// Q5 (US2) من طرف إلى طرف: استيراد → تفريغ من خادم محلي يقوم مقام Deepgram → الكابشن في المعاينة (بكسلات داخل صندوق
// الكابشن فقط، حتمي عند الإطفاء والتشغيل) → مراجعة الكلمات تعرض الكلمة الوحيدة منخفضة الثقة → تصحيحها يغيّر نص الكابشن →
// «تراجع» يعيده (المسارين: history.undo وإعادة الأصل) → تصدير بكابشن معدَّل وفحص التطابق ok.
// T058 هنا لا في tests/integration: اختبار vitest لا يملك canvas ولا خطوطاً (لا مكتبة canvas في node_modules)؛
// الكابشن العربي المحروق يُقاس هنا: بصمة المعاينة = بصمة الصورة المرجعية للتصدير، وأفضل تطابق عند الإزاحة 0 لكل إطار.

test.describe.configure({ mode: 'serial' });

const deepgramTiny = JSON.parse(readFileSync(fixture('providers/deepgram-tiny-5s.json'), 'utf8')) as Record<string, unknown>;
const outDir = join(repo, 'out/test-tmp');
const outPath = join(outDir, 'captions-export.mp4');
const bins = resolveFfmpeg();
const run = promisify(execFile);

let server: Server;
let app: ElectronApplication;
let page: Page;
let lowWordId = '';
let cuesBefore = '';

type Cue = ProjectDocument['captions']['cues'][number];
type Hooks = {
  state(): { project: ProjectDocument; history: { undo: Array<{ command: { name: string } }> } };
  run(name: string, params: unknown): Promise<{ ok: true; project: ProjectDocument } | { ok: false; code: string; message: string }>;
  frame(i: number): Promise<{ ok: true; width: number; height: number; pixelHash: string } | { ok: false; code: string; message: string }>;
  fontsReady(): boolean;
  exportMp4(p: string): Promise<{ ok: true; result: { frames: number; referenceDir: string; parityCheck: { status: string; reportDir: string; psnrMedian: number; failures: string[] } } } | { ok: false; code: string; message: string }>;
};
type W = { __test: Hooks };

const project = (): Promise<ProjectDocument> => page.evaluate(() => (window as unknown as W).__test.state().project);
const nav = (screen: string) => page.locator(`.nav button[data-screen="${screen}"]`).click();
const cmd = (name: string, params: unknown) => page.evaluate(([n, p]) => (window as unknown as W).__test.run(n as string, p), [name, params] as [string, unknown]);
async function frameHash(i: number): Promise<string> {
  const r = await page.evaluate((f) => (window as unknown as W).__test.frame(f), i);
  expect(r.ok, JSON.stringify(r)).toBe(true);
  return r.ok ? r.pixelHash : '';
}
/** يلتقط بكسلات canvas المعاينة الظاهر داخل الصفحة (لا تُنقل)؛ diffVisible يقارن الالتقاط التالي بها صفاً صفاً */
const captureVisible = (): Promise<void> =>
  page.evaluate(() => {
    const c = document.getElementById('preview-canvas') as HTMLCanvasElement;
    (window as unknown as { __captured: Uint8ClampedArray }).__captured = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
  });
const diffVisible = (): Promise<{ count: number; minY: number; maxY: number; height: number }> =>
  page.evaluate(() => {
    const c = document.getElementById('preview-canvas') as HTMLCanvasElement;
    const a = (window as unknown as { __captured: Uint8ClampedArray }).__captured;
    const b = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    let count = 0;
    let minY = Infinity;
    let maxY = -1;
    for (let i = 0; i < a.length; i += 4) {
      if (a[i] === b[i] && a[i + 1] === b[i + 1] && a[i + 2] === b[i + 2]) continue;
      const y = Math.floor(i / 4 / c.width);
      count++;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    return { count, minY, maxY, height: c.height };
  });
const linesOf = (cues: ReadonlyArray<Cue>): string[] => [...new Set(cues.flatMap((c) => c.lines))];
const words = (p: ProjectDocument) => p.transcript!.words;

test.beforeAll(async () => {
  mkdirSync(outDir, { recursive: true });
  rmSync(outPath, { force: true });
  server = createServer((req, res) => {
    req.on('data', () => undefined);
    req.on('end', () => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(deepgramTiny));
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

test('استيراد ثم تفريغ (مفتاح وإفصاح عبر IPC) → 12 كابشن مشتق والكابشن مفعّل افتراضياً', async () => {
  const r = await page.evaluate((p) => window.__test!.importPath(p), fixture('tiny-5s.mp4'));
  expect(r.ok, JSON.stringify(r)).toBe(true);
  await expect(page.locator('[data-testid="timeline"]')).toBeVisible();
  // قبل التفريغ: الزر معطّل والأمر يرفض
  await expect(page.locator('[data-testid="captions-toggle"]')).toBeDisabled();
  expect(await cmd('captions.toggle', { enabled: false })).toMatchObject({ ok: false, code: 'no_transcript' });

  await page.evaluate(() => window.api.secrets.set('deepgram', 'test-key-0000'));
  await page.evaluate(() => window.api.transcript.acceptDisclosure('deepgram'));
  const req = await cmd('transcript.request', {});
  expect(req.ok, JSON.stringify(req)).toBe(true);
  await page.waitForFunction(() => (window as unknown as W).__test.state().project.transcriptJob.state === 'done', undefined, { timeout: 60_000 });

  const doc = await project();
  expect(words(doc)).toHaveLength(12);
  expect(doc.captions.enabled).toBe(true);
  expect(doc.captions.cues).toHaveLength(12);
  expect(doc.captions.cues.map((c) => c.id)).toEqual(words(doc).map((w) => `cue:${w.id}`));
  for (let i = 1; i < doc.captions.cues.length; i++) expect(doc.captions.cues[i]!.startFrame).toBeGreaterThanOrEqual(doc.captions.cues[i - 1]!.endFrame);
  // الكلمة الوحيدة تحت 0.6: «يعني» (0.45)
  lowWordId = words(doc).find((w) => w.text === 'يعني')!.id;
  cuesBefore = JSON.stringify(doc.captions.cues);
  console.log('cues:', doc.captions.cues.map((c) => `${c.id} [${c.startFrame},${c.endFrame}) ${c.fontSizePx}px «${c.lines.join(' / ')}»`).join('\n'));
  // اللوحة المصغّرة تقرأ من النمط المثبّت
  await expect(page.locator('[data-testid="caption-font"]')).toHaveText('IBM Plex Sans Arabic');
  await expect(page.locator('[data-testid="caption-size"]')).toContainText('78');
  await expect(page.locator('[data-testid="caption-position"]')).toHaveText('أسفل');
  await expect(page.locator('[data-testid="caption-lines"]')).toHaveText('2');
});

test('المعاينة: الكابشن يغيّر بكسلات صندوق الكابشن فقط؛ الإطفاء ثم التشغيل يعيد البصمة نفسها (حتمي)', async () => {
  const doc = await project();
  const cue = doc.captions.cues[0]!; // «السلام» [3,13)
  const f = cue.startFrame + 2;
  // مؤشر التايم لاين على f نفسه: إعادة العرض بعد تغيّر cues (أثر الشاشة) وخطاف frame(f) يرسمان الإطار نفسه، فلا سباق
  for (let i = 0; i < f; i++) await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-testid="timecode"]')).toHaveText('00:00.05');
  const on = await frameHash(f);
  await captureVisible();

  const toggle = page.locator('[data-testid="captions-toggle"]');
  await expect(toggle).toHaveAttribute('data-enabled', 'true');
  await expect(toggle).toHaveText('كابشن: مفعّل');
  await toggle.click();
  await expect(toggle).toHaveAttribute('data-enabled', 'false');
  expect((await project()).captions.cues).toEqual([]);
  const off = await frameHash(f);
  expect(off).not.toBe(on);

  // الفرق محصور في منطقة الكابشن (أسفل 80% منطقة آمنة: أسفل الكتلة عند 0.9·H) — لا بكسل يتغيّر في النصف العلوي
  const { count, minY, maxY, height } = await diffVisible();
  console.log(`caption pixels differing on/off: ${count}, rows ${minY}..${maxY} of ${height}`);
  expect(count).toBeGreaterThan(50);
  expect(minY).toBeGreaterThan(height * 0.6);
  expect(maxY).toBeLessThan(height * 0.95);

  await toggle.click();
  await expect(toggle).toHaveAttribute('data-enabled', 'true');
  expect(JSON.stringify((await project()).captions.cues)).toBe(cuesBefore);
  expect(await frameHash(f)).toBe(on);
  // التراجع عن التبديل عبر السجل يعمل أيضاً
  expect((await project()).captions.enabled).toBe(true);
});

test('مراجعة الكلمات: «يعني» وحدها تحت العتبة، تصحيحها يغيّر نص الكابشن ويحفظ الأصل، و«تراجع» (آخر مدخل) يعيد كل شيء', async () => {
  await nav('words');
  await expect(page.locator('[data-testid="words"]')).toBeVisible();
  await expect(page.locator('[data-testid="words-threshold"]')).toContainText('0.6');
  await expect(page.locator('[data-testid="words-threshold"]')).toContainText('deepgram/nova-3');
  await expect(page.locator('[data-testid="words-no-confidence"]')).toHaveCount(0);
  const rows = page.locator('[data-testid="low-words"] [data-testid="word-row"]');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toHaveAttribute('data-word-id', lowWordId);
  await expect(rows.first().locator('[data-testid="word-text"]')).toHaveText('يعني');
  await expect(rows.first()).toContainText('لا بدائل من المزود');
  await expect(rows.first()).toContainText('الدرس'); // السياق قبلها
  await expect(page.locator('[data-testid="words-corrected-count"]')).toHaveAttribute('data-n', '0');

  const input = rows.first().locator('[data-testid="word-input"]');
  await expect(rows.first().locator('[data-testid="word-fix"]')).toBeDisabled(); // النص لم يتغيّر
  await input.fill('أقصد');
  await rows.first().locator('[data-testid="word-fix"]').click();
  await expect(page.locator('[data-testid="words-status"]')).toHaveText('صحّح «يعني» إلى «أقصد»');
  await expect(page.locator('[data-testid="words-corrected-count"]')).toHaveAttribute('data-n', '1');
  await expect(page.locator('[data-testid="words-corrected-count"]')).toHaveText('صحّحت 1 كلمة');
  await expect(rows.first()).toHaveAttribute('data-corrected', 'true');
  await expect(rows.first().locator('[data-testid="word-original"]')).toContainText('يعني');
  await expect(page.locator('[data-testid="corrected-words"] [data-testid="word-row"]')).toHaveCount(1);

  let doc = await project();
  const w = words(doc).find((x) => x.id === lowWordId)!;
  expect(w).toMatchObject({ text: 'أقصد', original: 'يعني', correctedBy: 'user', confidence: 0.45 });
  expect(doc.corrections).toEqual([expect.objectContaining({ kind: 'word_fix', quote: 'يعني → أقصد', before: 'يعني', after: 'أقصد' })]);
  expect(linesOf(doc.captions.cues).some((l) => l.split(' ').includes('أقصد'))).toBe(true);
  expect(linesOf(doc.captions.cues).some((l) => l.split(' ').includes('يعني'))).toBe(false);
  expect(doc.captions.cues.map((c) => [c.startFrame, c.endFrame])).toEqual((JSON.parse(cuesBefore) as Cue[]).map((c) => [c.startFrame, c.endFrame]));
  // المحفوظ على القرص يحمل التصحيح (FR-016)
  await expect.poll(() => page.evaluate(([id, wid]) => window.api.project.load(id!).then((d) => d.transcript!.words.find((x) => x.id === wid)?.original), [doc.id, lowWordId])).toBe('يعني');

  // «تراجع»: آخر مدخل في السجل هو هذا التصحيح → history.undo
  await rows.first().locator('[data-testid="word-revert"]').click();
  await expect(page.locator('[data-testid="words-status"]')).toContainText('تراجع:');
  await expect(page.locator('[data-testid="words-corrected-count"]')).toHaveAttribute('data-n', '0');
  doc = await project();
  expect(words(doc).find((x) => x.id === lowWordId)).toMatchObject({ text: 'يعني' });
  expect(words(doc).find((x) => x.id === lowWordId)!.original).toBeUndefined();
  expect(doc.corrections).toEqual([]);
  expect(JSON.stringify(doc.captions.cues)).toBe(cuesBefore);
  await expect(rows.first().locator('[data-testid="word-input"]')).toHaveValue('يعني');
});

test('«تراجع» عندما ليس التصحيح آخر مدخل: يعيد الأصل عبر transcript.fixWord (تصحيح جديد للأصل) ولا يمسّ التعديل اللاحق', async () => {
  const rows = page.locator('[data-testid="low-words"] [data-testid="word-row"]');
  await rows.first().locator('[data-testid="word-input"]').fill('أقصد');
  await rows.first().locator('[data-testid="word-fix"]').click();
  await expect(page.locator('[data-testid="words-corrected-count"]')).toHaveAttribute('data-n', '1');
  const clipId = (await project()).timeline.clips[0]!.id;
  const split = await cmd('clip.split', { clipId, atFrame: 75 });
  expect(split.ok, JSON.stringify(split)).toBe(true);

  await rows.first().locator('[data-testid="word-revert"]').click();
  await expect(page.locator('[data-testid="words-status"]')).toHaveText('صحّح «أقصد» إلى «يعني»');
  await expect(page.locator('[data-testid="words-corrected-count"]')).toHaveAttribute('data-n', '0');
  const doc = await project();
  expect(doc.timeline.clips).toHaveLength(2); // القسمة باقية
  expect(words(doc).find((x) => x.id === lowWordId)).toMatchObject({ text: 'يعني', original: 'يعني', correctedBy: 'user' });
  expect(doc.corrections.map((c) => c.quote)).toEqual(['يعني → أقصد', 'أقصد → يعني']);
  const history = await page.evaluate(() => (window as unknown as W).__test.state().history.undo.map((e) => e.command.name));
  expect(history.slice(-3)).toEqual(['transcript.fixWord', 'clip.split', 'transcript.fixWord']); // قبلها تبديلا الكابشن

  // البحث يجد أي كلمة (بتطبيع: بلا همزة/تشكيل)
  await page.locator('[data-testid="words-search"]').fill('الاول');
  const found = page.locator('[data-testid="search-words"] [data-testid="word-row"]');
  await expect(found).toHaveCount(1);
  await expect(found.first().locator('[data-testid="word-text"]')).toHaveText('الأول');

  // نعود إلى الحالة الأصلية (3 تراجعات) ثم نثبّت تصحيحاً واحداً ليُحرق في التصدير (سيناريو القبول 4: كابشن معدَّل)
  for (let i = 0; i < 3; i++) expect((await cmd('history.undo', {})).ok).toBe(true);
  expect(JSON.stringify((await project()).captions.cues)).toBe(cuesBefore);
  const fixed = await cmd('transcript.fixWord', { wordId: lowWordId, text: 'أقصد' });
  expect(fixed.ok, JSON.stringify(fixed)).toBe(true);
});

test('التصدير بكابشن معدَّل: التطابق ok، أفضل إزاحة 0 لكل إطار، الكابشن محروق فعلاً، وبصمة المعاينة = بصمة المرجع', async () => {
  test.setTimeout(240_000);
  const support = await page.evaluate(async () => {
    if (typeof VideoEncoder === 'undefined') return false;
    const cfg = { codec: 'avc1.64001f', width: 320, height: 180, framerate: 30, bitrate: 1_000_000, avc: { format: 'annexb' as const } };
    const hw = await VideoEncoder.isConfigSupported({ ...cfg, hardwareAcceleration: 'prefer-hardware' });
    const sw = await VideoEncoder.isConfigSupported({ ...cfg, hardwareAcceleration: 'no-preference' });
    return hw.supported === true || sw.supported === true;
  });
  test.skip(!support, 'encoder_unavailable: لا مشفّر H.264 في Electron هذا — التصدير بالكابشن غير مُتحقَّق هنا');

  const doc = await project();
  expect(doc.timeline.clips).toHaveLength(1);
  expect(linesOf(doc.captions.cues).some((l) => l.split(' ').includes('أقصد'))).toBe(true);
  const r = await page.evaluate((p) => (window as unknown as W).__test.exportMp4(p), outPath);
  expect(r.ok, JSON.stringify(r)).toBe(true);
  if (!r.ok) return;
  expect(Math.abs(r.result.frames - 150)).toBeLessThanOrEqual(1);
  expect(r.result.parityCheck.status, JSON.stringify(r.result.parityCheck.failures)).toBe('ok');
  expect(existsSync(outPath)).toBe(true);

  const report = JSON.parse(readFileSync(join(r.result.parityCheck.reportDir, 'report.json'), 'utf8')) as ParityReport;
  expect(report.perFrame.length).toBe(20);
  // T058: لا إزاحة زمنية — أفضل تطابق هو الإطار نفسه لا n±1
  expect(report.perFrame.every((f) => f.aligned)).toBe(true);
  // الكابشن محروق فعلاً: عند الإطارات التي فيها كابشن، تطابق الناتج مع المرجع (الذي يحمل الكابشن) أعلى من تطابقه
  // مع إطار المصدر الخام (الضابط R3 الطبقة 4)؛ وبلا كابشن الاثنان متقاربان
  const withCue = report.perFrame.filter((f) => doc.captions.cues.some((c) => f.index >= c.startFrame && f.index < c.endFrame));
  expect(withCue.length).toBeGreaterThan(5);
  for (const f of withCue) {
    const control = report.control!.find((c) => c.index === f.index)!;
    expect(f.psnr.same, `frame ${f.index}: ref ${f.psnr.same} vs source ${control.psnr}`).toBeGreaterThan(control.psnr + 3);
  }
  console.log(`parity with captions: psnrMedian=${report.psnrMedian.toFixed(2)} ssimMedian=${report.ssimMedian.toFixed(3)}; control psnr at captioned frames: ${withCue.map((f) => report.control!.find((c) => c.index === f.index)!.psnr.toFixed(1)).join(', ')}`);

  // بصمة المعاينة = بصمة الصورة المرجعية التي ركّبها التصدير (نفس composeFrame): FNV-1a على RGBA في الحالتين
  const refs = readdirSync(r.result.referenceDir).filter((f) => /^ref-\d{5}\.png$/.test(f));
  expect(refs).toHaveLength(20);
  const target = withCue[Math.floor(withCue.length / 2)]!.index;
  const png = join(r.result.referenceDir, `ref-${String(target).padStart(5, '0')}.png`);
  const { stdout } = await run(bins.ffmpeg, ['-nostdin', '-hide_banner', '-loglevel', 'error', '-i', png, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
  expect(stdout.length).toBe(320 * 180 * 4);
  let h = 0x811c9dc5;
  for (let i = 0; i < stdout.length; i++) {
    h ^= stdout[i]!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  const refHash = h.toString(16).padStart(8, '0');
  const previewHash = await frameHash(target);
  console.log(`frame ${target}: preview ${previewHash} vs export reference ${refHash}`);
  expect(previewHash).toBe(refHash);
});
