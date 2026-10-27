// T032 — تجربة التصدير الأولية (S10 جزئياً هنا، S9 على ماك): أول دقيقتين من synthetic-15min-1080p
// decode (مشغّل التطبيق) → composeFrame (preview.ts) → VideoEncoder (Annex-B) → stdin لـFFmpeg `-f h264 -i pipe:0 -c:v copy -c:a aac`
// ثم PSNR/SSIM بين الإطار المركّب (PNG مرجعي) والإطار المفكوك من MP4 الناتج عند 20 فهرساً ببذرة، مع فحص ±1 إطار (R3 الطبقة 2).
import { once } from 'node:events';
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { PassThrough } from 'node:stream';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';
import { resolveFfmpeg } from '../../src/main/ffmpeg/paths';
import type { FfmpegBins } from '../../src/main/ffmpeg/paths';
import { runFfmpeg, runFfprobe } from '../../src/main/ffmpeg/process';
import { fixture, launchApp, repo } from '../../tests/e2e/helpers/launch';
import { decodeComposeLoop, encodeLoop, importAndMount, probeEncoders, pullChunks } from './probes';
import type { EncodeLoopResult } from './probes';

export interface ExportSpikeOptions {
  page: Page;
  bins: FfmpegBins;
  projectId: string;
  sourcePath: string;
  fps: { num: number; den: number };
  /** [from, to) على شبكة المشروع */
  from: number;
  to: number;
  outDir: string;
  /** إعداد المشفّر؛ إن غاب نختار أول إعداد مدعوم من S5 */
  encoderConfig?: VideoEncoderConfig;
}

export interface FrameCompare {
  frame: number;
  /** PSNR (dB، متوسط RGB؛ 99 = تطابق تام) مقابل الإطارات المفكوكة frame−1 / frame / frame+1 */
  psnr: { prev: number; same: number; next: number };
  ssim: { prev: number; same: number; next: number };
  /** أفضل تطابق هو الإطار نفسه (لا إزاحة) */
  aligned: boolean;
}

export interface ExportSpikeResult {
  decodeCompose: { frames: number; ms: number; fps: number; xRealtime: number };
  encoder: { config: VideoEncoderConfig | null; supported: boolean };
  pipeline: (Omit<EncodeLoopResult, 'refs'> & { fps: number; xRealtime: number }) | null;
  mux: { ms: number; outputPath: string; bytes: number; countedFrames: number; expectedFrames: number; durationSec: number } | null;
  parity: { indices: number[]; perFrame: FrameCompare[]; psnrMedian: number; ssimMedian: number; proposedPsnrGateDb: number; allAligned: boolean } | null;
  notes: string[];
}

const SEED = 20261028;

/** 20 فهرساً فريداً ببذرة ثابتة (LCG) داخل (from, to−1) حتى يوجد ±1 — نفس الفهارس على ماك. */
export function seededIndices(from: number, to: number, count = 20, seed = SEED): number[] {
  const picked = new Set<number>();
  let x = seed;
  const span = to - from - 2;
  while (picked.size < count) {
    x = (Math.imul(x, 1103515245) + 12345) & 0x7fffffff;
    picked.add(from + 1 + (x % span));
  }
  return [...picked].sort((a, b) => a - b);
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

/** يسحب كتل Annex-B من الصفحة إلى stdin لـFFmpeg حتى تنتهي حلقة الترميز. */
async function pump(page: Page, stdin: PassThrough): Promise<string | undefined> {
  for (;;) {
    const r = await page.evaluate(pullChunks);
    if (r.data.byteLength > 0 && !stdin.write(Buffer.from(r.data))) await once(stdin, 'drain');
    if (r.done) {
      stdin.end();
      return r.error;
    }
    if (r.data.byteLength === 0) await sleep(100);
  }
}

/** PSNR/SSIM (rgb24) لإطار مرجعي PNG مقابل 3 إطارات مفكوكة من MP4 بدءاً من n−1 (بحث -ss على المدخل). */
async function compare(bins: FfmpegBins, mp4: string, refPng: string, n: number, fps: { num: number; den: number }, tmpDir: string): Promise<FrameCompare> {
  const psnrFile = join(tmpDir, `psnr-${n}.txt`);
  const ssimFile = join(tmpDir, `ssim-${n}.txt`);
  const ss = (((n - 1) * fps.den) / fps.num).toFixed(6);
  const rate = `${fps.num}/${fps.den}`;
  await runFfmpeg(bins.ffmpeg, [
    '-protocol_whitelist', 'file,pipe',
    '-ss', ss, '-i', `file:${mp4}`,
    '-protocol_whitelist', 'file,pipe',
    '-loop', '1', '-framerate', rate, '-i', `file:${refPng}`,
    '-filter_complex',
    `[0:v]format=rgb24,split=2[a1][a2];[1:v]format=rgb24,split=2[b1][b2];[a1][b1]psnr=stats_file=${psnrFile}[o1];[a2][b2]ssim=stats_file=${ssimFile}[o2]`,
    '-map', '[o1]', '-map', '[o2]', '-frames:v', '3', '-f', 'null', '-',
  ]);
  const parse = async (file: string, key: string): Promise<number[]> => {
    const text = await readFile(file, 'utf8');
    const out: number[] = [];
    for (const line of text.split('\n')) {
      const m = new RegExp(`(?:^|\\s)${key}:([0-9.eE+-]+|inf)`).exec(line);
      // inf = تطابق تام؛ نسقّفه عند 99 dB حتى يبقى الوسيط والـJSON عدداً
      if (m) out.push(m[1] === 'inf' ? 99 : Number(m[1]));
    }
    return out;
  };
  const [psnr, ssim] = await Promise.all([parse(psnrFile, 'psnr_avg'), parse(ssimFile, 'All')]);
  await Promise.all([unlink(psnrFile), unlink(ssimFile)]).catch(() => undefined);
  if (psnr.length < 3 || ssim.length < 3) throw new Error(`إحصاءات ناقصة للإطار ${n}: psnr=${psnr.length} ssim=${ssim.length}`);
  const p = { prev: psnr[0]!, same: psnr[1]!, next: psnr[2]! };
  const s = { prev: ssim[0]!, same: ssim[1]!, next: ssim[2]! };
  return { frame: n, psnr: p, ssim: s, aligned: p.same > p.prev && p.same > p.next };
}

export async function runExportSpike(o: ExportSpikeOptions): Promise<ExportSpikeResult> {
  const notes: string[] = [];
  await mkdir(o.outDir, { recursive: true });
  const seconds = ((o.to - o.from) * o.fps.den) / o.fps.num;

  // 1) رجل الفك + التركيب وحده
  const dc = await o.page.evaluate(decodeComposeLoop, { projectId: o.projectId, from: o.from, to: o.to });
  const decodeCompose = { ...dc, fps: (dc.frames * 1000) / dc.ms, xRealtime: (seconds * 1000) / dc.ms };

  // 2) اختيار المشفّر (S5 داخل نفس الصفحة)
  const base: VideoEncoderConfig = { codec: 'avc1.640028', width: 1920, height: 1080, bitrate: 8_000_000, framerate: o.fps.num / o.fps.den, avc: { format: 'annexb' }, latencyMode: 'quality' };
  let config: VideoEncoderConfig | null = o.encoderConfig ?? null;
  if (!config) {
    const prefs: HardwareAcceleration[] = ['prefer-hardware', 'no-preference', 'prefer-software'];
    const probes = await o.page.evaluate(probeEncoders, prefs.map((hardwareAcceleration) => ({ ...base, hardwareAcceleration })));
    config = probes.find((p) => p.supported)?.request ?? null;
  }
  if (!config) {
    notes.push('لا مشفّر H.264 في Chromium هذا — رجل الترميز معلّق (المسار الاحتياطي rawvideo يحتاج مشفّر FFmpeg عتادياً: S7 على ماك)');
    return { decodeCompose, encoder: { config: null, supported: false }, pipeline: null, mux: null, parity: null, notes };
  }

  // 3) السلسلة كاملة مع الدمج بالتوازي
  const outputPath = join(o.outDir, 's10-export.mp4');
  const indices = seededIndices(o.from, o.to);
  const stdin = new PassThrough({ highWaterMark: 8 * 1024 * 1024 });
  const rate = `${o.fps.num}/${o.fps.den}`;
  const muxStart = performance.now();
  const mux = runFfmpeg(
    o.bins.ffmpeg,
    [
      '-protocol_whitelist', 'file,pipe', '-f', 'h264', '-r', rate, '-i', 'pipe:0',
      '-protocol_whitelist', 'file,pipe', '-t', seconds.toFixed(6), '-i', `file:${o.sourcePath}`,
      '-map', '0:v:0', '-map', '1:a:0?', '-c:v', 'copy', '-c:a', 'aac', '-movflags', '+faststart', '-shortest', outputPath,
    ],
    { stdin, outputPath },
  );
  const loop = o.page.evaluate(encodeLoop, { projectId: o.projectId, from: o.from, to: o.to, fps: o.fps, config, keyInterval: 60, refFrames: indices, maxQueue: 8 });
  const [enc, pumpError] = await Promise.all([loop, pump(o.page, stdin)]);
  const muxResult = await mux.catch((e: unknown) => {
    notes.push(`فشل الدمج: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  });
  const muxMs = performance.now() - muxStart;
  if (enc.error ?? pumpError) notes.push(`خطأ المشفّر: ${enc.error ?? pumpError}`);
  const { refs, ...encRest } = enc;
  const pipeline = { ...encRest, fps: (enc.frames * 1000) / enc.ms, xRealtime: (seconds * 1000) / enc.ms };
  for (const r of refs) {
    await writeFile(join(o.outDir, `s10-ref-${String(r.frame).padStart(5, '0')}.png`), Buffer.from(r.pngDataUrl.split(',')[1] ?? '', 'base64'));
  }
  if (!muxResult) return { decodeCompose, encoder: { config, supported: true }, pipeline, mux: null, parity: null, notes };

  // 4) العدّ (R3 الطبقة 3)
  const probeJson = JSON.parse(
    await runFfprobe(o.bins.ffprobe, ['-protocol_whitelist', 'file,pipe', '-print_format', 'json', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames:format=duration', `file:${outputPath}`]),
  ) as { streams?: Array<{ nb_read_frames?: string }>; format?: { duration?: string } };
  const muxInfo = {
    ms: muxMs,
    outputPath,
    bytes: (await stat(outputPath)).size,
    countedFrames: Number(probeJson.streams?.[0]?.nb_read_frames),
    expectedFrames: o.to - o.from,
    durationSec: Number(probeJson.format?.duration),
  };

  // 5) PSNR/SSIM مع ±1 (R3 الطبقة 2)
  const perFrame: FrameCompare[] = [];
  for (const n of indices) {
    const png = join(o.outDir, `s10-ref-${String(n).padStart(5, '0')}.png`);
    perFrame.push(await compare(o.bins, outputPath, png, n - o.from, o.fps, o.outDir));
  }
  const psnrMedian = median(perFrame.map((f) => f.psnr.same));
  const parity = {
    indices,
    perFrame,
    psnrMedian,
    ssimMedian: median(perFrame.map((f) => f.ssim.same)),
    proposedPsnrGateDb: psnrMedian - 3,
    allAligned: perFrame.every((f) => f.aligned),
  };
  return { decodeCompose, encoder: { config, supported: true }, pipeline, mux: muxInfo, parity, notes };
}

// تشغيل مستقل: pnpm exec tsx scripts/spike/export-spike.ts (بعد pnpm build؛ على Linux تحت xvfb-run -a)
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outDir = join(repo, 'out/spike');
  const source = fixture('synthetic-15min-1080p.mp4');
  const { app, page } = await launchApp();
  try {
    const mounted = await page.evaluate(importAndMount, { path: source, width: 1920, height: 1080 });
    if (!mounted.ok) throw new Error(`${mounted.code}: ${mounted.message}`);
    const result = await runExportSpike({ page, bins: resolveFfmpeg(), projectId: mounted.projectId, sourcePath: source, fps: { num: 30, den: 1 }, from: 0, to: 3600, outDir });
    await mkdir(outDir, { recursive: true });
    await writeFile(join(outDir, 's10.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ ...result, parity: result.parity && { ...result.parity, perFrame: undefined } }, null, 2));
  } finally {
    await app.close();
  }
}
