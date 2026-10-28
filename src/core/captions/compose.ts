import type { StyleVersion } from '../contracts/types';
import { blockLayout, captionFont, fontString, readCaptionRules } from './layout';
import type { CaptionCue, Compose2D, Fonts, SourceGeometry } from './types';

/** حجم canvas الناتج: يُبدَّل العرض والارتفاع عند 90/270. */
export function outputSize(source: SourceGeometry): { width: number; height: number } {
  const r = source.rotation ?? 0;
  return r === 90 || r === 270 ? { width: source.height, height: source.width } : { width: source.width, height: source.height };
}

/**
 * دالة التركيب الموحدة (الدستور IV، بحث B §3): المعاينة والتصدير يستدعيانها بنفس المدخلات.
 * نقية وحتمية: لا ساعة، لا عشوائية، لا rAF. canvas الناتج بحجم outputSize(source) — مسؤولية المستدعي.
 * الترتيب ثابت: الفيديو (بالدوران) ثم الكابشن النشط عند frameIndex في فضاء الناتج.
 */
export function composeFrame(
  ctx: Compose2D,
  frameIndex: number,
  source: SourceGeometry,
  frame: CanvasImageSource | null,
  cues: ReadonlyArray<CaptionCue>,
  style: StyleVersion,
  fonts: Fonts,
): void {
  const { width: W, height: H } = outputSize(source);
  ctx.clearRect(0, 0, W, H);
  drawVideo(ctx, source, frame, W, H);
  drawCaptions(ctx, frameIndex, W, H, cues, style, fonts);
}

function drawVideo(ctx: Compose2D, source: SourceGeometry, frame: CanvasImageSource | null, W: number, H: number): void {
  if (!frame) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    return;
  }
  const rotation = source.rotation ?? 0;
  if (rotation === 0) {
    ctx.drawImage(frame, 0, 0, source.width, source.height);
    return;
  }
  // الدوران عكس عقارب الساعة. في canvas (y للأسفل) rotate(+θ) يدور مع عقارب الساعة، لذا الزاوية سالبة.
  // تحقق لـ90: translate(0,H) ثم rotate(−π/2) تنقل نقطة خام (x,y) إلى (y, H−x)؛ الحافة العلوية الخام
  // (y=0، x من 0 إلى w) تصير الحافة اليسرى للناتج (x=0) — أعلى الإطار الخام على اليسار كما يلزم.
  // 180: (x,y)→(W−x, H−y). 270 (= 90 مع عقارب الساعة): translate(W,0) ثم rotate(−3π/2): (x,y)→(W−y, x)،
  // فأعلى الإطار الخام يصير الحافة اليمنى.
  ctx.save();
  if (rotation === 90) {
    ctx.translate(0, H);
    ctx.rotate(-Math.PI / 2);
  } else if (rotation === 180) {
    ctx.translate(W, H);
    ctx.rotate(-Math.PI);
  } else {
    ctx.translate(W, 0);
    ctx.rotate(-(3 * Math.PI) / 2);
  }
  ctx.drawImage(frame, 0, 0, source.width, source.height);
  ctx.restore();
}

/** الكابشن الذي يحوي الإطار (startFrame ≤ f < endFrame) ببحث ثنائي؛ الكابشن مرتب بلا تداخل (derive). */
export function findActiveCue(cues: ReadonlyArray<CaptionCue>, frameIndex: number): CaptionCue | null {
  let lo = 0;
  let hi = cues.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid]!.startFrame <= frameIndex) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  if (found < 0) return null;
  const cue = cues[found]!;
  return frameIndex < cue.endFrame ? cue : null;
}

const SCRIM_PADDING_RATIO = 0.35;
const SCRIM_RADIUS_RATIO = 0.25;

/**
 * الكابشن (T062، R6): scrim ثم كل سطر سلسلة واحدة بـdirection='rtl' متوسّطة (bidi مسؤولية Chromium — ممنوع
 * تقسيم النص أو عكسه)، ثم إبراز الكلمة النشطة بإعادة رسم سطرها مقصوصاً على مستطيلها المخزَّن في الكابشن.
 * يُرسم فقط عندما الخطوط جاهزة (لا نرسم بخط بديل ثم نبدّل).
 */
function drawCaptions(ctx: Compose2D, frameIndex: number, W: number, H: number, cues: ReadonlyArray<CaptionCue>, style: StyleVersion, fonts: Fonts): void {
  if (!fonts.ready || cues.length === 0) return;
  const cue = findActiveCue(cues, frameIndex);
  if (!cue || cue.lines.length === 0) return;
  const rules = readCaptionRules(style);
  const block = blockLayout(cue.lines.length, cue.fontSizePx, { width: W, height: H }, rules);
  const pad = Math.round(cue.fontSizePx * SCRIM_PADDING_RATIO);

  ctx.fillStyle = rules.bgColor;
  ctx.beginPath();
  ctx.roundRect(block.left - pad, block.top - pad, block.width + 2 * pad, block.height + 2 * pad, Math.round(cue.fontSizePx * SCRIM_RADIUS_RATIO));
  ctx.fill();

  ctx.font = fontString(captionFont(rules.fontFamily, cue.fontSizePx));
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const cx = W / 2;
  const lineY = (i: number): number => block.top + i * block.lineHeight + block.baseline;
  ctx.fillStyle = rules.textColor;
  cue.lines.forEach((line, i) => ctx.fillText(line, cx, lineY(i)));

  const rects = cue.activeWordRects;
  if (!rules.highlightCurrent || !rects || rects.length === 0) return;
  const first = rects[0]!;
  const lineIndex = Math.min(cue.lines.length - 1, Math.max(0, Math.floor(((first[1] ?? 0) - block.top) / block.lineHeight)));
  ctx.save();
  ctx.beginPath();
  for (const r of rects) ctx.rect(r[0] ?? 0, r[1] ?? 0, r[2] ?? 0, r[3] ?? 0);
  ctx.clip();
  ctx.fillStyle = rules.highlightColor;
  ctx.fillText(cue.lines[lineIndex]!, cx, lineY(lineIndex));
  ctx.restore();
}
