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
