import type { MeasureFn } from '../commands/types';
import { CommandError } from '../commands/types';
import type { StyleVersion } from '../contracts/types';
import type { CaptionRules, CaptionPosition, WordRect } from './types';

// تخطيط الكابشن (T061): حجم الخط بالملاءمة ومستطيلات الكلمات عبر دالة قياس تُحقن من renderer؛ core بلا DOM.
// كل ما يحتاجه الرسم لاحقاً يُشتق من fontSizePx وعدد الأسطر فقط (المخطط لا يسمح بحقول إضافية في الكابشن).

/** الخطوط المشحونة مع التطبيق (بحث B §4، كلها OFL)؛ خطوط النظام ممنوعة. */
export const BUNDLED_FONT_FAMILIES: readonly string[] = ['IBM Plex Sans Arabic', 'Cairo', 'Tajawal', 'Noto Sans Arabic', 'Noto Naskh Arabic'];
export const DEFAULT_FONT_FAMILY = 'IBM Plex Sans Arabic';
/** وزن الكابشن ثابت (النمط لا يحوي وزناً في 001): عريض فوق الفيديو */
export const CAPTION_FONT_WEIGHT = 700;
/** ارتفاع السطر وموضع خط الأساس نسبةً إلى الحجم — ثابتان للخط كله حتى يتطابق التخطيط والرسم بلا قياس عمودي */
export const LINE_HEIGHT_RATIO = 1.3;
export const BASELINE_RATIO = 1.0;
/** أساس fit (بحث B §4): الأدنى 42 بمقياس 1080p، الخطوة 2px */
export const MIN_FONT_SIZE_1080 = 42;
export const FONT_STEP_PX = 2;

export interface CaptionFont {
  family: string;
  sizePx: number;
  weight: number;
}

export function resolveFontFamily(family: string): { family: string; fallback: boolean } {
  return BUNDLED_FONT_FAMILIES.includes(family) ? { family, fallback: false } : { family: DEFAULT_FONT_FAMILY, fallback: true };
}

export function captionFont(family: string, sizePx: number): CaptionFont {
  return { family: resolveFontFamily(family).family, sizePx, weight: CAPTION_FONT_WEIGHT };
}

/** سلسلة الخط الواحدة للقياس (DOM) والرسم (canvas): «700 78px "IBM Plex Sans Arabic"» */
export function fontString(font: { family: string; sizePx: number; weight?: number }): string {
  return `${font.weight ?? CAPTION_FONT_WEIGHT} ${font.sizePx}px "${font.family}"`;
}

function rule<T>(style: StyleVersion, key: keyof StyleVersion['captions'], ok: (v: unknown) => v is T): T {
  const v = style.captions[key].value;
  if (!ok(v)) throw new CommandError('invalid_style_rule', `قيمة القاعدة captions.${key} في النمط غير صالحة`);
  return v;
}
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';
const isString = (v: unknown): v is string => typeof v === 'string';
const isPosition = (v: unknown): v is CaptionPosition => v === 'bottom' || v === 'center' || v === 'top';
const isMinMax = (v: unknown): v is { min: number; max: number } =>
  typeof v === 'object' && v !== null && isNumber((v as { min?: unknown }).min) && isNumber((v as { max?: unknown }).max);

/** قيم قواعد الكابشن من النمط المثبّت (القيم في المخطط `unknown` فتُضيَّق هنا مرة واحدة). */
export function readCaptionRules(style: StyleVersion): CaptionRules {
  return {
    enabled: rule(style, 'enabled', isBoolean),
    fontFamily: rule(style, 'fontFamily', isString),
    fontSizePx: rule(style, 'fontSizePx', isNumber),
    position: rule(style, 'position', isPosition),
    maxLines: rule(style, 'maxLines', isNumber),
    wordsPerChunk: rule(style, 'wordsPerChunk', isMinMax),
    breakAtPauseUs: rule(style, 'breakAtPauseUs', isNumber),
    highlightCurrent: rule(style, 'highlightCurrent', isBoolean),
    textColor: rule(style, 'textColor', isString),
    highlightColor: rule(style, 'highlightColor', isString),
    bgColor: rule(style, 'bgColor', isString),
    safeAreaPct: rule(style, 'safeAreaPct', isNumber),
  };
}

export interface OutputSize {
  width: number;
  height: number;
}

/** مقياس الحجم: الارتفاع/1080 للأفقي والعرض/1080 للعمودي (ريلز 1080×1920 تبقي 78px مقروءة). */
export function captionScale(out: OutputSize): number {
  return (out.width >= out.height ? out.height : out.width) / 1080;
}

export interface BlockLayout {
  left: number;
  top: number;
  /** عرض المنطقة الآمنة — عرض كتلة النص والـscrim */
  width: number;
  height: number;
  lineHeight: number;
  /** إزاحة خط الأساس من أعلى السطر */
  baseline: number;
}

/**
 * موضع كتلة الأسطر في الناتج: bottom → أسفل الكتلة عند H·(1 − (1 − safe/100)/2)، top متماثل، center في المنتصف.
 * يُستعمل في التخطيط (مستطيلات الكلمات) وفي الرسم بنفس الأرقام.
 */
export function blockLayout(lineCount: number, fontSizePx: number, out: OutputSize, rules: Pick<CaptionRules, 'position' | 'safeAreaPct'>): BlockLayout {
  const lineHeight = Math.round(fontSizePx * LINE_HEIGHT_RATIO);
  const height = lineCount * lineHeight;
  const margin = (out.height * (1 - rules.safeAreaPct / 100)) / 2;
  const width = Math.round((out.width * rules.safeAreaPct) / 100);
  const top =
    rules.position === 'top' ? Math.round(margin) : rules.position === 'center' ? Math.round((out.height - height) / 2) : Math.round(out.height - margin - height);
  return { left: Math.round((out.width - width) / 2), top, width, height, lineHeight, baseline: Math.round(fontSizePx * BASELINE_RATIO) };
}

const FALLBACK_CHAR_RATIO = 0.55;

/**
 * قياس احتياطي حتمي عندما لا يُحقن قياس (اختبارات الوحدة): عرض كل رمز 0.55·الحجم، ارتفاع 1.3·الحجم،
 * الكلمات متجاورة بمسافة واحدة؛ rtl يضع الكلمة الأولى يميناً. تقريب لا يعرف الحروف — ليس للإنتاج.
 */
export const fallbackMeasure: MeasureFn = (text, font, dir) => {
  const tokens = text.split(/\s+/u).filter((t) => t.length > 0);
  const unit = font.sizePx * FALLBACK_CHAR_RATIO;
  const widths = tokens.map((t) => [...t].length * unit);
  const width = widths.reduce((a, b) => a + b, 0) + Math.max(0, tokens.length - 1) * unit;
  const height = font.sizePx * LINE_HEIGHT_RATIO;
  let cursor = 0;
  const wordRects = widths.map((w): [number, number, number, number] => {
    const x = dir === 'rtl' ? width - cursor - w : cursor;
    cursor += w + unit;
    return [x, 0, w, height];
  });
  return { width, height, wordRects };
};

export interface ChunkLayout {
  lines: string[];
  fontSizePx: number;
  /** مستطيل لكل كلمة بترتيب الكلمات، بإحداثيات الناتج المطلقة؛ y/h = صندوق السطر */
  wordRects: WordRect[];
  /** false عندما لا تتسع المجموعة في maxLines حتى بالحد الأدنى — المستدعي يقسم المجموعة */
  fits: boolean;
}

/** التفاف جشع عند حدود الكلمات فقط (لا كسر داخل كلمة): كلمة أعرض من السطر تأخذ سطراً وحدها. */
function wrap(words: readonly string[], font: CaptionFont, maxWidth: number, measure: MeasureFn): string[][] {
  const lines: string[][] = [];
  let current: string[] = [];
  for (const w of words) {
    if (current.length && measure([...current, w].join(' '), font, 'rtl').width > maxWidth) {
      lines.push(current);
      current = [];
    }
    current.push(w);
  }
  if (current.length) lines.push(current);
  return lines;
}

/**
 * fitFontSize + مستطيلات الكلمات: يبدأ من الأساس المقيَّس وينزل بخطوة 2px حتى الحد الأدنى (42·scale) إلى أن تتسع
 * المجموعة في maxLines أسطر ضمن المنطقة الآمنة. المستطيلات: x/w من القياس (الكلمة في موضعها البصري داخل السطر
 * المتوسّط)، y/h من صندوق السطر الثابت — مفلترة إلى حدود صحيحة تغطي الحروف.
 */
export function layoutChunk(words: readonly string[], rules: CaptionRules, out: OutputSize, measure: MeasureFn): ChunkLayout {
  const scale = captionScale(out);
  const base = Math.max(1, Math.round(rules.fontSizePx * scale));
  const min = Math.min(base, Math.max(1, Math.round(MIN_FONT_SIZE_1080 * scale)));
  const maxLines = Math.max(1, Math.floor(rules.maxLines));
  const maxWidth = Math.round((out.width * rules.safeAreaPct) / 100);

  let size = base;
  let lines: string[][] = [];
  let fits = false;
  for (;;) {
    const font = captionFont(rules.fontFamily, size);
    lines = wrap(words, font, maxWidth, measure);
    fits = lines.length <= maxLines && lines.every((l) => measure(l.join(' '), font, 'rtl').width <= maxWidth);
    if (fits || size <= min) break;
    size = Math.max(min, size - FONT_STEP_PX);
  }

  const font = captionFont(rules.fontFamily, size);
  const block = blockLayout(lines.length, size, out, rules);
  const centerX = out.width / 2;
  const wordRects: WordRect[] = [];
  lines.forEach((line, li) => {
    const m = measure(line.join(' '), font, 'rtl');
    const lineLeft = centerX - m.width / 2;
    const top = block.top + li * block.lineHeight;
    for (let i = 0; i < line.length; i++) {
      const r = m.wordRects[i] ?? [0, 0, m.width, m.height];
      const x = Math.floor(lineLeft + r[0]);
      const right = Math.ceil(lineLeft + r[0] + r[2]);
      wordRects.push([x, top, right - x, block.lineHeight]);
    }
  });
  return { lines: lines.map((l) => l.join(' ')), fontSizePx: size, wordRects, fits };
}
