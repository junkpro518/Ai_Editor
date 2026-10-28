import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createReadStream, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveFfmpeg } from '../../src/main/ffmpeg/paths';
import { runFfmpeg, runFfprobe, FfmpegError } from '../../src/main/ffmpeg/process';
import { mux, muxArgs } from '../../src/main/ffmpeg/mux';

// T050: الدمج (`-f h264 -i pipe:0 -c:v copy` + صوت مقصوص حسب EDL). لا libx264 في بناء LGPL،
// فنصنع تيار Annex-B من tiny-5s بـ `-c:v copy -bsf:v h264_mp4toannexb`.
const repo = fileURLToPath(new URL('../..', import.meta.url));
const fx = (name: string): string => join(repo, 'tests/fixtures', name);
// خارج out/test-tmp: ffmpeg.test.ts يمسحه كله في afterAll عند التشغيل المتوازي
const tmp = join(repo, 'out/test-tmp-mux');
const bins = resolveFfmpeg();
const fps = { num: 30, den: 1 };
const FRAME_US = 1_000_000 / 30;

interface StreamInfo {
  codec_type: string;
  codec_name: string;
  duration: string;
  nb_read_packets?: string;
}
async function probeStreams(path: string): Promise<StreamInfo[]> {
  const json = await runFfprobe(bins.ffprobe, [
    '-protocol_whitelist', 'file,pipe', '-print_format', 'json', '-count_packets', '-show_streams', `file:${path}`,
  ]);
  return (JSON.parse(json) as { streams: StreamInfo[] }).streams;
}

async function annexB(source: string, out: string, frames?: number): Promise<string> {
  const args = ['-protocol_whitelist', 'file,pipe', '-i', `file:${source}`, '-an', '-c:v', 'copy', '-bsf:v', 'h264_mp4toannexb'];
  if (frames) args.push('-frames:v', String(frames));
  await runFfmpeg(bins.ffmpeg, [...args, '-f', 'h264', out]);
  return out;
}

let full: string;
let short120: string;
let noAudio: string;

beforeAll(async () => {
  mkdirSync(tmp, { recursive: true });
  full = await annexB(fx('tiny-5s.mp4'), join(tmp, 'tiny-150.h264'));
  short120 = await annexB(fx('tiny-5s.mp4'), join(tmp, 'tiny-120.h264'), 120);
  noAudio = await annexB(fx('tiny-noaudio-5s.mp4'), join(tmp, 'noaudio-150.h264'));
});

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe('muxArgs', () => {
  it('مسار H.264: نسخ بلا إعادة ترميز، صوت aac مقصوص بثوانٍ من 6 منازل، بلا -shortest', () => {
    const args = muxArgs({
      outputPath: '/out/a.mp4',
      fps: { num: 30000, den: 1001 },
      hasAudio: true,
      sourcePath: '/src/a.mp4',
      edl: [
        { inUs: 0, outUs: 1_001_000 },
        { inUs: 2_002_000, outUs: 3_003_000 },
      ],
    });
    expect(args.join(' ')).toContain('-f h264 -r 30000/1001 -i pipe:0');
    expect(args).toContain('file:/src/a.mp4');
    const graph = args[args.indexOf('-filter_complex') + 1] ?? '';
    expect(graph).toBe(
      '[1:a:0]atrim=start=0.000000:end=1.001000,asetpts=PTS-STARTPTS[a0];' +
        '[1:a:0]atrim=start=2.002000:end=3.003000,asetpts=PTS-STARTPTS[a1];' +
        '[a0][a1]concat=n=2:v=0:a=1[a]',
    );
    expect(args.join(' ')).toContain('-map 0:v:0 -map [a] -c:v copy -c:a aac');
    expect(args.join(' ')).toContain('-movflags +faststart');
    expect(args).not.toContain('-shortest');
    expect(args.at(-1)).toBe('/out/a.mp4');
  });

  it('بلا صوت: -an ولا مدخل ثانٍ', () => {
    const args = muxArgs({ outputPath: '/out/a.mp4', fps, hasAudio: false, sourcePath: '/src/a.mp4', edl: [{ inUs: 0, outUs: 1e6 }] });
    expect(args).toContain('-an');
    expect(args).not.toContain('file:/src/a.mp4');
    expect(args).not.toContain('-filter_complex');
  });

  it('المسار الاحتياطي rawvideo: إطارات RGBA تُرمَّز بمشفّر FFmpeg عتادي (غير مجرَّب هنا — لا مشفّر عتادي)', () => {
    const args = muxArgs({
      outputPath: '/out/a.mp4',
      fps,
      hasAudio: false,
      sourcePath: '/src/a.mp4',
      edl: [{ inUs: 0, outUs: 1e6 }],
      raw: { width: 1920, height: 1080, encoder: 'h264_videotoolbox' },
    });
    expect(args.join(' ')).toContain('-f rawvideo -pix_fmt rgba -s 1920x1080 -r 30/1 -i pipe:0');
    expect(args.join(' ')).toContain('-c:v h264_videotoolbox -pix_fmt yuv420p -fps_mode cfr');
    expect(args).not.toContain('copy');
  });
});

describe('mux', () => {
  it('150 إطاراً Annex-B + صوت المصدر كاملاً → 150 إطاراً، 5.000 ث، صوت aac بمدة مطابقة ±إطار', async () => {
    const outputPath = join(tmp, 'full.mp4');
    const r = await mux(bins, {
      outputPath,
      fps,
      hasAudio: true,
      sourcePath: fx('tiny-5s.mp4'),
      edl: [{ inUs: 0, outUs: 5_000_000 }],
      stdin: createReadStream(full),
    });
    expect(r.code).toBe(0);
    const streams = await probeStreams(outputPath);
    const video = streams.find((s) => s.codec_type === 'video')!;
    const audio = streams.find((s) => s.codec_type === 'audio')!;
    expect(video.codec_name).toBe('h264');
    expect(Number(video.nb_read_packets)).toBe(150);
    expect(Number(video.duration)).toBeCloseTo(5, 3);
    expect(audio.codec_name).toBe('aac');
    expect(Math.abs(Number(audio.duration) - 5) * 1e6).toBeLessThanOrEqual(FRAME_US);
  });

  it('EDL من مقطعَين [0,2s) و[3s,5s) مع 120 إطاراً → فيديو 4.000 ث وصوت 4 ث ±إطار', async () => {
    const outputPath = join(tmp, 'edl.mp4');
    await mux(bins, {
      outputPath,
      fps,
      hasAudio: true,
      sourcePath: fx('tiny-5s.mp4'),
      edl: [
        { inUs: 0, outUs: 2_000_000 },
        { inUs: 3_000_000, outUs: 5_000_000 },
      ],
      stdin: createReadStream(short120),
    });
    const streams = await probeStreams(outputPath);
    const video = streams.find((s) => s.codec_type === 'video')!;
    const audio = streams.find((s) => s.codec_type === 'audio')!;
    expect(Number(video.nb_read_packets)).toBe(120);
    expect(Number(video.duration)).toBeCloseTo(4, 3);
    expect(Math.abs(Number(audio.duration) - 4) * 1e6).toBeLessThanOrEqual(FRAME_US);
  });

  it('مصدر بلا صوت → ملف بمسار فيديو فقط', async () => {
    const outputPath = join(tmp, 'noaudio.mp4');
    await mux(bins, {
      outputPath,
      fps,
      hasAudio: false,
      sourcePath: fx('tiny-noaudio-5s.mp4'),
      edl: [{ inUs: 0, outUs: 5_000_000 }],
      stdin: createReadStream(noAudio),
    });
    const streams = await probeStreams(outputPath);
    expect(streams.map((s) => s.codec_type)).toEqual(['video']);
    expect(Number(streams[0]!.nb_read_packets)).toBe(150);
  });

  it('الإلغاء يقتل ffmpeg ويحذف الملف الناقص (FR-014)', async () => {
    const outputPath = join(tmp, 'aborted.mp4');
    const ac = new AbortController();
    // مدخل لا ينتهي: ffmpeg ينتظر stdin حتى نلغي
    const { PassThrough } = await import('node:stream');
    const stdin = new PassThrough();
    const p = mux(bins, {
      outputPath,
      fps,
      hasAudio: false,
      sourcePath: fx('tiny-noaudio-5s.mp4'),
      edl: [{ inUs: 0, outUs: 5_000_000 }],
      stdin,
      signal: ac.signal,
    });
    setTimeout(() => ac.abort(), 300);
    await expect(p).rejects.toMatchObject({ code: 'aborted' });
    expect(existsSync(outputPath)).toBe(false);
    expect(FfmpegError).toBeDefined();
  });
});
