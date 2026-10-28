import { test, expect } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fixture, launchApp, repo } from './helpers/launch';
import { resolveFfmpeg } from '../../src/main/ffmpeg/paths';
import { runFfprobe } from '../../src/main/ffmpeg/process';
import type { ProjectDocument } from '../../src/core/contracts/types';

// التصدير من طرف إلى طرف (T050/T051، FR-014): استيراد tiny-5s → قصّ أول 60 إطاراً → تصدير 90 إطاراً →
// عدّ الإطارات ومدة الصوت بـffprobe (R3 الطبقة 3) + الصور المرجعية للطبقة 2. فحص PSNR/SSIM نفسه في parity (T042).
const outDir = join(repo, 'out/test-tmp');
const outPath = join(outDir, 'export-e2e.mp4');
const bins = resolveFfmpeg();

let app: ElectronApplication;
let page: Page;
let projectId = '';

interface Stream {
  codec_type: string;
  codec_name: string;
  duration: string;
  nb_read_frames?: string;
  pix_fmt?: string;
  color_range?: string;
  color_space?: string;
  color_transfer?: string;
  color_primaries?: string;
  profile?: string;
  level?: number;
}
async function probe(path: string): Promise<Stream[]> {
  const json = await runFfprobe(bins.ffprobe, ['-protocol_whitelist', 'file,pipe', '-print_format', 'json', '-count_frames', '-show_streams', `file:${path}`]);
  return (JSON.parse(json) as { streams: Stream[] }).streams;
}

test.beforeAll(async () => {
  mkdirSync(outDir, { recursive: true });
  rmSync(outPath, { force: true });
  ({ app, page } = await launchApp());
});

test.afterAll(async () => {
  await app.close();
});

test('استيراد ثم قصّ أول 60 إطاراً → لقطة واحدة 90 إطاراً', async () => {
  const imported = await page.evaluate((p) => window.__test!.importPath(p), fixture('tiny-5s.mp4'));
  expect(imported.ok, JSON.stringify(imported)).toBe(true);
  projectId = (imported as { projectId: string }).projectId;
  await expect(page.locator('[data-testid="timeline"]')).toBeVisible();

  const clipId = (await project()).timeline.clips[0]!.id;
  const split = await page.evaluate(([id]) => window.__test!.run!('clip.split', { clipId: id!, atFrame: 60 }), [clipId]);
  expect(split.ok, JSON.stringify(split)).toBe(true);
  const first = (await project()).timeline.clips[0]!;
  expect(first).toMatchObject({ inFrame: 0, outFrame: 60 });

  // clip.delete أمر الوكيل J؛ إن كان ما زال هيكلاً نسلك مسار الاستئناف الحقيقي: حفظ المستند ثم إعادة تحميله
  const deleted = await page.evaluate(([id]) => window.__test!.run!('clip.delete', { clipId: id! }), [first.id]);
  if (!deleted.ok && deleted.code === 'not_implemented') {
    console.log('clip.delete غير منفَّذ بعد — نحفظ مستنداً بلقطة واحدة [60,150) ونعيد تحميله');
    const doc = await project();
    const second = doc.timeline.clips[1]!;
    const single: ProjectDocument = { ...doc, timeline: { clips: [{ ...second, timelineStartFrame: 0 }] } };
    await page.evaluate((d) => window.api.project.save(d), single);
    await page.evaluate((id) => window.__test!.loadProject!(id), projectId);
  } else {
    console.log('clip.delete عبر الأمر الحقيقي');
    expect(deleted.ok, JSON.stringify(deleted)).toBe(true);
  }
  const clips = (await project()).timeline.clips;
  expect(clips).toHaveLength(1);
  expect(clips[0]).toMatchObject({ inFrame: 60, outFrame: 150, timelineStartFrame: 0 });
});

test('التصدير يعطي 90 إطاراً ±1 وصوتاً مطابقاً و20 صورة مرجعية', async () => {
  test.setTimeout(240_000);
  const support = await page.evaluate(async () => {
    if (typeof VideoEncoder === 'undefined') return { available: false, hardware: false, software: false };
    const cfg = { codec: 'avc1.64001f', width: 320, height: 180, framerate: 30, bitrate: 1_000_000, avc: { format: 'annexb' as const } };
    const hw = await VideoEncoder.isConfigSupported({ ...cfg, hardwareAcceleration: 'prefer-hardware' });
    const sw = await VideoEncoder.isConfigSupported({ ...cfg, hardwareAcceleration: 'no-preference' });
    return { available: true, hardware: hw.supported === true, software: sw.supported === true };
  });
  console.log('WebCodecs VideoEncoder:', JSON.stringify(support));
  test.skip(!support.available || (!support.hardware && !support.software), 'encoder_unavailable: لا مشفّر H.264 في Electron هذا');

  const r = await page.evaluate((p) => window.__test!.exportMp4!(p), outPath);
  expect(r.ok, JSON.stringify(r)).toBe(true);
  if (!r.ok) return;
  const { result } = r;
  const fps = (90 * 1000) / result.encodeMs;
  console.log(
    `export: ${result.frames} frames encoded in ${Math.round(result.encodeMs)} ms = ${fps.toFixed(1)} fps (${(fps / 30).toFixed(2)}x realtime); total with parity ${Math.round(result.elapsedMs)} ms; encoder=${result.encoder}, ${result.bytes} bytes`,
  );
  expect(result.encoder).toBe(support.hardware ? 'hardware' : 'software');
  expect(result.path).toBe(outPath);
  expect(Math.abs(result.frames - 90)).toBeLessThanOrEqual(1);
  expect(Math.abs(result.durationUs - 3_000_000)).toBeLessThanOrEqual(33_334);
  expect(result.parityCheck.frames).toMatchObject({ expected: 90, ok: true });
  expect(result.parityCheck.audio?.ok).toBe(true);
  console.log(`parity: status=${result.parityCheck.status} psnrMedian=${result.parityCheck.psnrMedian.toFixed(2)} ssimMedian=${result.parityCheck.ssimMedian.toFixed(3)} failures=${JSON.stringify(result.parityCheck.failures)}`);
  expect(result.parityCheck.status).toBe('ok');
  expect(result.parityCheck.psnrMedian).toBeGreaterThanOrEqual(result.parityCheck.thresholds.psnrDb);
  expect(existsSync(join(result.parityCheck.reportDir, 'report.json'))).toBe(true);

  // R3 الطبقة 3 من خارج التطبيق: -count_frames الدقيق ومدة الصوت
  const streams = await probe(outPath);
  const video = streams.find((s) => s.codec_type === 'video')!;
  const audio = streams.find((s) => s.codec_type === 'audio')!;
  console.log('muxed video stream:', JSON.stringify({ codec: video.codec_name, profile: video.profile, level: video.level, pix_fmt: video.pix_fmt, color_range: video.color_range, color_space: video.color_space, color_transfer: video.color_transfer, color_primaries: video.color_primaries }));
  expect(video.codec_name).toBe('h264');
  expect(Math.abs(Number(video.nb_read_frames) - 90)).toBeLessThanOrEqual(1);
  expect(Number(video.duration)).toBeCloseTo(3, 2);
  expect(audio.codec_name).toBe('aac');
  expect(Math.abs(Number(audio.duration) - 3) * 1e6).toBeLessThanOrEqual(1e6 / 30);

  // الصور المرجعية (الطبقة 2) عند 20 فهرساً مبذوراً من seed المشروع
  const refs = readdirSync(result.referenceDir).filter((f) => /^ref-\d{5}\.png$/.test(f));
  expect(refs).toHaveLength(20);

  // الشاشة: الحكم ظاهر ولا يُعرض «نجح» إلا بحالة ok
  await page.locator('.nav button[data-screen="export"]').click();
  const verdict = page.locator('[data-testid="export-verdict"]');
  await expect(verdict).toBeVisible();
  await expect(verdict).toHaveAttribute('data-status', result.parityCheck.status);
  await expect(verdict).toContainText('90 / 90');
  await expect(page.locator('[data-testid="export-path"]')).toContainText('tiny-5s-edited.mp4');
});

test('الإلغاء يترك الحالة cancelled ولا يُبقي ملفاً', async () => {
  const cancelled = join(outDir, 'export-e2e-cancelled.mp4');
  rmSync(cancelled, { force: true });
  const state = await page.evaluate(async (p) => {
    const t = window.__test!;
    const done = t.exportMp4!(p);
    t.exportCancel!();
    await done;
    return t.exportState!();
  }, cancelled);
  expect(state.phase).toBe('cancelled');
  expect(existsSync(cancelled)).toBe(false);
  await expect(page.locator('[data-testid="export-cancelled"]')).toBeVisible();
});

test('مسار غير .mp4 يُرفض من الأمر النقي قبل أي ترميز', async () => {
  const r = await page.evaluate((p) => window.__test!.exportMp4!(p), join(outDir, 'bad.mov'));
  expect(r.ok).toBe(false);
  expect(!r.ok && r.code).toBe('invalid_output_path');
});

async function project(): Promise<ProjectDocument> {
  return page.evaluate(() => (window.__test!.state() as { project: ProjectDocument }).project);
}
