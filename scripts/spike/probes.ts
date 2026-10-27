// دوال تُنفَّذ داخل صفحة التطبيق عبر page.evaluate(fn, arg) (Spike R10، T031/T032).
// قاعدة صارمة: كل دالة مكتفية بذاتها — Playwright يسلسل نص الدالة فقط، فلا استيراد ولا ثوابت خارجية
// ولا نداء لدالة أخرى من هذا الملف؛ كل ما تحتاجه يمرّ في الوسيط الوحيد.

export interface DecoderProbe {
  supported: boolean | null;
  error?: string;
}

/** S4: دعم فكّ قائمة ترميزات (1080p). */
export async function probeDecoders(codecs: string[]): Promise<Record<string, DecoderProbe>> {
  const out: Record<string, DecoderProbe> = {};
  if (typeof VideoDecoder === 'undefined') {
    for (const c of codecs) out[c] = { supported: null, error: 'VideoDecoder غير موجود' };
    return out;
  }
  for (const c of codecs) {
    try {
      const r = await VideoDecoder.isConfigSupported({ codec: c, codedWidth: 1920, codedHeight: 1080 });
      out[c] = { supported: r.supported === true };
    } catch (e) {
      out[c] = { supported: null, error: e instanceof Error ? e.message : String(e) };
    }
  }
  return out;
}

export interface EncoderProbe {
  request: VideoEncoderConfig;
  supported: boolean | null;
  config?: VideoEncoderConfig;
  error?: string;
}

/** S5: دعم ترميز قائمة إعدادات (مع الإعداد الذي يعيده المتصفح). */
export async function probeEncoders(configs: VideoEncoderConfig[]): Promise<EncoderProbe[]> {
  const out: EncoderProbe[] = [];
  for (const request of configs) {
    if (typeof VideoEncoder === 'undefined') {
      out.push({ request, supported: null, error: 'VideoEncoder غير موجود' });
      continue;
    }
    try {
      const r = await VideoEncoder.isConfigSupported(request);
      out.push({ request, supported: r.supported === true, config: r.config });
    } catch (e) {
      out.push({ request, supported: null, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return out;
}

export interface ArabicLineArg {
  text: string;
  /** TTF بترميز base64؛ يُحمَّل بـnew FontFace(name, ArrayBuffer) فلا يمرّ عبر CSP (لا fetch). */
  fontBase64: string;
  family: string;
  sizePx: number;
  width: number;
  height: number;
  /** عائلة الخط التي تحمّلها الواجهة من CSS (للمقارنة). */
  appFamily: string;
}

export interface ArabicLineResult {
  pngDataUrl: string;
  pixelHash: string;
  fontLoaded: boolean;
  appFontCheck: boolean;
  measured: {
    width: number;
    actualBoundingBoxLeft: number;
    actualBoundingBoxRight: number;
    actualBoundingBoxAscent: number;
    actualBoundingBoxDescent: number;
    fontBoundingBoxAscent: number;
    fontBoundingBoxDescent: number;
  };
  /** واجهات تحديد مستطيلات الكلمات (T061): TextMetrics الجديدة أم الرجوع إلى Range.getClientRects. */
  apis: Record<string, boolean>;
  userAgent: string;
}

/** S11: رسم سطر عربي/إنجليزي/أرقام مختلط على canvas 1080p بـdirection rtl وtextAlign center. */
export async function renderArabicLine(arg: ArabicLineArg): Promise<ArabicLineResult> {
  const bin = atob(arg.fontBase64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  let fontLoaded = false;
  try {
    const face = new FontFace(arg.family, bytes.buffer);
    await face.load();
    document.fonts.add(face);
    fontLoaded = face.status === 'loaded';
  } catch {
    fontLoaded = false;
  }
  const fontSpec = `400 ${arg.sizePx}px '${arg.family}'`;
  await document.fonts.load(fontSpec).catch(() => undefined);
  const appFontCheck = document.fonts.check(`400 ${arg.sizePx}px '${arg.appFamily}'`);

  const canvas = document.createElement('canvas');
  canvas.width = arg.width;
  canvas.height = arg.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('تعذّر إنشاء سياق 2D');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, arg.width, arg.height);
  ctx.font = fontSpec;
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#fff';
  // 100px من الأسفل (R6: 80–120px لـ1080p)
  ctx.fillText(arg.text, arg.width / 2, arg.height - 100);
  const m = ctx.measureText(arg.text);

  const data = ctx.getImageData(0, 0, arg.width, arg.height).data;
  let h = 0x811c9dc5;
  for (let i = 0; i < data.length; i++) {
    h ^= data[i]!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  const mAny = m as unknown as Record<string, unknown>;
  const apis: Record<string, boolean> = {
    'TextMetrics.getSelectionRects': typeof mAny['getSelectionRects'] === 'function',
    'TextMetrics.getTextClusters': typeof mAny['getTextClusters'] === 'function',
    'TextMetrics.getActualBoundingBox': typeof mAny['getActualBoundingBox'] === 'function',
    'TextMetrics.getIndexFromOffset': typeof mAny['getIndexFromOffset'] === 'function',
    'Range.getClientRects': typeof Range.prototype.getClientRects === 'function',
    'CanvasRenderingContext2D.direction': 'direction' in ctx,
  };
  return {
    pngDataUrl: canvas.toDataURL('image/png'),
    pixelHash: h.toString(16).padStart(8, '0'),
    fontLoaded,
    appFontCheck,
    measured: {
      width: m.width,
      actualBoundingBoxLeft: m.actualBoundingBoxLeft,
      actualBoundingBoxRight: m.actualBoundingBoxRight,
      actualBoundingBoxAscent: m.actualBoundingBoxAscent,
      actualBoundingBoxDescent: m.actualBoundingBoxDescent,
      fontBoundingBoxAscent: m.fontBoundingBoxAscent,
      fontBoundingBoxDescent: m.fontBoundingBoxDescent,
    },
    apis,
    userAgent: navigator.userAgent,
  };
}

// ---- المشغّل الحقيقي للتطبيق (src/renderer/player) عبر window.__test / window.__preview ----

type ImportResult = { ok: true; projectId: string } | { ok: false; code: string; message: string };
interface SpikeWindow {
  __test?: { importPath(path: string): Promise<ImportResult>; frame?(i: number): Promise<unknown> };
  __preview?: { show(projectId: string, frameIndex: number): Promise<void> | void };
  __spike?: { chunks: Uint8Array[]; done: boolean; error?: string };
}

export interface MountArg {
  path: string;
  /** حجم canvas الظاهر = حجم ناتج التركيب → blit في preview.ts نسخة 1:1 من OffscreenCanvas. */
  width: number;
  height: number;
}

/** يستورد ملفاً بالمسار الكامل ويركّب المعاينة على canvas بحجم الناتج، ويعيد زمن الاستيراد (probe في main ضمنه). */
export async function importAndMount(
  arg: MountArg,
): Promise<{ ok: true; projectId: string; importMs: number; firstFrameMs: number } | { ok: false; code: string; message: string }> {
  const w = window as unknown as SpikeWindow;
  if (!w.__test) return { ok: false, code: 'no_test_hook', message: 'window.__test غير موجود — شغّل بـAI_EDITOR_TEST=1' };
  const t0 = performance.now();
  const imported = await w.__test.importPath(arg.path);
  const importMs = performance.now() - t0;
  if (!imported.ok) return imported;
  // شاشة الاستيراد تُفكّ بعد الاستيراد؛ findCanvas في player/index.ts يلتقط #preview-canvas إن وُجد
  document.getElementById('preview-canvas')?.remove();
  const canvas = document.createElement('canvas');
  canvas.id = 'preview-canvas';
  canvas.width = arg.width;
  canvas.height = arg.height;
  document.body.appendChild(canvas);
  const t1 = performance.now();
  for (let i = 0; i < 100 && !w.__preview; i++) await new Promise((r) => setTimeout(r, 100));
  if (!w.__preview) return { ok: false, code: 'no_preview', message: 'window.__preview غير موجود' };
  await w.__preview.show(imported.projectId, 0);
  return { ok: true, projectId: imported.projectId, importMs, firstFrameMs: performance.now() - t1 };
}

/** يعرض إطاراً واحداً (فك + تركيب + blit) ويعيد زمنه بالمللي ثانية. */
export async function showFrame(arg: { projectId: string; frame: number }): Promise<{ ms: number; error?: string }> {
  const w = window as unknown as SpikeWindow;
  const t0 = performance.now();
  try {
    await w.__preview!.show(arg.projectId, arg.frame);
    return { ms: performance.now() - t0 };
  } catch (e) {
    return { ms: performance.now() - t0, error: e instanceof Error ? e.message : String(e) };
  }
}

/** S10 (رجل الفك): فك + تركيب متتابع للإطارات [from, to) بلا ترميز. */
export async function decodeComposeLoop(arg: { projectId: string; from: number; to: number }): Promise<{ frames: number; ms: number }> {
  const w = window as unknown as SpikeWindow;
  const t0 = performance.now();
  for (let i = arg.from; i < arg.to; i++) await w.__preview!.show(arg.projectId, i);
  return { frames: arg.to - arg.from, ms: performance.now() - t0 };
}

export interface EncodeLoopArg {
  projectId: string;
  from: number;
  to: number;
  fps: { num: number; den: number };
  config: VideoEncoderConfig;
  keyInterval: number;
  /** إطارات تُحفَظ صورتها المركّبة PNG كمرجع لفحص PSNR/SSIM (R3 الطبقة 2). */
  refFrames: number[];
  maxQueue: number;
}

export interface EncodeLoopResult {
  frames: number;
  ms: number;
  chunks: number;
  bytes: number;
  /** زمن أول وآخر خرج من المشفّر منذ بداية الحلقة */
  firstOutputMs: number;
  lastOutputMs: number;
  refs: Array<{ frame: number; pngDataUrl: string }>;
  error?: string;
}

/**
 * S10 (السلسلة كاملة): فك → composeFrame (عبر المشغّل) → VideoFrame من canvas الناتج → VideoEncoder (Annex-B).
 * الكتل تُجمع في window.__spike.chunks ويسحبها Node بالتوازي (pullChunks) إلى stdin لـFFmpeg.
 */
export async function encodeLoop(arg: EncodeLoopArg): Promise<EncodeLoopResult> {
  const w = window as unknown as SpikeWindow;
  const canvas = document.getElementById('preview-canvas') as HTMLCanvasElement | null;
  if (!canvas) throw new Error('#preview-canvas غير موجود — استدعِ importAndMount أولاً');
  const sink: NonNullable<SpikeWindow['__spike']> = { chunks: [], done: false };
  w.__spike = sink;
  const t0 = performance.now();
  let chunks = 0;
  let bytes = 0;
  let firstOutputMs = -1;
  let lastOutputMs = -1;
  let encError: string | undefined;
  const encoder = new VideoEncoder({
    output(chunk) {
      const buf = new Uint8Array(chunk.byteLength);
      chunk.copyTo(buf);
      sink.chunks.push(buf);
      chunks++;
      bytes += buf.byteLength;
      const now = performance.now() - t0;
      if (firstOutputMs < 0) firstOutputMs = now;
      lastOutputMs = now;
    },
    error(e) {
      encError = e.message;
    },
  });
  const refSet = new Set(arg.refFrames);
  const refs: Array<{ frame: number; pngDataUrl: string }> = [];
  try {
    encoder.configure(arg.config);
    for (let i = arg.from; i < arg.to && !encError; i++) {
      await w.__preview!.show(arg.projectId, i);
      if (refSet.has(i)) refs.push({ frame: i, pngDataUrl: canvas.toDataURL('image/png') });
      // أول ميكروثانية داخل الإطار (frameToUs = ceil)
      const timestamp = Math.ceil((i * arg.fps.den * 1e6) / arg.fps.num);
      const frame = new VideoFrame(canvas, { timestamp });
      encoder.encode(frame, { keyFrame: (i - arg.from) % arg.keyInterval === 0 });
      frame.close();
      // ضغط رجعي: لا نسبق المشفّر بأكثر من maxQueue إطاراً وإلا تنتفخ الذاكرة ويفسد القياس
      while (encoder.encodeQueueSize > arg.maxQueue && !encError) {
        await new Promise<void>((r) => encoder.addEventListener('dequeue', () => r(), { once: true }));
      }
    }
    if (!encError) await encoder.flush();
  } catch (e) {
    encError = encError ?? (e instanceof Error ? e.message : String(e));
  } finally {
    if (encoder.state !== 'closed') encoder.close();
    sink.done = true;
    if (encError) sink.error = encError;
  }
  const result: EncodeLoopResult = {
    frames: arg.to - arg.from,
    ms: performance.now() - t0,
    chunks,
    bytes,
    firstOutputMs,
    lastOutputMs,
    refs,
  };
  if (encError) result.error = encError;
  return result;
}

/** يسحب الكتل المجمّعة (مدموجة في مصفوفة واحدة) — يستدعيه Node دورياً أثناء encodeLoop. */
export function pullChunks(): { data: Uint8Array; done: boolean; error?: string } {
  const w = window as unknown as SpikeWindow;
  const sink = w.__spike;
  if (!sink) return { data: new Uint8Array(0), done: false };
  const parts = sink.chunks;
  sink.chunks = [];
  let total = 0;
  for (const p of parts) total += p.byteLength;
  const data = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    data.set(p, off);
    off += p.byteLength;
  }
  const out: { data: Uint8Array; done: boolean; error?: string } = { data, done: sink.done };
  if (sink.error) out.error = sink.error;
  return out;
}
