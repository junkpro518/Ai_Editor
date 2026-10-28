import { fontString } from '../../core/captions/layout';
import type { MeasureFn } from '../../core/commands/types';

// قياس النص المحقون إلى core (T061، plan.md §Assumptions، measurements.md S11): Chromium هذا بلا
// TextMetrics.getSelectionRects، فنقيس بـRange.getClientRects() على عنصر مخفي بنفس الخط والاتجاه؛ bidi والتشكيل
// مسؤولية Chromium وحده (R6) — نحن نقرأ المستطيلات فقط. النتيجة تُخزَّن في الكابشن ولا يُعاد القياس عند الرسم.

let host: HTMLDivElement | null = null;
const cache = new Map<string, ReturnType<MeasureFn>>();

function hostElement(): HTMLDivElement {
  if (host?.isConnected) return host;
  const el = document.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  // خارج الشاشة لا display:none (المخفي لا يُقاس)؛ white-space:pre يحفظ المسافات؛ line-height:normal كخط canvas
  el.style.cssText = 'position:absolute;left:-100000px;top:0;visibility:hidden;white-space:pre;line-height:normal;letter-spacing:0;word-spacing:0;padding:0;margin:0;border:0;pointer-events:none';
  document.body.appendChild(el);
  host = el;
  return el;
}

/** [بداية، نهاية) لكل رمز مفصول بمسافات */
function tokenSpans(text: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  const re = /\S+/gu;
  for (let m = re.exec(text); m; m = re.exec(text)) spans.push([m.index, m.index + m[0].length]);
  return spans;
}

/**
 * عرض السلسلة كاملة ومستطيل كل كلمة (اتحاد client rects للكلمة — كلمة مختلطة bidi قد تعطي أكثر من مستطيل)
 * بإحداثيات بصرية نسبة إلى صندوق السطر؛ مخبّأ بـ text|font|dir.
 */
export const measureText: MeasureFn = (text, font, dir) => {
  const fontCss = fontString(font);
  const key = `${dir}|${fontCss}|${text}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const el = hostElement();
  el.dir = dir;
  el.style.font = fontCss;
  el.textContent = text;
  const node = el.firstChild as Text;
  const box = el.getBoundingClientRect();
  const wordRects = tokenSpans(text).map(([start, end]): [number, number, number, number] => {
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, end);
    const rects = Array.from(range.getClientRects());
    if (!rects.length) return [0, 0, 0, box.height];
    const left = Math.min(...rects.map((r) => r.left));
    const right = Math.max(...rects.map((r) => r.right));
    const top = Math.min(...rects.map((r) => r.top));
    const bottom = Math.max(...rects.map((r) => r.bottom));
    return [left - box.left, top - box.top, right - left, bottom - top];
  });
  const result = { width: box.width, height: box.height, wordRects };
  cache.set(key, result);
  return result;
};

/** للاختبارات: تفريغ المخبأ (مثلاً بعد تحميل خط جديد). */
export function clearMeasureCache(): void {
  cache.clear();
}
