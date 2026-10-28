import { composeFrame, outputSize } from '../../core/captions/compose';
import type { CaptionCue, SourceGeometry } from '../../core/captions/types';
import type { StyleVersion } from '../../core/contracts/types';
import { fontsReady } from '../fonts';

export interface Preview {
  readonly width: number;
  readonly height: number;
  /** يركّب بدقة المصدر على OffscreenCanvas ثم يعرض الناتج مصغّراً في canvas الظاهر؛ frameIndex إطار التايم لاين (الكابشن بإطاراته). */
  /** styleOverride: نمط الجلسة الحالي (US3: تغيير اللون/الخط يظهر في المعاينة فوراً كما في التصدير) */
  draw(frameIndex: number, frame: CanvasImageSource | null, cues: ReadonlyArray<CaptionCue>, styleOverride?: StyleVersion): void;
  /** FNV-1a على بكسلات الـOffscreen (لا الظاهر) — للاختبارات وفحص التطابق (R3). */
  pixelHash(): string;
  /** React يعيد إنشاء canvas عند تبديل الشاشة؛ نعيد الربط بلا إعادة فك. */
  attach(canvas: HTMLCanvasElement): void;
}

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('تعذّر إنشاء سياق 2D');
  return ctx;
}

export function createPreview(initialCanvas: HTMLCanvasElement, source: SourceGeometry, style: StyleVersion): Preview {
  const { width, height } = outputSize(source);
  const off = new OffscreenCanvas(width, height);
  const offCtx = off.getContext('2d', { willReadFrequently: true }); // pixelHash يقرأ البكسلات
  if (!offCtx) throw new Error('تعذّر إنشاء سياق 2D');
  let canvas = initialCanvas;
  let ctx = context2d(canvas);

  // عرض مصغّر بنسبة ثابتة داخل canvas الظاهر (letterbox)
  function blit(): void {
    const scale = Math.min(canvas.width / width, canvas.height / height);
    const dw = Math.round(width * scale);
    const dh = Math.round(height * scale);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(off, 0, 0, width, height, (canvas.width - dw) >> 1, (canvas.height - dh) >> 1, dw, dh);
  }

  return {
    width,
    height,
    draw(frameIndex, frame, cues, styleOverride) {
      // fonts.ready حيّة لا مخبّأة: التصدير يقرأ نفس القيمة (export/run.ts) فيتطابقان
      composeFrame(offCtx, frameIndex, source, frame, cues, styleOverride ?? style, { ready: fontsReady() });
      blit();
    },
    attach(next) {
      if (next === canvas) return;
      ctx = context2d(next);
      canvas = next;
      blit(); // آخر إطار مركّب يظهر فوراً على الـcanvas الجديد
    },
    pixelHash() {
      const data = offCtx.getImageData(0, 0, width, height).data;
      let h = 0x811c9dc5;
      for (let i = 0; i < data.length; i++) {
        h ^= data[i]!;
        h = Math.imul(h, 0x01000193) >>> 0;
      }
      return h.toString(16).padStart(8, '0');
    },
  };
}
