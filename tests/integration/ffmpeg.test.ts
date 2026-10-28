import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, mkdirSync, copyFileSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveFfmpeg } from '../../src/main/ffmpeg/paths';
import { runFfmpeg, runFfprobe, FfmpegError } from '../../src/main/ffmpeg/process';
import { countFramesExact, probe, ProbeError } from '../../src/main/ffmpeg/probe';
import { detectEncoders } from '../../src/main/ffmpeg/encoders';
import { nearestStandardFps, fpsEquals } from '../../src/core/time';

const repo = fileURLToPath(new URL('../..', import.meta.url));
const fixtures = join(repo, 'tests/fixtures');
const tmp = join(repo, 'out/test-tmp/ffmpeg');
const fx = (name: string): string => join(fixtures, name);

const bins = resolveFfmpeg();

async function expectProbeError(p: Promise<unknown>, codes: string[]): Promise<void> {
  try {
    await p;
    expect.fail('توقعنا رفضاً');
  } catch (e) {
    expect(e).toBeInstanceOf(ProbeError);
    expect(codes).toContain((e as ProbeError).code);
  }
}

beforeAll(() => {
  mkdirSync(tmp, { recursive: true });
});

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe('resolveFfmpeg', () => {
  it('يجد ثنائيات linux-x64 في التطوير', () => {
    expect(bins.ffmpeg).toBe(join(repo, 'resources/ffmpeg/linux-x64/ffmpeg'));
    expect(bins.ffprobe).toBe(join(repo, 'resources/ffmpeg/linux-x64/ffprobe'));
    expect(existsSync(bins.ffmpeg)).toBe(true);
    expect(existsSync(bins.ffprobe)).toBe(true);
  });

  it('FFMPEG_DIR يتقدّم على كل شيء، وغيابه يعطي ffmpeg_missing', () => {
    const prev = process.env['FFMPEG_DIR'];
    try {
      process.env['FFMPEG_DIR'] = join(repo, 'resources/ffmpeg/linux-x64');
      expect(resolveFfmpeg().ffmpeg).toBe(bins.ffmpeg);

      process.env['FFMPEG_DIR'] = join(tmp, 'no-such-dir');
      expect(() => resolveFfmpeg()).toThrow(expect.objectContaining({ code: 'ffmpeg_missing' }));
    } finally {
      if (prev === undefined) delete process.env['FFMPEG_DIR'];
      else process.env['FFMPEG_DIR'] = prev;
    }
  });

  it('resourcesDir بلا ثنائيات → ffmpeg_missing', () => {
    expect(() => resolveFfmpeg({ resourcesDir: join(tmp, 'empty') })).toThrow(
      expect.objectContaining({ code: 'ffmpeg_missing' }),
    );
  });
});

describe('probe', () => {
  it('tiny-5s: كل حقول MediaSource', async () => {
    const r = await probe(bins, fx('tiny-5s.mp4'));
    expect(r.path).toBe(fx('tiny-5s.mp4'));
    expect(r.fileName).toBe('tiny-5s.mp4');
    expect(r.fps).toEqual({ num: 30, den: 1 });
    expect(r.sourceIsVfr).toBe(false);
    expect(r.hasAudio).toBe(true);
    expect(r.frameCount).toBe(150);
    expect(Math.abs(r.durationUs - 5_000_000)).toBeLessThanOrEqual(50_000);
    expect(Number.isInteger(r.durationUs)).toBe(true);
    expect(r.width).toBe(320);
    expect(r.height).toBe(180);
    expect(r.rotation).toBe(0);
    expect(r.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(r.fileSize).toBe(statSync(fx('tiny-5s.mp4')).size);
    expect(r.mtime).toBe(statSync(fx('tiny-5s.mp4')).mtime.toISOString());
    expect(r.container).toContain('mp4');
    expect(r.videoCodec).toBe('h264');
    expect(r.audioCodec).toBe('aac');

    const again = await probe(bins, fx('tiny-5s.mp4'));
    expect(again.hash).toBe(r.hash);
  });

  it('T096: العدّ بـ-count_packets سريع (< 2 ث لـtiny-5s) ويطابق countFramesExact', async () => {
    const t0 = performance.now();
    const r = await probe(bins, fx('tiny-5s.mp4'));
    expect(performance.now() - t0).toBeLessThan(2000);
    expect(r.frameCount).toBe(150);
    expect(await countFramesExact(bins, fx('tiny-5s.mp4'))).toBe(150);
    // VFR: الحزم = الإطارات أيضاً (H.264 داخل MP4: حزمة لكل إطار)
    const vfr = await probe(bins, fx('tiny-vfr-5s.mp4'));
    expect(vfr.frameCount).toBe(await countFramesExact(bins, fx('tiny-vfr-5s.mp4')));
  });

  it('tiny-ntsc: fps كسري 30000/1001', async () => {
    const r = await probe(bins, fx('tiny-ntsc-5s.mp4'));
    expect(r.fps).toEqual({ num: 30000, den: 1001 });
    expect(r.sourceIsVfr).toBe(false);
  });

  it('tiny-vfr: sourceIsVfr وأقرب معدل معياري للمتوسط', async () => {
    const r = await probe(bins, fx('tiny-vfr-5s.mp4'));
    expect(r.sourceIsVfr).toBe(true);
    expect(fpsEquals(r.fps, nearestStandardFps({ num: 480, den: 37 }))).toBe(true);
  });

  it('tiny-rotated: rotation=90 ويمرّ حد 1080', async () => {
    const r = await probe(bins, fx('tiny-rotated-5s.mp4'));
    expect(r.rotation).toBe(90);
    expect(Math.min(r.width, r.height)).toBe(180);
  });

  it('side data -90 (بورتريه الجوال) → 270 بنفس الاتفاقية', async () => {
    const out = join(tmp, 'rot-neg90.mp4');
    await runFfmpeg(
      bins.ffmpeg,
      ['-protocol_whitelist', 'file,pipe', '-display_rotation', '-90', '-i', `file:${fx('tiny-noaudio-5s.mp4')}`, '-c', 'copy', out],
      { outputPath: out },
    );
    const r = await probe(bins, out);
    expect(r.rotation).toBe(270);
  });

  it('tiny-noaudio: hasAudio=false', async () => {
    const r = await probe(bins, fx('tiny-noaudio-5s.mp4'));
    expect(r.hasAudio).toBe(false);
    expect(r.audioCodec).toBeUndefined();
  });

  it('long-16min: too_long قبل عدّ الإطارات (< 3 ث)', async () => {
    const t0 = performance.now();
    await expectProbeError(probe(bins, fx('long-16min.mp4')), ['too_long']);
    expect(performance.now() - t0).toBeLessThan(3000);
  });

  it('phone-4k: resolution_too_high', async () => {
    await expectProbeError(probe(bins, fx('phone-4k.mp4')), ['resolution_too_high']);
  });

  it('ملف تالف 1 بايت: unsupported_format أو no_video_stream', async () => {
    const p = join(tmp, 'garbage.bin');
    writeFileSync(p, 'x');
    await expectProbeError(probe(bins, p), ['unsupported_format', 'no_video_stream']);
  });

  it('maxFileBytes=1000 → too_large', async () => {
    await expectProbeError(probe(bins, fx('tiny-5s.mp4'), { maxFileBytes: 1000 }), ['too_large']);
  });

  it('اسم ملف فيه $(echo x) ومسافات يمرّ حرفياً بلا shell', async () => {
    const weird = join(tmp, 'a b$(echo x).mp4');
    copyFileSync(fx('tiny-5s.mp4'), weird);
    const base = await probe(bins, fx('tiny-5s.mp4'));
    const r = await probe(bins, weird);
    expect(r.fileName).toBe('a b$(echo x).mp4');
    expect(r.hash).toBe(base.hash);
    expect(existsSync(join(tmp, 'x'))).toBe(false);
  });
});

describe('runFfmpeg', () => {
  it('onProgress يستقبل outTimeUs متزايداً ويُكمل', async () => {
    const out = join(tmp, 'x.mp4');
    const seen: number[] = [];
    const res = await runFfmpeg(
      bins.ffmpeg,
      [
        '-stats_period', '0.1',
        '-protocol_whitelist', 'file,pipe',
        '-i', `file:${fx('tiny-5s.mp4')}`,
        '-c:v', 'mpeg4', '-c:a', 'aac',
        out,
      ],
      { onProgress: (p) => seen.push(p.outTimeUs), outputPath: out },
    );
    expect(res.code).toBe(0);
    expect(existsSync(out)).toBe(true);
    expect(seen.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1] as number);
    expect(seen[seen.length - 1]).toBeGreaterThan(4_000_000);
  });

  it('الإلغاء عبر AbortSignal → aborted وحذف الناتج', async () => {
    const out = join(tmp, 'aborted.mp4');
    const ac = new AbortController();
    const p = runFfmpeg(
      bins.ffmpeg,
      ['-protocol_whitelist', 'file,pipe', '-i', `file:${fx('long-16min.mp4')}`, '-c:v', 'mpeg4', '-c:a', 'aac', out],
      {
        signal: ac.signal,
        outputPath: out,
        onProgress: () => ac.abort(),
      },
    );
    await expect(p).rejects.toMatchObject({ code: 'aborted' });
    await expect(p).rejects.toBeInstanceOf(FfmpegError);
    expect(existsSync(out)).toBe(false);
  });

  it('timeoutMs → timeout وحذف الناتج', async () => {
    const out = join(tmp, 'timeout.mp4');
    const p = runFfmpeg(
      bins.ffmpeg,
      ['-protocol_whitelist', 'file,pipe', '-i', `file:${fx('long-16min.mp4')}`, '-c:v', 'mpeg4', '-c:a', 'aac', out],
      { timeoutMs: 700, outputPath: out },
    );
    await expect(p).rejects.toMatchObject({ code: 'timeout' });
    expect(existsSync(out)).toBe(false);
  });

  it('خروج غير صفري → exit مع stderr', async () => {
    const p = runFfmpeg(bins.ffmpeg, ['-i', `file:${join(tmp, 'missing.mp4')}`, '-f', 'null', '-']);
    await expect(p).rejects.toMatchObject({ code: 'exit', exitCode: expect.any(Number) });
    await expect(p).rejects.toHaveProperty('stderr', expect.stringContaining('missing.mp4'));
  });

  it('runFfprobe يرجع stdout', async () => {
    const out = await runFfprobe(bins.ffprobe, ['-print_format', 'json', '-show_format', `file:${fx('tiny-5s.mp4')}`]);
    expect(JSON.parse(out).format.format_name).toContain('mp4');
  });
});

describe('detectEncoders', () => {
  it('يرجع الإصدار وaac وقائمة h264 بشكل صحيح', async () => {
    const r = await detectEncoders(bins);
    expect(r.ffmpegVersion).toMatch(/\d/);
    expect(Date.parse(r.detectedAt)).not.toBeNaN();
    expect(r.aac).toBe(true);
    expect(Array.isArray(r.h264)).toBe(true);
    for (const e of r.h264) {
      expect(typeof e.hardware).toBe('boolean');
      expect(typeof e.works).toBe('boolean');
      if (e.hardware) expect(e.name).toMatch(/^h264_/);
      // المشفّرات البرمجية (libx264/libopenh264) لا تُعتمد (القرار 14)
      else expect(e.works).toBe(false);
      if (!e.works) expect(typeof e.error).toBe('string');
    }
  });
});
