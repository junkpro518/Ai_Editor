import { describe, expect, it } from 'vitest';
import {
  STANDARD_FPS,
  expectedFrames,
  fpsEquals,
  fpsToNumber,
  frameToSeconds,
  frameToUs,
  nearestStandardFps,
  parseRational,
  usToFrame,
} from '../../../src/core/time';

const NTSC = { num: 30000, den: 1001 };

// مرجع دقيق بـBigInt: floor(us*num/(den*1e6))
function refUsToFrame(us: number, num: number, den: number): number {
  return Number((BigInt(us) * BigInt(num)) / (BigInt(den) * 1_000_000n));
}

describe('parseRational', () => {
  it('يقرأ الكسر والعدد الصحيح', () => {
    expect(parseRational('30000/1001')).toEqual({ num: 30000, den: 1001 });
    expect(parseRational('30')).toEqual({ num: 30, den: 1 });
  });
  it('يرفض القيم غير الصالحة', () => {
    expect(() => parseRational('0/0')).toThrow();
    expect(() => parseRational('30/0')).toThrow();
    expect(() => parseRational('abc')).toThrow();
    expect(() => parseRational('-25')).toThrow();
  });
});

describe('fpsToNumber / fpsEquals', () => {
  it('يحسب القيمة ويقارن بعد التبسيط', () => {
    expect(fpsToNumber(NTSC)).toBeCloseTo(29.97, 2);
    expect(fpsEquals({ num: 30, den: 1 }, { num: 60, den: 2 })).toBe(true);
    expect(fpsEquals(NTSC, { num: 30, den: 1 })).toBe(false);
  });
});

describe('usToFrame / frameToUs على 30000/1001', () => {
  it('يطابق BigInt بلا انزلاق حتى 15 دقيقة', () => {
    for (const us of [0, 1, 33366, 33367, 1_001_000, 60_000_000, 899_999_100, 900_000_000]) {
      expect(usToFrame(us, NTSC)).toBe(refUsToFrame(us, 30000, 1001));
    }
    expect(usToFrame(900_000_000, NTSC)).toBe(26973);
    expect(frameToUs(26973, NTSC)).toBe(899_999_100);
  });
  it('حدود الإطار دقيقة في مسح 15 دقيقة', () => {
    for (let f = 1; f <= 27000; f += 7) {
      // أول ميكروثانية في الإطار f = ceil(f*den*1e6/num)
      const num = 30000n;
      const start = Number((BigInt(f) * 1001n * 1_000_000n + num - 1n) / num);
      expect(usToFrame(start, NTSC)).toBe(f);
      expect(usToFrame(start - 1, NTSC)).toBe(f - 1);
      // frameToUs = أول ميكروثانية في الإطار (سقف): لا تسبق البداية الحقيقية، وترجع لنفس الإطار
      const us = frameToUs(f, NTSC);
      expect(us - start).toBeGreaterThanOrEqual(0);
      expect(us - start).toBeLessThanOrEqual(1);
      expect(usToFrame(us, NTSC)).toBe(f);
    }
  });
  it('يرفض القيم غير الصحيحة', () => {
    expect(() => usToFrame(1.5, NTSC)).toThrow();
    expect(() => frameToUs(2.5, NTSC)).toThrow();
  });
});

describe('frameToSeconds', () => {
  it('نص بست خانات دون انزلاق', () => {
    expect(frameToSeconds(0, NTSC)).toBe('0.000000');
    expect(frameToSeconds(30, NTSC)).toBe('1.001000');
    expect(frameToSeconds(26973, NTSC)).toBe('899.999100');
    expect(frameToSeconds(25, { num: 25, den: 1 })).toBe('1.000000');
  });
});

describe('nearestStandardFps', () => {
  it('القائمة المعيارية ثمانية معدلات', () => {
    expect(STANDARD_FPS).toHaveLength(8);
  });
  it('يختار الأقرب بالفرق المطلق', () => {
    expect(nearestStandardFps(29.97)).toEqual(NTSC);
    expect(nearestStandardFps({ num: 2997, den: 100 })).toEqual(NTSC);
    expect(nearestStandardFps(29.5)).toEqual(NTSC);
    expect(nearestStandardFps(59.94)).toEqual({ num: 60000, den: 1001 });
    expect(nearestStandardFps(25)).toEqual({ num: 25, den: 1 });
    expect(nearestStandardFps({ num: 480, den: 37 })).toEqual({ num: 24000, den: 1001 });
    expect(nearestStandardFps(30)).toEqual({ num: 30, den: 1 });
  });
});

describe('expectedFrames', () => {
  it('Σ(out − in)', () => {
    expect(expectedFrames([])).toBe(0);
    expect(
      expectedFrames([
        { inFrame: 0, outFrame: 150 },
        { inFrame: 200, outFrame: 260 },
      ]),
    ).toBe(210);
  });
});
