import { FfmpegError, runFfmpeg, runFfprobe } from './process';

export interface EncoderInfo {
  name: string;
  hardware: boolean;
  works: boolean;
  error?: string;
}

export interface EncoderReport {
  ffmpegVersion: string;
  detectedAt: string;
  h264: EncoderInfo[];
  aac: boolean;
}

// المشفّرات العتادية المرشحة (R4). libopenh264/libx264 لا تُشحن (القرار 14، المبدأ VI) — إن وُجدت نبلّغ عنها بلا تجربة
const HARDWARE_H264 = ['h264_videotoolbox', 'h264_nvenc', 'h264_amf', 'h264_qsv', 'h264_vaapi', 'h264_mf'];
const SOFTWARE_H264 = ['libx264', 'libopenh264'];
const TRIAL_TIMEOUT_MS = 20_000;

async function trial(ffmpeg: string, encoder: string): Promise<EncoderInfo> {
  try {
    // ترميز ثانية واحدة من مولّد lavfi إلى null: يكشف غياب التعريف/الجهاز بلا ملفات
    await runFfmpeg(
      ffmpeg,
      ['-f', 'lavfi', '-i', 'testsrc2=size=1280x720:rate=30:duration=1', '-pix_fmt', 'yuv420p', '-c:v', encoder, '-f', 'null', '-'],
      { timeoutMs: TRIAL_TIMEOUT_MS },
    );
    return { name: encoder, hardware: true, works: true };
  } catch (e) {
    const err = e instanceof FfmpegError ? (e.stderr?.trim() || e.message) : String(e);
    return { name: encoder, hardware: true, works: false, error: err.split('\n').slice(-3).join('\n') };
  }
}

export async function detectEncoders(bins: { ffmpeg: string }): Promise<EncoderReport> {
  // runFfprobe = spawn بسيط يرجع stdout؛ يصلح لأوامر ffmpeg الاستعلامية أيضاً
  const [versionOut, encodersOut] = await Promise.all([
    runFfprobe(bins.ffmpeg, ['-version']),
    runFfprobe(bins.ffmpeg, ['-encoders']),
  ]);
  const ffmpegVersion = /ffmpeg version (\S+)/.exec(versionOut)?.[1] ?? versionOut.split('\n')[0] ?? 'unknown';
  const listed = new Set<string>();
  for (const line of encodersOut.split('\n')) {
    const m = /^\s*[A-Z.]{6}\s+(\S+)/.exec(line);
    if (m?.[1]) listed.add(m[1]);
  }

  const h264: EncoderInfo[] = [];
  for (const name of HARDWARE_H264) if (listed.has(name)) h264.push(await trial(bins.ffmpeg, name));
  for (const name of SOFTWARE_H264) {
    if (listed.has(name)) h264.push({ name, hardware: false, works: false, error: 'مشفّر برمجي غير معتمد (القرار 14)' });
  }

  return { ffmpegVersion, detectedAt: new Date().toISOString(), h264, aac: listed.has('aac') };
}
