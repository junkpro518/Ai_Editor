import type { Rational } from '../../core/time';
import { runFfmpeg } from './process';
import type { Progress } from './process';

export interface EdlRange {
  inUs: number;
  outUs: number;
}

export interface MuxSpec {
  outputPath: string;
  fps: Rational;
  /** false → `-an` بلا مدخل ثانٍ */
  hasAudio: boolean;
  /** ملف المصدر: يُقرأ منه الصوت فقط (الفيديو يصل مرمَّزاً عبر stdin) */
  sourcePath: string;
  /** مقاطع الخط الزمني بالميكروثانية على المصدر، بترتيب الخط الزمني */
  edl: EdlRange[];
  /**
   * المسار الاحتياطي (R2): بلا مشفّر WebCodecs تصل إطارات RGBA خام ويرمّزها مشفّر FFmpeg عتادي.
   * غائب → المسار الأساسي: Annex-B H.264 جاهز، `-c:v copy`.
   */
  raw?: { width: number; height: number; encoder: string };
}

export interface MuxOptions extends MuxSpec {
  stdin: NodeJS.ReadableStream;
  signal?: AbortSignal;
  onProgress?: (p: Progress) => void;
}

const sec = (us: number): string => (us / 1e6).toFixed(6);

/** رسم الفلتر: قصّ كل مقطع من المسار الصوتي الأول وإلحاقها بالترتيب (AAC لا يُنسخ عند نقاط قصّ عشوائية — R2). */
function audioGraph(edl: EdlRange[]): string {
  const parts = edl.map((r, i) => `[1:a:0]atrim=start=${sec(r.inUs)}:end=${sec(r.outUs)},asetpts=PTS-STARTPTS[a${i}]`);
  if (edl.length === 1) return `${parts[0]!.slice(0, -4)}[a]`;
  return `${parts.join(';')};${edl.map((_, i) => `[a${i}]`).join('')}concat=n=${edl.length}:v=0:a=1[a]`;
}

export function muxArgs(spec: MuxSpec): string[] {
  const rate = `${spec.fps.num}/${spec.fps.den}`;
  const args = ['-protocol_whitelist', 'file,pipe'];
  if (spec.raw) args.push('-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${spec.raw.width}x${spec.raw.height}`, '-r', rate, '-i', 'pipe:0');
  else args.push('-f', 'h264', '-r', rate, '-i', 'pipe:0');

  if (spec.hasAudio) {
    args.push('-protocol_whitelist', 'file,pipe', '-i', `file:${spec.sourcePath}`);
    args.push('-filter_complex', audioGraph(spec.edl), '-map', '0:v:0', '-map', '[a]');
  } else {
    args.push('-map', '0:v:0', '-an');
  }

  // T098: تيار Chromium موسوم full-range bt709/sRGB وهو صحيح كما هو (measurements.md) — نسخ بلا تعديل VUI
  if (spec.raw) args.push('-c:v', spec.raw.encoder, '-pix_fmt', 'yuv420p', '-fps_mode', 'cfr');
  else args.push('-c:v', 'copy');
  if (spec.hasAudio) args.push('-c:a', 'aac', '-b:a', '160k');
  // لا -shortest: الـEDL يحدد مدة الصوت بدقة، و-shortest مع النسخ قد يسقط إطارات الذيل
  args.push('-movflags', '+faststart', spec.outputPath);
  return args;
}

/** يدمج MP4 من تيار الفيديو على stdin وصوت المصدر المقصوص؛ الملف الناقص يُحذف عند الإلغاء أو الفشل. */
export function mux(bins: { ffmpeg: string }, o: MuxOptions): Promise<{ code: number; stderr: string }> {
  const { stdin, signal, onProgress, ...spec } = o;
  const opts: Parameters<typeof runFfmpeg>[2] = { stdin, outputPath: spec.outputPath };
  if (signal) opts.signal = signal;
  if (onProgress) opts.onProgress = onProgress;
  return runFfmpeg(bins.ffmpeg, muxArgs(spec), opts);
}
