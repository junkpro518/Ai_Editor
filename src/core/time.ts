// الزمن (contracts/README.md): ميكروثانية صحيحة للتفريغ، وإطارات صحيحة على كسر fps المشروع.
// الحساب بـBigInt حتى لا ينزلق التحويل على 15 دقيقة من 30000/1001.

export interface Rational {
  num: number;
  den: number;
}

export const STANDARD_FPS: readonly Rational[] = [
  { num: 24000, den: 1001 },
  { num: 24, den: 1 },
  { num: 25, den: 1 },
  { num: 30000, den: 1001 },
  { num: 30, den: 1 },
  { num: 50, den: 1 },
  { num: 60000, den: 1001 },
  { num: 60, den: 1 },
];

const MICROS = 1_000_000n;

function assertPositiveInt(value: number, what: string): void {
  if (!Number.isInteger(value) || value < 1) throw new RangeError(`${what} يجب أن يكون عدداً صحيحاً موجباً: ${value}`);
}

function assertNonNegativeInt(value: number, what: string): void {
  if (!Number.isInteger(value) || value < 0) throw new RangeError(`${what} يجب أن يكون عدداً صحيحاً ≥ 0: ${value}`);
}

function assertFps(fps: Rational): void {
  assertPositiveInt(fps.num, 'fps.num');
  assertPositiveInt(fps.den, 'fps.den');
}

/** '30000/1001' أو '30'؛ يرفض الصفر والسالب وغير الأعداد */
export function parseRational(s: string): Rational {
  const m = /^\s*(\d+)(?:\/(\d+))?\s*$/.exec(s);
  if (!m) throw new RangeError(`كسر غير صالح: "${s}"`);
  const fps = { num: Number(m[1]), den: m[2] === undefined ? 1 : Number(m[2]) };
  assertFps(fps);
  return fps;
}

export function fpsToNumber(fps: Rational): number {
  return fps.num / fps.den;
}

export function fpsEquals(a: Rational, b: Rational): boolean {
  return a.num * b.den === b.num * a.den;
}

/** floor(us * num / (den * 1e6)) */
export function usToFrame(us: number, fps: Rational): number {
  assertNonNegativeInt(us, 'us');
  assertFps(fps);
  return Number((BigInt(us) * BigInt(fps.num)) / (BigInt(fps.den) * MICROS));
}

/** round(frame * den * 1e6 / num) */
export function frameToUs(frame: number, fps: Rational): number {
  assertNonNegativeInt(frame, 'frame');
  assertFps(fps);
  const numerator = BigInt(frame) * BigInt(fps.den) * MICROS;
  const divisor = BigInt(fps.num);
  // أول ميكروثانية داخل الإطار (سقف) حتى تُغلق الدائرة: usToFrame(frameToUs(f)) === f دائماً
  return Number((numerator + divisor - 1n) / divisor);
}

/** ثوانٍ بست خانات عشرية مبنية من الميكروثانية الصحيحة، مثل '1.001000' */
export function frameToSeconds(frame: number, fps: Rational): string {
  const us = frameToUs(frame, fps);
  return `${Math.floor(us / 1e6)}.${String(us % 1e6).padStart(6, '0')}`;
}

/** أقرب معدل معياري بالفرق المطلق؛ عند التعادل يفوز الأول في القائمة */
export function nearestStandardFps(avg: Rational | number): Rational {
  const target = typeof avg === 'number' ? avg : fpsToNumber(avg);
  if (!Number.isFinite(target)) throw new RangeError(`معدل إطارات غير صالح: ${String(avg)}`);
  let best = STANDARD_FPS[0]!;
  let bestDiff = Math.abs(fpsToNumber(best) - target);
  for (const fps of STANDARD_FPS) {
    const diff = Math.abs(fpsToNumber(fps) - target);
    if (diff < bestDiff) {
      best = fps;
      bestDiff = diff;
    }
  }
  return { ...best };
}

/** Σ(outFrame − inFrame): عدد إطارات التصدير المتوقع (data-model §1.3) */
export function expectedFrames(clips: ReadonlyArray<{ inFrame: number; outFrame: number }>): number {
  return clips.reduce((sum, c) => sum + (c.outFrame - c.inFrame), 0);
}
