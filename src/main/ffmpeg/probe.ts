import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import type { ProjectDocument } from '../../core/contracts/types';
import { fpsEquals, nearestStandardFps, parseRational } from '../../core/time';
import type { Rational } from '../../core/time';
import { runFfprobe } from './process';

export type ProbeResult = Omit<ProjectDocument['source'], 'id'>;

export interface ProbeLimits {
  maxDurationUs: number;
  maxFileBytes: number;
  /** الحد على الضلع الأصغر بعد الدوران: 1920×1080 و1080×1920 كلاهما يمرّ (القرار 24) */
  maxHeight: number;
}

const DEFAULT_LIMITS: ProbeLimits = {
  maxDurationUs: 900_000_000, // 15 دقيقة (FR-019)
  maxFileBytes: 8 * 1024 ** 3,
  maxHeight: 1080,
};

export class ProbeError extends Error {
  code: 'unsupported_format' | 'no_video_stream' | 'too_long' | 'too_large' | 'resolution_too_high';
  constructor(code: ProbeError['code'], message: string) {
    super(message);
    this.name = 'ProbeError';
    this.code = code;
  }
}

interface FfprobeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  r_frame_rate?: string;
  avg_frame_rate?: string;
  duration?: string;
  nb_read_frames?: string;
  nb_read_packets?: string;
  tags?: Record<string, string>;
  side_data_list?: Array<Record<string, unknown>>;
}
interface FfprobeOutput {
  streams?: FfprobeStream[];
  format?: { format_name?: string; duration?: string };
}

const HASH_BYTES = 64 * 1024 * 1024;

// sha256(أول 64MB ‖ الحجم بالعشري) — بصمة لإعادة ربط الملف إن انتقل (data-model §1.2)
async function hashFile(path: string, size: number): Promise<string> {
  const h = createHash('sha256');
  for await (const chunk of createReadStream(path, { end: HASH_BYTES - 1 })) h.update(chunk as Buffer);
  h.update(String(size));
  return h.digest('hex');
}

// الاتفاقية: rotation = قيمة side data كما يطبعها ffprobe (درجات عكس عقارب الساعة) موحّدة إلى 0/90/180/270.
// جوال بورتريه نموذجي يعطي side data -90 → 270. وسم tags.rotate القديم باتجاه الساعة فنعكسه إلى نفس الاتفاقية.
function normalizeRotation(v: FfprobeStream): number {
  let raw: unknown;
  for (const sd of v.side_data_list ?? []) if ('rotation' in sd) raw = sd['rotation'];
  if (raw === undefined && v.tags?.['rotate'] !== undefined) raw = -Number(v.tags['rotate']);
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return ((Math.round(n / 90) * 90) % 360 + 360) % 360;
}

function tryRational(s: string | undefined): Rational | null {
  if (!s) return null;
  try {
    return parseRational(s);
  } catch {
    return null;
  }
}

function probeArgs(path: string, extra: string[]): string[] {
  return ['-protocol_whitelist', 'file,pipe', ...extra, `file:${path}`];
}

/** العدّ الدقيق بفكّ كل الإطارات (-count_frames) — لفحص التطابق بعد التصدير فقط (R3 الطبقة 3)، لا للاستيراد. */
export async function countFramesExact(bins: { ffprobe: string }, filePath: string): Promise<number> {
  const json = await runFfprobe(
    bins.ffprobe,
    probeArgs(resolve(filePath), ['-print_format', 'json', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames']),
  );
  const n = Number((JSON.parse(json) as FfprobeOutput).streams?.[0]?.nb_read_frames);
  if (!Number.isInteger(n) || n < 0) throw new ProbeError('no_video_stream', 'لم نستطع عدّ إطارات الفيديو');
  return n;
}

export async function probe(bins: { ffprobe: string }, filePath: string, limits?: Partial<ProbeLimits>): Promise<ProbeResult> {
  const lim = { ...DEFAULT_LIMITS, ...limits };
  const path = resolve(filePath);
  const st = await stat(path);
  if (st.size > lim.maxFileBytes) {
    throw new ProbeError('too_large', `حجم الملف ${st.size} بايت يتجاوز الحد ${lim.maxFileBytes}`);
  }

  let info: FfprobeOutput;
  try {
    const json = await runFfprobe(
      bins.ffprobe,
      probeArgs(path, ['-print_format', 'json', '-show_format', '-show_streams', '-show_entries', 'stream_side_data=rotation']),
    );
    info = JSON.parse(json) as FfprobeOutput;
  } catch {
    throw new ProbeError('unsupported_format', 'لم نتعرّف على صيغة الملف');
  }

  const video = info.streams?.find((s) => s.codec_type === 'video');
  if (!video || !video.width || !video.height) throw new ProbeError('no_video_stream', 'الملف لا يحتوي مسار فيديو');
  const audio = info.streams?.find((s) => s.codec_type === 'audio');

  const durationSec = Number(info.format?.duration ?? video.duration);
  if (!Number.isFinite(durationSec)) throw new ProbeError('unsupported_format', 'لم نستطع قراءة مدة الملف');
  const durationUs = Math.round(durationSec * 1e6);
  if (durationUs > lim.maxDurationUs) {
    throw new ProbeError('too_long', `مدة الملف ${Math.round(durationSec / 60)} دقيقة تتجاوز حد ${lim.maxDurationUs / 60e6} دقيقة`);
  }
  if (Math.min(video.width, video.height) > lim.maxHeight) {
    throw new ProbeError('resolution_too_high', `دقة ${video.width}×${video.height} تتجاوز حد ${lim.maxHeight}p في هذه النسخة`);
  }

  // VFR: اختلاف r_frame_rate عن avg_frame_rate (R4) → أقرب معدل معياري للمتوسط (القرار 13)
  const r = tryRational(video.r_frame_rate);
  const avg = tryRational(video.avg_frame_rate);
  if (!r && !avg) throw new ProbeError('unsupported_format', 'لم نستطع قراءة معدل الإطارات');
  const sourceIsVfr = !!(r && avg && !fpsEquals(r, avg)) || !r;
  const fps = sourceIsVfr ? nearestStandardFps(avg ?? (r as Rational)) : (r as Rational);

  // العدّ بعد الحدود فقط (nb_frames غير موثوق). T096: -count_packets بلا فكّ (S8: 94 ث → 3 ث لـ15 دقيقة)؛
  // في H.264/HEVC داخل MP4 حزمة = إطار. العدّ الدقيق بالفكّ في countFramesExact لفحص التطابق بعد التصدير (T042)
  const countJson = await runFfprobe(
    bins.ffprobe,
    probeArgs(path, ['-print_format', 'json', '-count_packets', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_packets']),
  );
  const frameCount = Number((JSON.parse(countJson) as FfprobeOutput).streams?.[0]?.nb_read_packets);
  if (!Number.isInteger(frameCount) || frameCount <= 0) throw new ProbeError('no_video_stream', 'لم نستطع عدّ إطارات الفيديو');

  const result: ProbeResult = {
    path,
    fileName: basename(path),
    hash: await hashFile(path, st.size),
    durationUs,
    fps,
    sourceIsVfr,
    frameCount,
    rotation: normalizeRotation(video),
    width: video.width,
    height: video.height,
    hasAudio: !!audio,
    fileSize: st.size,
    mtime: st.mtime.toISOString(),
    container: info.format?.format_name ?? '',
    videoCodec: video.codec_name ?? '',
  };
  if (audio?.codec_name) result.audioCodec = audio.codec_name;
  return result;
}
