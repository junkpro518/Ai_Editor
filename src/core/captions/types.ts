import type { ProjectDocument } from '../contracts/types';

export type CaptionCue = ProjectDocument['captions']['cues'][number];

/** أبعاد المسار الخام قبل الدوران؛ `rotation` عكس عقارب الساعة 0/90/180/270 (data-model §5). */
export interface SourceGeometry {
  width: number;
  height: number;
  rotation?: number;
}

/** الخطوط تُحمَّل قبل الإطار 0 خارج دالة التركيب (بحث B §3). */
export interface Fonts {
  ready: boolean;
}

/** السياق قد يكون OffscreenCanvas (المعاينة والتصدير) أو canvas عادي؛ أنواع فقط من lib.dom. */
export type Compose2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export type CaptionPosition = 'bottom' | 'center' | 'top';

/** قيم قواعد captions.* من النمط المثبّت بعد التضييق (layout.ts readCaptionRules). */
export interface CaptionRules {
  enabled: boolean;
  fontFamily: string;
  /** أساس لـ1080p؛ يُقاس بـcaptionScale */
  fontSizePx: number;
  position: CaptionPosition;
  maxLines: number;
  wordsPerChunk: { min: number; max: number };
  breakAtPauseUs: number;
  highlightCurrent: boolean;
  textColor: string;
  highlightColor: string;
  bgColor: string;
  safeAreaPct: number;
}

/** [x, y, w, h] بالبكسل بدقة الناتج */
export type WordRect = [number, number, number, number];

/** عتبة «منخفض الثقة» الافتراضية عندما لا يوجد ملف تعريف للمزود في الإعدادات (FR-013؛ تُحسب عند العرض). */
export const DEFAULT_LOW_CONFIDENCE_THRESHOLD = 0.6;
