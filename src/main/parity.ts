// فحص التطابق بعد التصدير (FR-014، SC-002، research.md R3): الطبقة 2 (PSNR/SSIM عند أزمنة ببذرة مع ±1)،
// الطبقة 3 (عدّ الإطارات ومدة الصوت)، والطبقة 4 (ضابط مقابل المصدر، للعلم لا للبوابة).
// المنهج نفسه الذي قاس به export-spike.ts العتبة الأولية في measurements.md.
import { copyFile, mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Rational } from '../core/time';
import { frameToUs, frameToSeconds } from '../core/time';
import type { Clip } from '../core/timeline/ops';
import { timelineToSource } from '../core/timeline/ops';
import type { FfmpegBins } from './ffmpeg/paths';
import { countFramesExact } from './ffmpeg/probe';
import { runFfmpeg, runFfprobe } from './ffmpeg/process';

export interface ParityThresholds {
  psnrDb: number;
  ssim: number;
}

/** العتبة الأولية من measurements.md (الوسيط − 3 dB؛ «أولي» حتى قياس الماك). */
export const DEFAULT_THRESHOLDS: ParityThresholds = { psnrDb: 35.2, ssim: 0.85 };

export interface ReferenceFrame {
  /** فهرس إطار التايم لاين (= فهرس الإطار في الملف المصدَّر) */
  index: number;
  path: string;
}

export interface ParityInput {
  exportPath: string;
  expectedFrames: number;
  fps: Rational;
  /** الصور المرجعية التي أنتجها المصدِّر عند الفهارس ببذرة المشروع */
  referencePngs: ReferenceFrame[];
  outDir: string;
  seed?: number;
  projectDir?: string;
  /** المصدر فيه صوت ← يجب أن يكون في الناتج أيضاً */
  expectAudio?: boolean;
  thresholds?: Partial<ParityThresholds>;
  /** الضابط (R3 الطبقة 4): مقارنة إطار الناتج بإطار المصدر المقابل عبر اللقطات — يُسجَّل ولا يُحكم به */
  control?: { sourcePath: string; clips: ReadonlyArray<Clip> };
}

export interface Neighbors {
  prev: number | null;
  same: number;
  next: number | null;
}

export interface FrameCheck {
  index: number;
  psnr: Neighbors;
  ssim: Neighbors;
  /** أفضل تطابق هو الإطار نفسه لا n±1 (يكشف الإزاحة) */
  aligned: boolean;
  ok: boolean;
  referencePng: string;
  decodedPng: string;
}

export interface ParityReport {
  ok: boolean;
  /** العتبات أولية حتى قياس الماك (measurements.md) */
  provisional: true;
  createdAt: string;
  exportPath: string;
  seed?: number;
  thresholds: ParityThresholds;
  frames: { counted: number; expected: number; ok: boolean };
  audio: { videoDurationUs: number; audioDurationUs: number | null; toleranceUs: number; ok: boolean };
  perFrame: FrameCheck[];
  psnrMedian: number;
  ssimMedian: number;
  control?: Array<{ index: number; sourceFrame: number; psnr: number }>;
  failures: string[];
}

/** اتفاقية مكان الصور المرجعية التي يكتبها المصدِّر داخل cache المشروع؛ السكربت يقرأ من نفس المكان. */
export function referenceDir(projectCacheDir: string): string {
  return join(projectCacheDir, 'parity-refs');
}

export function referencePngName(index: number): string {
  return `ref-${String(index).padStart(5, '0')}.png`;
}

export async function listReferencePngs(dir: string): Promise<ReferenceFrame[]> {
  const names = await readdir(dir).catch(() => [] as string[]);
  return names
    .map((name) => ({ name, m: /^ref-(\d{5})\.png$/.exec(name) }))
    .filter((x): x is { name: string; m: RegExpExecArray } => x.m !== null)
    .map(({ name, m }) => ({ index: Number(m[1]), path: join(dir, name) }))
    .sort((a, b) => a.index - b.index);
}

const PROTO = ['-protocol_whitelist', 'file,pipe'];

const median = (xs: number[]): number => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

// inf = تطابق تام؛ نسقّفه عند 99 dB حتى يبقى عدداً في JSON
function parseStats(text: string, key: string): number[] {
  const out: number[] = [];
  const re = new RegExp(`(?:^|\\s)${key}:([0-9.eE+-]+|inf)`);
  for (const line of text.split('\n')) {
    const m = re.exec(line);
    if (m) out.push(m[1] === 'inf' ? 99 : Number(m[1]));
  }
  return out;
}

async function streamDurations(bins: FfmpegBins, path: string): Promise<{ videoUs: number; audioUs: number | null }> {
  const json = JSON.parse(
    await runFfprobe(bins.ffprobe, [...PROTO, '-print_format', 'json', '-show_entries', 'stream=codec_type,duration', `file:${path}`]),
  ) as { streams?: Array<{ codec_type?: string; duration?: string }> };
  const dur = (type: string): number | null => {
    const s = json.streams?.find((x) => x.codec_type === type);
    const v = Number(s?.duration);
    return s && Number.isFinite(v) ? Math.round(v * 1e6) : null;
  };
  return { videoUs: dur('video') ?? 0, audioUs: dur('audio') };
}

/**
 * إطار مرجعي PNG مقابل إطارات الناتج n−1..n+1 (بحث -ss على المدخل كما في الـspike)،
 * ويكتب الإطار المفكوك n إلى PNG بجانب المرجع للمراجع البشري (SC-002).
 * المرجع يمرّ أولاً بـyuv420p (صيغة الكروما التي يستعملها خط التصدير حتماً) ثم rgb24: بلا ذلك يقيس PSNR
 * تنصيف الكروما لا خطأ التصدير — كابشن 13px على 320×180 يحدّه عند ≈33 dB مهما كان المعدل (measurements.md).
 * sws_flags=area: تنصيف الكروما بمتوسط 2×2 كما يفعل Chromium (libyuv)؛ الطرفان يُرفعان إلى rgb24 بالمرشّح نفسه.
 */
async function compareFrame(
  bins: FfmpegBins,
  exportPath: string,
  ref: ReferenceFrame,
  fps: Rational,
  totalFrames: number,
  outDir: string,
): Promise<Omit<FrameCheck, 'ok'>> {
  const n = ref.index;
  const start = Math.max(0, n - 1);
  const end = Math.min(totalFrames - 1, n + 1);
  const psnrFile = join(outDir, `psnr-${n}.txt`);
  const ssimFile = join(outDir, `ssim-${n}.txt`);
  const decodedPng = join(outDir, `out-${String(n).padStart(5, '0')}.png`);
  const rate = `${fps.num}/${fps.den}`;
  await runFfmpeg(bins.ffmpeg, [
    ...PROTO, '-ss', frameToSeconds(start, fps), '-i', `file:${exportPath}`,
    ...PROTO, '-loop', '1', '-framerate', rate, '-i', `file:${ref.path}`,
    '-filter_complex',
    `sws_flags=area;[0:v]format=rgb24,split=3[a1][a2][a3];[1:v]format=yuv420p,format=rgb24,split=2[b1][b2];` +
      `[a1][b1]psnr=stats_file=${psnrFile}:shortest=1[o1];[a2][b2]ssim=stats_file=${ssimFile}:shortest=1[o2];` +
      `[a3]select=eq(n\\,${n - start})[png]`,
    '-map', '[o1]', '-map', '[o2]', '-frames:v', String(end - start + 1), '-f', 'null', '-',
    '-map', '[png]', '-frames:v', '1', '-update', '1', decodedPng,
  ]);
  const [psnr, ssim] = await Promise.all([
    readFile(psnrFile, 'utf8').then((t) => parseStats(t, 'psnr_avg')),
    readFile(ssimFile, 'utf8').then((t) => parseStats(t, 'All')),
  ]);
  await Promise.all([unlink(psnrFile), unlink(ssimFile)]).catch(() => undefined);
  const at = (xs: number[], frame: number): number | null => (frame < start || frame > end ? null : (xs[frame - start] ?? null));
  const pick = (xs: number[]): Neighbors => {
    const same = at(xs, n);
    if (same === null) throw new Error(`إحصاءات ناقصة للإطار ${n} (حصلنا على ${xs.length} قيمة)`);
    return { prev: at(xs, n - 1), same, next: at(xs, n + 1) };
  };
  const p = pick(psnr);
  const aligned = [p.prev, p.next].every((v) => v === null || p.same > v);
  const referencePng = join(outDir, referencePngName(n));
  await copyFile(ref.path, referencePng);
  return { index: n, psnr: p, ssim: pick(ssim), aligned, referencePng, decodedPng };
}

/** PSNR بين إطار المصدر المقابل وإطار الناتج n (R3 الطبقة 4؛ يكشف انزياح الألوان/المدى). */
async function controlPsnr(bins: FfmpegBins, sourcePath: string, sourceFrame: number, exportPath: string, n: number, fps: Rational, outDir: string): Promise<number> {
  const file = join(outDir, `control-${n}.txt`);
  await runFfmpeg(bins.ffmpeg, [
    ...PROTO, '-ss', frameToSeconds(n, fps), '-i', `file:${exportPath}`,
    ...PROTO, '-ss', frameToSeconds(sourceFrame, fps), '-i', `file:${sourcePath}`,
    '-filter_complex', `[0:v]format=rgb24[a];[1:v]format=rgb24[b];[a][b]psnr=stats_file=${file}:shortest=1[o]`,
    '-map', '[o]', '-frames:v', '1', '-f', 'null', '-',
  ]);
  const v = parseStats(await readFile(file, 'utf8'), 'psnr_avg')[0];
  await unlink(file).catch(() => undefined);
  if (v === undefined) throw new Error(`لا إحصاء ضابط للإطار ${n}`);
  return v;
}

export async function checkParity(bins: FfmpegBins, input: ParityInput): Promise<ParityReport> {
  const thresholds = { ...DEFAULT_THRESHOLDS, ...input.thresholds };
  await mkdir(input.outDir, { recursive: true });
  const failures: string[] = [];

  const counted = await countFramesExact(bins, input.exportPath); // العدّ الدقيق بالفكّ (T096 أبقاه لهذا الفحص)
  const framesOk = Number.isInteger(counted) && Math.abs(counted - input.expectedFrames) <= 1;
  if (!framesOk) failures.push(`عدد الإطارات ${counted} يبعد عن المتوقع ${input.expectedFrames} أكثر من إطار`);

  const toleranceUs = frameToUs(1, input.fps);
  const { videoUs, audioUs } = await streamDurations(bins, input.exportPath);
  let audioOk = true;
  if (audioUs === null) {
    if (input.expectAudio) {
      audioOk = false;
      failures.push('الناتج بلا مسار صوت والمصدر فيه صوت');
    }
  } else if (Math.abs(audioUs - videoUs) > toleranceUs) {
    audioOk = false;
    failures.push(`مدة الصوت ${audioUs}µs تبعد عن الفيديو ${videoUs}µs أكثر من إطار (${toleranceUs}µs)`);
  }

  const perFrame: FrameCheck[] = [];
  for (const ref of [...input.referencePngs].sort((a, b) => a.index - b.index)) {
    if (ref.index < 0 || ref.index >= counted) {
      failures.push(`الفهرس المرجعي ${ref.index} خارج إطارات الناتج (${counted})`);
      continue;
    }
    const c = await compareFrame(bins, input.exportPath, ref, input.fps, counted, input.outDir);
    const ok = c.aligned && c.psnr.same >= thresholds.psnrDb && c.ssim.same >= thresholds.ssim;
    if (!c.aligned) failures.push(`الإطار ${c.index}: أفضل تطابق ليس الإطار نفسه (إزاحة)`);
    if (c.psnr.same < thresholds.psnrDb) failures.push(`الإطار ${c.index}: PSNR ${c.psnr.same.toFixed(2)} < ${thresholds.psnrDb}`);
    if (c.ssim.same < thresholds.ssim) failures.push(`الإطار ${c.index}: SSIM ${c.ssim.same.toFixed(3)} < ${thresholds.ssim}`);
    perFrame.push({ ...c, ok });
  }
  if (!input.referencePngs.length) failures.push('لا صور مرجعية للمقارنة');

  let control: ParityReport['control'];
  if (input.control) {
    control = [];
    for (const f of perFrame) {
      const sourceFrame = timelineToSource(input.control.clips, f.index);
      if (sourceFrame === null) continue;
      control.push({ index: f.index, sourceFrame, psnr: await controlPsnr(bins, input.control.sourcePath, sourceFrame, input.exportPath, f.index, input.fps, input.outDir) });
    }
  }

  const report: ParityReport = {
    ok: failures.length === 0,
    provisional: true,
    createdAt: new Date().toISOString(),
    exportPath: input.exportPath,
    ...(input.seed !== undefined ? { seed: input.seed } : {}),
    thresholds,
    frames: { counted, expected: input.expectedFrames, ok: framesOk },
    audio: { videoDurationUs: videoUs, audioDurationUs: audioUs, toleranceUs, ok: audioOk },
    perFrame,
    psnrMedian: median(perFrame.map((f) => f.psnr.same)),
    ssimMedian: median(perFrame.map((f) => f.ssim.same)),
    ...(control ? { control } : {}),
    failures,
  };
  await writeFile(join(input.outDir, 'report.json'), JSON.stringify(report, null, 2));
  return report;
}
