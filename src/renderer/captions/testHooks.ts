import { composeFrame } from '../../core/captions/compose';
import { DEFAULT_FONT_FAMILY, captionFont, fontString, layoutChunk, readCaptionRules } from '../../core/captions/layout';
import type { CaptionCue, WordRect } from '../../core/captions/types';
import { getState } from '../commands/runtime';
import { fontsReady } from '../fonts';
import { measureText } from './measure';

// خطافات اختبار الكابشن (T056، R6 «اختبارات دلالية لا صورية»): تقيس وترسم بنفس الدوال التي تستعملها الأوامر
// والمعاينة (measureText، layoutChunk، composeFrame) على ناتج 1920×1080 افتراضي، وتعيد أرقاماً وبصمات لا صوراً.
// كل خطاف يرفض قبل تحميل الخطوط: measureText يخبّئ القياس إلى الأبد، فقياس بخط بديل يسمّم كل ما بعده.

type Dir = 'rtl' | 'ltr';
type Fail = { ok: false; code: string; message: string };

declare global {
  interface TestHooks {
    fontsReady?(): boolean;
    /** قياس نص بخط الكابشن الافتراضي 78px (مستطيلات الكلمات بصرية نسبةً إلى صندوق السطر) */
    measure?(text: string, dir?: Dir): { ok: true; width: number; height: number; wordRects: WordRect[] } | Fail;
    /** رسم سلسلة واحدة متوسّطة على canvas بالاتجاه المعطى → بصمة البكسلات وعرض الحبر */
    glyphs?(text: string, dir?: Dir): { ok: true; hash: string; inkWidth: number } | Fail;
    /** تخطيط مجموعة بالنمط المثبّت على 1920×1080 ثم تركيب إطار بالكلمة النشطة activeIndex */
    caption?(text: string, activeIndex?: number): { ok: true; lines: string[]; fontSizePx: number; fits: boolean; rects: WordRect[]; hash: string } | Fail;
    /** فرق البكسلات بين إبراز الكلمة activeIndex وبلا إبراز: مستطيل الكلمة وصندوق البكسلات المختلفة وعددها */
    highlightDiff?(text: string, activeIndex: number): { ok: true; rect: WordRect; diffBox: WordRect | null; count: number } | Fail;
  }
}

const OUT = { width: 1920, height: 1080 };
const GLYPH_CANVAS = { width: 1400, height: 200, baseline: 130 };
const SIZE_PX = 78;

const fail = (code: string, message: string): Fail => ({ ok: false, code, message });
const notReady = (): Fail | null => (fontsReady() ? null : fail('fonts_not_ready', 'الخطوط لم تُحمَّل بعد'));

function fnv(data: Uint8ClampedArray): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < data.length; i++) {
    h ^= data[i]!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function context(width: number, height: number): OffscreenCanvasRenderingContext2D {
  const ctx = new OffscreenCanvas(width, height).getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('تعذّر إنشاء سياق 2D');
  return ctx;
}

/** صندوق البكسلات التي يحكم عليها pick بـtrue؛ null إن لم يوجد */
function bbox(width: number, height: number, pick: (i: number) => boolean): WordRect | null {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!pick((y * width + x) * 4)) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
}

const words = (text: string): string[] => text.split(/\s+/u).filter((w) => w.length > 0);

function layout(text: string, activeIndex: number) {
  const style = getState().style;
  if (!style) throw Object.assign(new Error('النمط لم يُحمَّل'), { code: 'style_missing' });
  const rules = readCaptionRules(style);
  const chunk = layoutChunk(words(text), rules, OUT, measureText);
  const cue: CaptionCue = {
    id: 'cue:test',
    startFrame: 0,
    endFrame: 1,
    wordIds: chunk.wordRects.map((_, i) => `w${i}`),
    lines: chunk.lines,
    fontSizePx: chunk.fontSizePx,
    activeWordRects: [chunk.wordRects[activeIndex] ?? [0, 0, 0, 0]],
  };
  return { style, rules, chunk, cue };
}

function compose(cue: CaptionCue, style: NonNullable<ReturnType<typeof getState>['style']>): Uint8ClampedArray {
  const ctx = context(OUT.width, OUT.height);
  composeFrame(ctx, 0, OUT, null, [cue], style, { ready: true });
  return ctx.getImageData(0, 0, OUT.width, OUT.height).data;
}

const hooks: Partial<TestHooks> = {
  fontsReady,

  measure(text, dir = 'rtl') {
    const nr = notReady();
    if (nr) return nr;
    const m = measureText(text, captionFont(DEFAULT_FONT_FAMILY, SIZE_PX), dir);
    return { ok: true, width: m.width, height: m.height, wordRects: m.wordRects };
  },

  glyphs(text, dir = 'rtl') {
    const nr = notReady();
    if (nr) return nr;
    const { width, height, baseline } = GLYPH_CANVAS;
    const ctx = context(width, height);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    ctx.font = fontString(captionFont(DEFAULT_FONT_FAMILY, SIZE_PX));
    ctx.direction = dir;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#fff';
    ctx.fillText(text, width / 2, baseline);
    const data = ctx.getImageData(0, 0, width, height).data;
    const ink = bbox(width, height, (i) => data[i]! > 40);
    return { ok: true, hash: fnv(data), inkWidth: ink ? ink[2] : 0 };
  },

  caption(text, activeIndex = 0) {
    const nr = notReady();
    if (nr) return nr;
    try {
      const { style, chunk, cue } = layout(text, activeIndex);
      return { ok: true, lines: chunk.lines, fontSizePx: chunk.fontSizePx, fits: chunk.fits, rects: chunk.wordRects, hash: fnv(compose(cue, style)) };
    } catch (e) {
      return fail((e as { code?: string }).code ?? 'error', e instanceof Error ? e.message : String(e));
    }
  },

  highlightDiff(text, activeIndex) {
    const nr = notReady();
    if (nr) return nr;
    try {
      const { style, chunk, cue } = layout(text, activeIndex);
      const rect = chunk.wordRects[activeIndex];
      if (!rect) return fail('bad_index', `لا كلمة بالفهرس ${activeIndex}`);
      const on = compose(cue, style);
      const { activeWordRects: _dropped, ...plain } = cue; // بلا مستطيلات = بلا إبراز (compose يتوقف قبل القصّ)
      const off = compose(plain, style);
      let count = 0;
      const diffBox = bbox(OUT.width, OUT.height, (i) => {
        const differs = on[i] !== off[i] || on[i + 1] !== off[i + 1] || on[i + 2] !== off[i + 2];
        if (differs) count++;
        return differs;
      });
      return { ok: true, rect, diffBox, count };
    } catch (e) {
      return fail((e as { code?: string }).code ?? 'error', e instanceof Error ? e.message : String(e));
    }
  },
};

// runtime ينشئ window.__test قبلنا؛ نضيف خطافاتنا إليه ولا نستبدله
if (window.api.app.isTest && window.__test) Object.assign(window.__test, hooks);

export {};
