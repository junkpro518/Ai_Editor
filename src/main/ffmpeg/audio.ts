import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { FfmpegError, runFfmpeg, runFfprobe } from './process';

export class AudioError extends Error {
  code: 'no_audio' | 'extract_failed';
  constructor(code: AudioError['code'], message: string) {
    super(message);
    this.name = 'AudioError';
    this.code = code;
  }
}

export interface ExtractedAudio {
  path: string;
  sha256: string;
  durationUs: number;
}

interface ProbeJson {
  streams?: Array<{ codec_type?: string }>;
  format?: { duration?: string };
}

async function probeJson(ffprobe: string, path: string, extra: string[]): Promise<ProbeJson> {
  const out = await runFfprobe(ffprobe, ['-protocol_whitelist', 'file,pipe', '-print_format', 'json', ...extra, `file:${path}`]);
  return JSON.parse(out) as ProbeJson;
}

async function sha256File(path: string): Promise<string> {
  const h = createHash('sha256');
  for await (const chunk of createReadStream(path)) h.update(chunk as Buffer);
  return h.digest('hex');
}

/**
 * الصوت للرفع فقط (البحث A §استخراج الصوت، FR-017): أحادي 16 kHz Opus/WebM 32 kbps،
 * بلا فيديو ولا ترجمات ولا بيانات وصفية — لا شيء غير الصوت يغادر الجهاز.
 */
export async function extractUploadAudio(
  bins: { ffmpeg: string; ffprobe: string },
  sourcePath: string,
  outPath: string,
  opts: { signal?: AbortSignal; onProgress?: (fraction: number) => void } = {},
): Promise<ExtractedAudio> {
  const src = resolve(sourcePath);
  const out = resolve(outPath);
  if (opts.signal?.aborted) throw new FfmpegError('aborted', 'أُلغيت العملية قبل بدئها');

  let info: ProbeJson;
  try {
    info = await probeJson(bins.ffprobe, src, ['-show_format', '-show_streams', '-select_streams', 'a:0']);
  } catch {
    throw new AudioError('extract_failed', 'لم نستطع قراءة الملف لاستخراج الصوت');
  }
  if (!info.streams?.length) throw new AudioError('no_audio', 'الملف لا يحتوي مسار صوت');
  const sourceDurationUs = Math.round(Number(info.format?.duration) * 1e6);

  await mkdir(dirname(out), { recursive: true });
  try {
    await runFfmpeg(
      bins.ffmpeg,
      [
        '-protocol_whitelist', 'file,pipe',
        '-i', `file:${src}`,
        '-map', '0:a:0', '-vn', '-sn', '-dn',
        '-ac', '1', '-ar', '16000',
        '-c:a', 'libopus', '-b:a', '32k',
        '-map_metadata', '-1',
        '-f', 'webm',
        out,
      ],
      {
        signal: opts.signal,
        outputPath: out,
        onProgress: (p) => {
          if (opts.onProgress && sourceDurationUs > 0) opts.onProgress(Math.min(1, p.outTimeUs / sourceDurationUs));
        },
      },
    );
  } catch (e) {
    if (e instanceof FfmpegError && (e.code === 'aborted' || e.code === 'timeout')) throw e;
    throw new AudioError('extract_failed', 'فشل استخراج الصوت من الملف');
  }

  const [sha256, outInfo] = await Promise.all([sha256File(out), probeJson(bins.ffprobe, out, ['-show_format'])]);
  const durationUs = Math.round(Number(outInfo.format?.duration) * 1e6);
  if (!Number.isInteger(durationUs) || durationUs <= 0) throw new AudioError('extract_failed', 'ملف الصوت الناتج بلا مدة');
  return { path: out, sha256, durationUs };
}
