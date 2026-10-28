import type { EncoderKind } from './types';

// مشفّر H.264 عبر WebCodecs (R2، S5): عتادي أولاً؛ البرمجي احتياط فقط (القرار 29) ويُعلَّم في النتيجة.

// مستويات H.264 (الملحق A): أقصى إطار بالماكروبلوكات وأقصى ماكروبلوك/ثانية. isConfigSupported يرفض مستوى أصغر من الأبعاد (S5)
const LEVELS: Array<{ code: string; maxFs: number; maxMbps: number }> = [
  { code: '1f', maxFs: 3600, maxMbps: 108_000 }, // 3.1: 720p30
  { code: '28', maxFs: 8192, maxMbps: 245_760 }, // 4.0: 1080p30
  { code: '2a', maxFs: 8704, maxMbps: 522_240 }, // 4.2: 1080p60
  { code: '33', maxFs: 36_864, maxMbps: 983_040 }, // 5.1
];

/** avc1.64xxLL — High profile بأصغر مستوى يكفي الأبعاد ومعدل الإطارات. */
export function h264Codec(width: number, height: number, fps: number): string {
  const mbs = Math.ceil(width / 16) * Math.ceil(height / 16);
  const level = LEVELS.find((l) => mbs <= l.maxFs && mbs * fps <= l.maxMbps) ?? LEVELS[LEVELS.length - 1]!;
  return `avc1.6400${level.code}`;
}

/** ≈8 Mb/s لـ1080p مقيسة بالبكسلات، بحد أدنى 1 Mb/s حتى لا تنهار جودة المصادر الصغيرة. */
export function bitrateFor(width: number, height: number): number {
  return Math.max(1_000_000, Math.round((8_000_000 * width * height) / (1920 * 1080)));
}

export interface EncoderHandle {
  encoder: VideoEncoder;
  kind: EncoderKind;
  config: VideoEncoderConfig;
}

export async function createH264Encoder(opts: {
  width: number;
  height: number;
  fps: number;
  output: VideoEncoderInit['output'];
  error: VideoEncoderInit['error'];
}): Promise<EncoderHandle | null> {
  if (typeof VideoEncoder === 'undefined') return null;
  const base: VideoEncoderConfig = {
    codec: h264Codec(opts.width, opts.height, opts.fps),
    width: opts.width,
    height: opts.height,
    framerate: opts.fps,
    bitrate: bitrateFor(opts.width, opts.height),
    avc: { format: 'annexb' },
    latencyMode: 'quality',
  };
  const attempts: Array<{ hardwareAcceleration: HardwareAcceleration; kind: EncoderKind }> = [
    { hardwareAcceleration: 'prefer-hardware', kind: 'hardware' },
    { hardwareAcceleration: 'no-preference', kind: 'software' },
  ];
  for (const a of attempts) {
    const config: VideoEncoderConfig = { ...base, hardwareAcceleration: a.hardwareAcceleration };
    const support = await VideoEncoder.isConfigSupported(config).catch(() => ({ supported: false }));
    if (!support.supported) continue;
    const encoder = new VideoEncoder({ output: opts.output, error: opts.error });
    encoder.configure(config);
    return { encoder, kind: a.kind, config };
  }
  return null;
}
