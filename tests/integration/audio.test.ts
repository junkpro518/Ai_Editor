import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveFfmpeg } from '../../src/main/ffmpeg/paths';
import { runFfprobe } from '../../src/main/ffmpeg/process';
import { AudioError, extractUploadAudio } from '../../src/main/ffmpeg/audio';

const repo = fileURLToPath(new URL('../..', import.meta.url));
const fx = (name: string): string => join(repo, 'tests/fixtures', name);
const tmp = join(repo, 'out/test-tmp/audio');
const bins = resolveFfmpeg();

beforeAll(() => mkdirSync(tmp, { recursive: true }));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe('extractUploadAudio (T043، البحث A §استخراج الصوت)', () => {
  it('tiny-5s → WebM/Opus أحادي 16 kHz بلا بيانات وصفية، مع sha256 ومدة', async () => {
    const out = join(tmp, 'audio.webm');
    const r = await extractUploadAudio(bins, fx('tiny-5s.mp4'), out);
    expect(r.path).toBe(out);
    expect(existsSync(out)).toBe(true);
    expect(r.sha256).toBe(createHash('sha256').update(readFileSync(out)).digest('hex'));
    expect(Number.isInteger(r.durationUs)).toBe(true);
    expect(Math.abs(r.durationUs - 5_000_000)).toBeLessThanOrEqual(100_000);

    const info = JSON.parse(
      await runFfprobe(bins.ffprobe, ['-print_format', 'json', '-show_format', '-show_streams', `file:${out}`]),
    ) as { format: { format_name: string; tags?: Record<string, string> }; streams: Array<Record<string, unknown>> };
    expect(info.format.format_name).toContain('webm');
    expect(info.streams).toHaveLength(1);
    // Opus يُسجَّل في WebM بـ48 kHz دائماً بحسب مواصفته؛ الـ16 kHz معدل الإدخال للمشفّر
    expect(info.streams[0]).toMatchObject({ codec_type: 'audio', codec_name: 'opus', channels: 1 });
    // -map_metadata -1: لا يبقى إلا وسم ENCODER الذي يكتبه libwebm نفسه
    const tags = Object.keys(info.format.tags ?? {}).map((k) => k.toLowerCase());
    expect(tags.filter((k) => k !== 'encoder')).toEqual([]);
  });

  it('tiny-noaudio-5s → no_audio بلا ملف ناتج', async () => {
    const out = join(tmp, 'none.webm');
    const p = extractUploadAudio(bins, fx('tiny-noaudio-5s.mp4'), out);
    await expect(p).rejects.toBeInstanceOf(AudioError);
    await expect(p).rejects.toMatchObject({ code: 'no_audio' });
    expect(existsSync(out)).toBe(false);
  });

  it('الإلغاء عبر signal → aborted وحذف الناتج', async () => {
    const out = join(tmp, 'aborted.webm');
    const ac = new AbortController();
    ac.abort();
    await expect(extractUploadAudio(bins, fx('tiny-5s.mp4'), out, { signal: ac.signal })).rejects.toMatchObject({ code: 'aborted' });
    expect(existsSync(out)).toBe(false);
  });

  it('ملف غير موجود → extract_failed', async () => {
    await expect(extractUploadAudio(bins, join(tmp, 'missing.mp4'), join(tmp, 'x.webm'))).rejects.toMatchObject({
      code: 'extract_failed',
    });
  });
});
