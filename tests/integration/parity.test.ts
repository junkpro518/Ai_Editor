import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveFfmpeg } from '../../src/main/ffmpeg/paths';
import { runFfmpeg } from '../../src/main/ffmpeg/process';
import { checkParity, DEFAULT_THRESHOLDS, listReferencePngs, referenceDir, referencePngName } from '../../src/main/parity';
import type { ReferenceFrame } from '../../src/main/parity';

// T042: الحساب نفسه الذي يُجرى بعد كل تصدير (FR-014) على tiny-5s: «المعاينة» = إطارات المصدر إلى PNG،
// و«التصدير» = إعادة ترميز mpeg4. مسار WebCodecs الحقيقي في tests/e2e/export.spec.ts.
const repo = fileURLToPath(new URL('../..', import.meta.url));
const source = join(repo, 'tests/fixtures/tiny-5s.mp4');
const tmp = join(repo, 'out/test-tmp/parity');
const bins = resolveFfmpeg();
const fps = { num: 30, den: 1 };
const FRAMES = 150;
const PROTO = ['-protocol_whitelist', 'file,pipe'];

/** mulberry32 — نفس اتفاقية المصدِّر (بذرة المشروع فوق [0, expectedFrames)) */
function seededIndices(seed: number, total: number, count: number): number[] {
  let a = seed >>> 0;
  const picked = new Set<number>();
  while (picked.size < count) {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    picked.add((((t ^ (t >>> 14)) >>> 0) / 4294967296 * total) | 0);
  }
  return [...picked].sort((x, y) => x - y);
}

async function sourcePng(index: number, dir: string): Promise<ReferenceFrame> {
  const path = join(dir, referencePngName(index));
  await runFfmpeg(bins.ffmpeg, [...PROTO, '-i', `file:${source}`, '-vf', `select=eq(n\\,${index})`, '-frames:v', '1', '-update', '1', path]);
  return { index, path };
}

async function encode(name: string, args: string[]): Promise<string> {
  const out = join(tmp, name);
  await runFfmpeg(bins.ffmpeg, [...PROTO, '-i', `file:${source}`, ...args, out], { outputPath: out });
  return out;
}

const refsDir = referenceDir(join(tmp, 'cache'));
let refs: ReferenceFrame[] = [];
let good = '';

beforeAll(async () => {
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(refsDir, { recursive: true });
  const indices = seededIndices(42, FRAMES, 20);
  // نضمن حافتَي الملف (n−1 أو n+1 غائب) ضمن العيّنة
  const wanted = [...new Set([0, FRAMES - 1, ...indices.filter((i) => i > 0 && i < FRAMES - 1).slice(0, 18)])].sort((a, b) => a - b);
  refs = [];
  for (const i of wanted) refs.push(await sourcePng(i, refsDir));
  good = await encode('good.mp4', ['-c:v', 'mpeg4', '-q:v', '1', '-r', '30', '-c:a', 'copy']);
}, 120_000);

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe('checkParity', () => {
  it('تصدير مطابق: العدّ 150، كل الأزمنة متوازية وفوق العتبة، الصوت ضمن إطار، تقرير وأزواج PNG', async () => {
    const outDir = join(tmp, 'report-good');
    const r = await checkParity(bins, { exportPath: good, expectedFrames: FRAMES, fps, referencePngs: refs, outDir, seed: 42, expectAudio: true });
    expect(r.failures).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.provisional).toBe(true);
    expect(r.thresholds).toEqual(DEFAULT_THRESHOLDS);
    expect(r.frames).toEqual({ counted: FRAMES, expected: FRAMES, ok: true });
    expect(r.audio.ok).toBe(true);
    expect(r.audio.audioDurationUs).not.toBeNull();
    expect(r.perFrame).toHaveLength(refs.length);
    expect(r.perFrame.map((f) => f.index)).toEqual(refs.map((f) => f.index));
    for (const f of r.perFrame) {
      expect(f.aligned, `frame ${f.index}`).toBe(true);
      expect(f.psnr.same).toBeGreaterThanOrEqual(DEFAULT_THRESHOLDS.psnrDb);
      expect(f.ssim.same).toBeGreaterThanOrEqual(DEFAULT_THRESHOLDS.ssim);
      expect(existsSync(f.referencePng)).toBe(true);
      expect(statSync(f.decodedPng).size).toBeGreaterThan(100);
    }
    // الحافتان: لا جار قبل الإطار 0 ولا بعد الأخير
    expect(r.perFrame[0]).toMatchObject({ index: 0, psnr: { prev: null } });
    expect(r.perFrame.at(-1)).toMatchObject({ index: FRAMES - 1, psnr: { next: null } });
    expect(r.perFrame[0]!.psnr.next).not.toBeNull();
    expect(existsSync(join(outDir, 'report.json'))).toBe(true);
    console.log(`parity good: PSNR median ${r.psnrMedian.toFixed(2)} dB, SSIM median ${r.ssimMedian.toFixed(3)}`);
  });

  it('إزاحة بإطار واحد تُكشف: العدّ 149 وأفضل تطابق ليس الإطار نفسه', async () => {
    const shifted = await encode('shifted.mp4', ['-vf', 'trim=start_frame=1,setpts=PTS-STARTPTS', '-c:v', 'mpeg4', '-q:v', '1', '-r', '30', '-an']);
    const sample = refs.filter((f) => f.index > 0 && f.index < FRAMES - 2).slice(0, 5);
    const r = await checkParity(bins, { exportPath: shifted, expectedFrames: FRAMES, fps, referencePngs: sample, outDir: join(tmp, 'report-shifted') });
    expect(r.ok).toBe(false);
    expect(r.frames.counted).toBe(FRAMES - 1);
    expect(r.frames.ok).toBe(true); // ±1 مسموح في العدّ وحده؛ الإزاحة تُكشف من المحاذاة
    for (const f of r.perFrame) {
      expect(f.aligned, `frame ${f.index}`).toBe(false);
      expect(f.psnr.prev).toBeGreaterThan(f.psnr.same);
    }
    expect(r.failures.some((m) => m.includes('إزاحة'))).toBe(true);
  });

  it('جودة رديئة تسقط تحت عتبة PSNR/SSIM', async () => {
    const bad = await encode('bad.mp4', ['-c:v', 'mpeg4', '-q:v', '31', '-r', '30', '-an']);
    const sample = refs.slice(0, 4);
    const r = await checkParity(bins, { exportPath: bad, expectedFrames: FRAMES, fps, referencePngs: sample, outDir: join(tmp, 'report-bad') });
    expect(r.ok).toBe(false);
    expect(r.perFrame.every((f) => !f.ok)).toBe(true);
    expect(r.failures.some((m) => m.includes('PSNR'))).toBe(true);
    // عتبات مخفَّفة تُمرَّر كمعاملات
    const lax = await checkParity(bins, { exportPath: bad, expectedFrames: FRAMES, fps, referencePngs: sample, outDir: join(tmp, 'report-lax'), thresholds: { psnrDb: 10, ssim: 0.1 } });
    expect(lax.ok).toBe(true);
  });

  it('عدد إطارات متوقع مختلف بأكثر من إطار، أو صوت مفقود مع expectAudio → فشل', async () => {
    const sample = refs.slice(1, 3);
    const r = await checkParity(bins, { exportPath: good, expectedFrames: FRAMES - 2, fps, referencePngs: sample, outDir: join(tmp, 'report-count') });
    expect(r.frames.ok).toBe(false);
    expect(r.ok).toBe(false);
    const noAudio = await encode('noaudio.mp4', ['-c:v', 'mpeg4', '-q:v', '1', '-r', '30', '-an']);
    const a = await checkParity(bins, { exportPath: noAudio, expectedFrames: FRAMES, fps, referencePngs: sample, outDir: join(tmp, 'report-noaudio'), expectAudio: true });
    expect(a.audio.audioDurationUs).toBeNull();
    expect(a.ok).toBe(false);
    const b = await checkParity(bins, { exportPath: noAudio, expectedFrames: FRAMES, fps, referencePngs: sample, outDir: join(tmp, 'report-noaudio-ok') });
    expect(b.ok).toBe(true);
  });

  it('الضابط (R3 الطبقة 4) يُسجَّل للعلم عبر خريطة اللقطات ولا يغيّر الحكم', async () => {
    const clips = [{ id: 'c', sourceId: 's', inFrame: 0, outFrame: FRAMES, timelineStartFrame: 0 }];
    const sample = refs.slice(2, 4);
    const r = await checkParity(bins, { exportPath: good, expectedFrames: FRAMES, fps, referencePngs: sample, outDir: join(tmp, 'report-control'), control: { sourcePath: source, clips } });
    expect(r.ok).toBe(true);
    expect(r.control).toHaveLength(2);
    for (const c of r.control!) expect(c.psnr).toBeGreaterThan(DEFAULT_THRESHOLDS.psnrDb);
  });

  // T058 (الجزء الذي يعمل بلا renderer): طبقة محروقة في منطقة الكابشن على المرجع والناتج معاً → ok ولا إزاحة؛
  // المرجع بالطبقة والناتج بلا طبقة → البوابة تسقط عند تلك الإطارات. الكابشن العربي الحقيقي (خطوط + canvas) في
  // tests/e2e/captions.spec.ts لأن vitest لا يملك canvas.
  it('كابشن محروق (طبقة في منطقة الكابشن): مطابق ومحاذٍ عند الإزاحة 0، وغيابه من الناتج يُكشف', async () => {
    const box = 'drawbox=x=40:y=140:w=240:h=28:color=white@1:t=fill';
    const dir = join(tmp, 'burned-refs');
    mkdirSync(dir, { recursive: true });
    const sample: ReferenceFrame[] = [];
    for (const i of refs.slice(3, 8).map((f) => f.index)) {
      const path = join(dir, referencePngName(i));
      await runFfmpeg(bins.ffmpeg, [...PROTO, '-i', `file:${source}`, '-vf', `select=eq(n\\,${i}),${box}`, '-frames:v', '1', '-update', '1', path]);
      sample.push({ index: i, path });
    }
    const burned = await encode('burned.mp4', ['-vf', box, '-c:v', 'mpeg4', '-q:v', '1', '-r', '30', '-an']);
    const ok = await checkParity(bins, { exportPath: burned, expectedFrames: FRAMES, fps, referencePngs: sample, outDir: join(tmp, 'report-burned') });
    expect(ok.failures).toEqual([]);
    expect(ok.ok).toBe(true);
    for (const f of ok.perFrame) {
      expect(f.aligned, `frame ${f.index}`).toBe(true);
      expect(f.psnr.same).toBeGreaterThanOrEqual(DEFAULT_THRESHOLDS.psnrDb);
    }
    // الناتج بلا الطبقة مقابل مرجع يحملها: الكابشن الغائب يُسقط PSNR تحت العتبة عند كل إطار
    const missing = await checkParity(bins, { exportPath: good, expectedFrames: FRAMES, fps, referencePngs: sample, outDir: join(tmp, 'report-burned-missing') });
    expect(missing.ok).toBe(false);
    expect(missing.perFrame.every((f) => f.psnr.same < DEFAULT_THRESHOLDS.psnrDb)).toBe(true);
    console.log(`burned overlay: PSNR median ${ok.psnrMedian.toFixed(2)} dB with overlay in both; ${missing.psnrMedian.toFixed(2)} dB when the export lacks it`);
  });

  it('listReferencePngs يقرأ اتفاقية ref-NNNNN.png مرتّبة', async () => {
    const listed = await listReferencePngs(refsDir);
    expect(listed).toEqual(refs);
    expect(await listReferencePngs(join(tmp, 'nope'))).toEqual([]);
  });
});
