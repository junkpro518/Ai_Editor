import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { composeFrame, findActiveCue, outputSize } from '../../../../src/core/captions/compose';
import { blockLayout, readCaptionRules } from '../../../../src/core/captions/layout';
import type { CaptionCue } from '../../../../src/core/captions/types';
import type { StyleVersion } from '../../../../src/core/contracts/types';
import { makeStyle } from '../../../helpers/project';

// سياق 2D مزيّف يسجّل الاستدعاءات بالترتيب — لا canvas حقيقي في Node.
type Call = [string, ...unknown[]];
function fakeCtx(): { calls: Call[]; ctx: CanvasRenderingContext2D } {
  const calls: Call[] = [];
  const handler: ProxyHandler<object> = {
    get(_t, prop) {
      if (prop === 'calls') return calls;
      return (...args: unknown[]) => {
        calls.push([String(prop), ...args]);
      };
    },
    set(_t, prop, value) {
      calls.push(['set:' + String(prop), value]);
      return true;
    },
  };
  return { calls, ctx: new Proxy({}, handler) as unknown as CanvasRenderingContext2D };
}

const FRAME = { tag: 'frame' } as unknown as CanvasImageSource;
const style = makeStyle();
const fonts = { ready: true };

describe('outputSize', () => {
  it('يُبدّل الأبعاد عند 90/270 فقط', () => {
    expect(outputSize({ width: 180, height: 320, rotation: 90 })).toEqual({ width: 320, height: 180 });
    expect(outputSize({ width: 180, height: 320, rotation: 270 })).toEqual({ width: 320, height: 180 });
    expect(outputSize({ width: 320, height: 180, rotation: 180 })).toEqual({ width: 320, height: 180 });
    expect(outputSize({ width: 320, height: 180 })).toEqual({ width: 320, height: 180 });
  });
});

describe('composeFrame', () => {
  it('دوران 0: يمسح ثم يرسم الإطار على (0,0,w,h) بلا تحويل', () => {
    const { calls, ctx } = fakeCtx();
    composeFrame(ctx, 0, { width: 320, height: 180, rotation: 0 }, FRAME, [], style, fonts);
    expect(calls).toEqual([
      ['clearRect', 0, 0, 320, 180],
      ['drawImage', FRAME, 0, 0, 320, 180],
    ]);
  });

  it('دوران 90 (عكس عقارب الساعة): حجم مبدَّل، والتسلسل save→translate→rotate→drawImage→restore بزاوية −π/2', () => {
    const { calls, ctx } = fakeCtx();
    const source = { width: 180, height: 320, rotation: 90 };
    expect(outputSize(source)).toEqual({ width: 320, height: 180 });
    composeFrame(ctx, 7, source, FRAME, [], style, fonts);
    expect(calls).toEqual([
      ['clearRect', 0, 0, 320, 180],
      ['save'],
      ['translate', 0, 180],
      ['rotate', -Math.PI / 2],
      ['drawImage', FRAME, 0, 0, 180, 320],
      ['restore'],
    ]);
  });

  it('دوران 270: الإزاحة (W,0) والزاوية −3π/2', () => {
    const { calls, ctx } = fakeCtx();
    composeFrame(ctx, 0, { width: 180, height: 320, rotation: 270 }, FRAME, [], style, fonts);
    expect(calls[2]).toEqual(['translate', 320, 0]);
    expect(calls[3]).toEqual(['rotate', -(3 * Math.PI) / 2]);
  });

  it('frameIndex لا يغيّر الناتج عندما لا توجد كابشن', () => {
    const a = fakeCtx();
    const b = fakeCtx();
    const source = { width: 320, height: 180, rotation: 0 };
    composeFrame(a.ctx, 0, source, FRAME, [], style, fonts);
    composeFrame(b.ctx, 100, source, FRAME, [], style, fonts);
    expect(a.calls).toEqual(b.calls);
  });

  it('بلا إطار: يملأ أسود بدل الرسم', () => {
    const { calls, ctx } = fakeCtx();
    composeFrame(ctx, 0, { width: 320, height: 180, rotation: 0 }, null, [], style, fonts);
    expect(calls).toEqual([
      ['clearRect', 0, 0, 320, 180],
      ['set:fillStyle', '#000'],
      ['fillRect', 0, 0, 320, 180],
    ]);
  });

  it('المصدر حتمي: لا Date ولا Math.random ولا requestAnimationFrame', () => {
    const src = readFileSync(new URL('../../../../src/core/captions/compose.ts', import.meta.url), 'utf8');
    expect(src).not.toMatch(/\bDate\b/);
    expect(src).not.toMatch(/Math\.random/);
    expect(src).not.toMatch(/requestAnimationFrame/);
  });
});

// ---- T062: رسم الكابشن (بحث B §3/§4، R6) ----
const SRC = { width: 1920, height: 1080, rotation: 0 };
const rules = readCaptionRules(style);
const block = blockLayout(2, 60, SRC, rules);
const LINE1 = 'السلام عليكم Hello';
const LINE2 = 'اليوم 25 درساً';
/** مجموعة من سطرين، الكلمة النشطة «عليكم» في السطر الأول */
const cue: CaptionCue = {
  id: 'cue:w2',
  startFrame: 10,
  endFrame: 20,
  wordIds: ['w1', 'w2', 'w3', 'w4', 'w5', 'w6'],
  lines: [LINE1, LINE2],
  fontSizePx: 60,
  activeWordRects: [[900, block.top, 120, block.lineHeight]],
};
const cue2: CaptionCue = { ...cue, id: 'cue:w5', startFrame: 20, endFrame: 30, activeWordRects: [[700, block.top + block.lineHeight, 90, block.lineHeight]] };
const fillTexts = (calls: Call[]) => calls.filter((c) => c[0] === 'fillText');
const names = (calls: Call[]) => calls.map((c) => c[0]);

function withRules(patch: Record<string, unknown>): StyleVersion {
  const s = makeStyle();
  const captions = { ...s.captions } as Record<string, { value: unknown }>;
  for (const [k, v] of Object.entries(patch)) captions[k] = { ...captions[k]!, value: v };
  return { ...s, captions: captions as StyleVersion['captions'] };
}

describe('findActiveCue', () => {
  it('يختار الكابشن الذي يحوي الإطار [start, end) ببحث ثنائي، أو null', () => {
    const cues = [cue, cue2];
    expect(findActiveCue(cues, 9)).toBeNull();
    expect(findActiveCue(cues, 10)).toBe(cue);
    expect(findActiveCue(cues, 19)).toBe(cue);
    expect(findActiveCue(cues, 20)).toBe(cue2);
    expect(findActiveCue(cues, 30)).toBeNull();
    expect(findActiveCue([], 0)).toBeNull();
  });
});

describe('composeFrame — الكابشن', () => {
  it('خارج مدى أي كابشن: الفيديو فقط (نفس استدعاءات v1)', () => {
    const { calls, ctx } = fakeCtx();
    composeFrame(ctx, 5, SRC, FRAME, [cue, cue2], style, fonts);
    expect(calls).toEqual([
      ['clearRect', 0, 0, 1920, 1080],
      ['drawImage', FRAME, 0, 0, 1920, 1080],
    ]);
  });

  it('الخطوط غير جاهزة → لا كابشن حتى داخل المدى', () => {
    const { calls, ctx } = fakeCtx();
    composeFrame(ctx, 12, SRC, FRAME, [cue], style, { ready: false });
    expect(fillTexts(calls)).toEqual([]);
  });

  it('داخل المدى: scrim قبل النص، كل سطر سلسلة واحدة rtl متوسّطة، ثم إبراز الكلمة النشطة بقصّ على مستطيلها', () => {
    const { calls, ctx } = fakeCtx();
    composeFrame(ctx, 12, SRC, FRAME, [cue, cue2], style, fonts);
    const n = names(calls);
    // الفيديو أولاً
    expect(n.slice(0, 2)).toEqual(['clearRect', 'drawImage']);
    // الـscrim (bgColor) قبل أي fillText
    const scrimAt = calls.findIndex((c) => c[0] === 'set:fillStyle' && c[1] === 'rgba(0,0,0,0.55)');
    const firstText = n.indexOf('fillText');
    expect(scrimAt).toBeGreaterThan(-1);
    expect(scrimAt).toBeLessThan(firstText);
    expect(n.slice(scrimAt, firstText)).toContain('fill');
    // إعدادات النص قبل الرسم
    expect(calls.slice(0, firstText)).toEqual(expect.arrayContaining([['set:direction', 'rtl'], ['set:textAlign', 'center'], ['set:textBaseline', 'alphabetic'], ['set:font', '700 60px "IBM Plex Sans Arabic"']]));
    // السطران كاملان بلون النص في منتصف العرض، السطر الأول أعلى
    const texts = fillTexts(calls);
    expect(texts.slice(0, 2)).toEqual([
      ['fillText', LINE1, 960, block.top + 60],
      ['fillText', LINE2, 960, block.top + block.lineHeight + 60],
    ]);
    // الإبراز: save → rect(المستطيل النشط) → clip → لون الإبراز → نفس السطر → restore؛ بلا تقسيم للنص
    const i = n.lastIndexOf('save');
    expect(calls.slice(i)).toEqual([
      ['save'],
      ['beginPath'],
      ['rect', 900, block.top, 120, block.lineHeight],
      ['clip'],
      ['set:fillStyle', '#FFD600'],
      ['fillText', LINE1, 960, block.top + 60],
      ['restore'],
    ]);
    expect(texts).toHaveLength(3);
    for (const t of texts) expect([LINE1, LINE2]).toContain(t[1]);
    // لون النص الأساسي قبل السطرين
    const textColorAt = calls.findIndex((c) => c[0] === 'set:fillStyle' && c[1] === '#FFFFFF');
    expect(textColorAt).toBeLessThan(firstText);
    expect(textColorAt).toBeGreaterThan(scrimAt);
  });

  it('الإطار 20 يختار الكابشن الثاني: الإبراز ينتقل إلى مستطيل السطر الثاني ويُعاد رسم السطر الثاني فقط', () => {
    const { calls, ctx } = fakeCtx();
    composeFrame(ctx, 20, SRC, FRAME, [cue, cue2], style, fonts);
    const i = names(calls).lastIndexOf('save');
    expect(calls[i + 2]).toEqual(['rect', 700, block.top + block.lineHeight, 90, block.lineHeight]);
    expect(calls[i + 5]).toEqual(['fillText', LINE2, 960, block.top + block.lineHeight + 60]);
  });

  it('highlightCurrent=false → السطور فقط بلا قصّ؛ وبلا activeWordRects لا إبراز', () => {
    const a = fakeCtx();
    composeFrame(a.ctx, 12, SRC, FRAME, [cue], withRules({ highlightCurrent: false }), fonts);
    expect(names(a.calls)).not.toContain('clip');
    expect(fillTexts(a.calls)).toHaveLength(2);
    const b = fakeCtx();
    const { activeWordRects: _r, ...bare } = cue;
    composeFrame(b.ctx, 12, SRC, FRAME, [bare], style, fonts);
    expect(names(b.calls)).not.toContain('clip');
  });

  it('مع الدوران: الكابشن يُرسم بعد restore في فضاء الناتج (W×H المبدَّل)', () => {
    const { calls, ctx } = fakeCtx();
    const src = { width: 1080, height: 1920, rotation: 90 };
    const r = blockLayout(1, 60, { width: 1920, height: 1080 }, rules);
    const c: CaptionCue = { ...cue, lines: [LINE1], activeWordRects: [[900, r.top, 120, r.lineHeight]] };
    composeFrame(ctx, 12, src, FRAME, [c], style, fonts);
    const n = names(calls);
    expect(n.indexOf('restore')).toBeLessThan(n.indexOf('fillText'));
    expect(fillTexts(calls)[0]).toEqual(['fillText', LINE1, 960, r.top + 60]);
  });

  it('حتمي: نفس المدخلات → نفس الاستدعاءات', () => {
    const a = fakeCtx();
    const b = fakeCtx();
    composeFrame(a.ctx, 12, SRC, FRAME, [cue, cue2], style, fonts);
    composeFrame(b.ctx, 12, SRC, FRAME, [cue, cue2], style, fonts);
    expect(a.calls).toEqual(b.calls);
  });
});
