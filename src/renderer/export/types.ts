// أنواع التصدير في الواجهة (T050/T051). أنواع main تصل عبر Api العالمي (api.d.ts) لا باستيراد مباشر.
export type ExportFinish = Awaited<ReturnType<Api['export']['finish']>>;
export type ExportStartOptions = Parameters<Api['export']['start']>[1];

/** 'software' = مشفّر Chromium البرمجي (احتياطي فقط — القرار 29)؛ 'ffmpeg:<name>' = المسار الاحتياطي rawvideo */
export type EncoderKind = 'hardware' | 'software' | `ffmpeg:${string}`;

export interface ExportResult extends ExportFinish {
  encoder: EncoderKind;
  /** فك + تركيب + ترميز + إرسال الكتل (قبل الدمج النهائي وفحص التطابق) */
  encodeMs: number;
  /** الزمن الكلي حتى عودة النتيجة بما فيه فحص التطابق */
  elapsedMs: number;
}

export interface ExportError {
  code: string;
  message: string;
}

export type ExportStatus =
  | { phase: 'idle' }
  | { phase: 'running'; outputPath: string; done: number; total: number; encoder: EncoderKind | null }
  | { phase: 'done'; result: ExportResult }
  | { phase: 'cancelled'; outputPath: string }
  | { phase: 'failed'; outputPath: string; error: ExportError };
