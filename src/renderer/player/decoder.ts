import type { Rational } from '../../core/time';
import { frameToUs } from '../../core/time';
import { PlayerError } from './demux';
import type { Demuxer } from './demux';

export interface FrameSource {
  /** الإطار المقابل لرقم إطار على شبكة المشروع. الإطار المُعاد مملوك للمصدر: صالح حتى النداء التالي أو dispose، ولا يُغلق خارجياً. */
  getFrame(frameIndex: number): Promise<VideoFrame>;
  dispose(): void;
}

// عدد العينات الإضافية بعد الهدف لتفكيك إعادة الترتيب (B-frames)؛ H.264 يسمح بـ16 مرجعاً كحد أقصى
const LOOKAHEAD = 16;

export async function createFrameSource(demuxer: Demuxer, fps: Rational): Promise<FrameSource> {
  if (typeof VideoDecoder === 'undefined') {
    throw new PlayerError('decoder_unavailable', 'WebCodecs VideoDecoder غير متاح في هذا البناء');
  }
  const config: VideoDecoderConfig = {
    codec: demuxer.codec,
    codedWidth: demuxer.codedWidth,
    codedHeight: demuxer.codedHeight,
    optimizeForLatency: true,
  };
  if (demuxer.description) config.description = demuxer.description;
  const support = await VideoDecoder.isConfigSupported(config);
  if (!support.supported) {
    throw new PlayerError('codec_unsupported', `الترميز ${demuxer.codec} غير مدعوم في هذا الجهاز`);
  }

  const samples = demuxer.samples;
  const pending = new Map<number, VideoFrame>(); // إطارات خرجت ولم تُطلب بعد (بالطابع الزمني)
  type Waiter = { ts: number; resolve: (f: VideoFrame) => void; reject: (e: Error) => void };
  let waiting: Waiter | null = null;
  // دالة مستقلة حتى لا يضيّق TS نوع waiting إلى null بعد فحص الرمي أعلاه
  function takeWaiter(): Waiter | null {
    const w = waiting;
    waiting = null;
    return w;
  }
  let drained: (() => void) | null = null;
  let cached: { sampleIndex: number; frame: VideoFrame } | null = null;
  let fedUpTo = -1; // العينة التالية في ترتيب الفك؛ −1 = لا مسار فك حالياً
  let gopKey = -1;
  let lastError: Error | null = null;

  const decoder = new VideoDecoder({
    output(frame) {
      if (waiting && frame.timestamp === waiting.ts) {
        takeWaiter()?.resolve(frame);
        return;
      }
      pending.get(frame.timestamp)?.close();
      pending.set(frame.timestamp, frame);
      // سقف للذاكرة: نغلق الأقدم إن تجاوزنا 2× اللوكهيد
      if (pending.size > 2 * LOOKAHEAD) {
        const oldest = Math.min(...pending.keys());
        pending.get(oldest)?.close();
        pending.delete(oldest);
      }
    },
    error(e) {
      lastError = new PlayerError('decode_failed', `فشل فك الفيديو: ${e.message}`);
      fedUpTo = -1;
      takeWaiter()?.reject(lastError);
      drained?.();
    },
  });
  decoder.ondequeue = () => {
    if (decoder.decodeQueueSize === 0) drained?.();
  };
  decoder.configure(config);

  function closePending(): void {
    for (const f of pending.values()) f.close();
    pending.clear();
  }

  function restart(key: number): void {
    closePending();
    if (decoder.state === 'closed') throw lastError ?? new PlayerError('decode_failed', 'المفكّك مغلق');
    decoder.reset();
    decoder.configure(config);
    fedUpTo = key;
    gopKey = key;
    lastError = null;
  }

  async function feed(from: number, to: number): Promise<void> {
    const data = await demuxer.readSampleData(from, to);
    for (let i = from; i <= to; i++) {
      const s = samples[i]!;
      decoder.decode(
        new EncodedVideoChunk({
          type: s.isSync ? 'key' : 'delta',
          timestamp: s.ctsUs,
          data: data[i - from]!,
        }),
      );
    }
    fedUpTo = to + 1;
  }

  function takeFrame(sampleIndex: number, frame: VideoFrame): VideoFrame {
    // ما قبل الهدف عرضاً لن يُطلب في التشغيل الأمامي؛ نغلقه
    const ts = samples[sampleIndex]!.ctsUs;
    for (const [k, f] of pending) {
      if (k < ts) {
        f.close();
        pending.delete(k);
      }
    }
    if (cached && cached.frame !== frame) cached.frame.close();
    cached = { sampleIndex, frame };
    return frame;
  }

  async function getFrame(frameIndex: number): Promise<VideoFrame> {
    const target = demuxer.sampleAtUs(frameToUs(frameIndex, fps));
    if (cached?.sampleIndex === target) return cached.frame;
    const ts = samples[target]!.ctsUs;
    const ready = pending.get(ts);
    if (ready) {
      pending.delete(ts);
      return takeFrame(target, ready);
    }
    if (waiting) throw new PlayerError('decode_failed', 'طلب إطار أثناء انتظار إطار آخر');

    const key = demuxer.keyframeAt(target);
    // البحث للخلف أو مجموعة صور مختلفة أو بعد flush/خطأ → إعادة من الإطار المفتاحي
    if (fedUpTo < 0 || key !== gopKey || target < fedUpTo) restart(key);

    const got = new Promise<VideoFrame>((resolve, reject) => {
      waiting = { ts, resolve, reject };
    });
    got.catch(() => undefined);
    // waiting يُصفَّر تزامنياً في output/error — هو إشارة «وصل الهدف»
    const settled = (): boolean => waiting === null;
    const last = Math.min(target + LOOKAHEAD, samples.length - 1);
    if (fedUpTo <= last) await feed(fedUpTo, last);

    // ننتظر فراغ الطابور؛ إن لم يخرج الهدف (إعادة ترتيب أعمق من اللوكهيد أو نهاية الملف) نفرغ المفكّك
    if (!settled() && decoder.decodeQueueSize > 0) {
      await new Promise<void>((resolve) => {
        drained = resolve;
      });
      drained = null;
    }
    // قد يصل output بعد dequeue بمهمة واحدة؛ نمهله قبل اللجوء إلى flush (الذي يُلزمنا بإطار مفتاحي بعده)
    if (!settled()) await new Promise<void>((resolve) => setTimeout(resolve, 0));
    if (!settled() && decoder.state === 'configured') {
      await decoder.flush().catch(() => undefined);
      fedUpTo = -1;
    }
    if (!settled()) {
      takeWaiter()?.reject(
        lastError ?? new PlayerError('decode_failed', `لم يخرج الإطار ${frameIndex} من المفكّك`),
      );
    }
    const frame = await got;
    return takeFrame(target, frame);
  }

  return {
    getFrame,
    dispose() {
      closePending();
      cached?.frame.close();
      cached = null;
      if (decoder.state !== 'closed') decoder.close();
    },
  };
}
