import type { StyleVersion } from '../contracts/types';
import type { CaptionCue, Compose2D, Fonts, SourceGeometry } from './types';

/** حجم canvas الناتج: يُبدَّل العرض والارتفاع عند 90/270. */
export function outputSize(source: SourceGeometry): { width: number; height: number } {
  const r = source.rotation ?? 0;
  return r === 90 || r === 270 ? { width: source.height, height: source.width } : { width: source.width, height: source.height };
}

/**
 * دالة التركيب الموحدة (الدستور IV، بحث B §3): المعاينة والتصدير يستدعيانها بنفس المدخلات.
 * نقية وحتمية: لا ساعة، لا عشوائية، لا rAF. canvas الناتج بحجم outputSize(source) — مسؤولية المستدعي.
 * الإصدار الأول يرسم الفيديو فقط؛ الكابشن في US2 (`cues` تُستلم الآن حتى لا يتغير العقد لاحقاً).
 */
export function composeFrame(
  ctx: Compose2D,
  _frameIndex: number,
  source: SourceGeometry,
  frame: CanvasImageSource | null,
  _cues: ReadonlyArray<CaptionCue>,
  _style: StyleVersion,
  _fonts: Fonts,
): void {
  const { width: W, height: H } = outputSize(source);
  ctx.clearRect(0, 0, W, H);
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
