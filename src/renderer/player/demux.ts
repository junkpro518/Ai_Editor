import { createFile, DataStream, Endianness, MP4BoxBuffer } from 'mp4box';
import type { ISOFile, Movie, MultiBufferStream, Track, VisualSampleEntry } from 'mp4box';

/** أخطاء المشغّل برمز ثابت ورسالة عربية (الموجز، القاعدة 6). */
export class PlayerError extends Error {
  constructor(
    public code:
      'decoder_unavailable' | 'codec_unsupported' | 'no_video_track' | 'fetch_failed' | 'decode_failed',
    message: string,
  ) {
    super(message);
    this.name = 'PlayerError';
  }
}

/** عينة فيديو واحدة بترتيب الفك؛ الأزمنة بالميكروثانية الصحيحة. */
export interface VideoSample {
  index: number;
  ctsUs: number;
  dtsUs: number;
  isSync: boolean;
  offset: number;
  size: number;
}

export interface Demuxer {
  codec: string;
  /** محتوى avcC/hvcC بلا رأس الصندوق (description لـVideoDecoder)؛ غائب لـavc3/hev1 (المعاملات داخل التيار). */
  description: Uint8Array | undefined;
  codedWidth: number;
  codedHeight: number;
  /** بترتيب الفك (dts). */
  samples: readonly VideoSample[];
  /** فهرس آخر عينة طابعها cts ≤ us (قاعدة VFR، data-model §5)؛ أول عينة عرضاً إن لم توجد. */
  sampleAtUs(us: number): number;
  /** آخر عينة مفتاحية ≤ index بترتيب الفك. */
  keyframeAt(index: number): number;
  /** بايتات العينات من from إلى to (شاملة) بترتيب الفك — طلب Range واحد مجمَّع. */
  readSampleData(from: number, to: number): Promise<Uint8Array[]>;
}

const PARSE_CHUNK = 2 * 1024 * 1024; // moov: نقرأ مليونَي بايت في الطلب (الموجز: 1–4 MB)

interface RangeResult {
  bytes: ArrayBuffer;
  total: number | undefined;
}

/**
 * طلب Range على media:// (206 + Content-Range). بعض المخططات (file:// في Chromium) تُلبّي الـRange لكن
 * تردّ 200 بلا Content-Range؛ وأخرى تتجاهله وتعيد الملف كله. نميّز بالطول: جسم أطول من المطلوب = ملف كامل.
 */
async function fetchRange(url: string, start: number, endInclusive: number): Promise<RangeResult> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { Range: `bytes=${start}-${endInclusive}` } });
  } catch (e) {
    throw new PlayerError(
      'fetch_failed',
      `تعذّر قراءة الوسائط: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  if (res.status === 206) {
    const m = /\/(\d+)\s*$/.exec(res.headers.get('content-range') ?? '');
    return { bytes: await res.arrayBuffer(), total: m ? Number(m[1]) : undefined };
  }
  if (res.status !== 200) {
    throw new PlayerError('fetch_failed', `الخادم رفض قراءة الوسائط (HTTP ${res.status})`);
  }
  const body = await res.arrayBuffer();
  const wanted = endInclusive - start + 1;
  if (body.byteLength > wanted) {
    // الملف كله: نقتطع المطلوب ونعرف الحجم الكلي
    return { bytes: body.slice(start, endInclusive + 1), total: body.byteLength };
  }
  return { bytes: body, total: undefined };
}

function parseMoov(url: string): Promise<{ file: ISOFile; info: Movie }> {
  return new Promise((resolve, reject) => {
    const file = createFile(false);
    let done = false;
    file.onError = (_module, message) => {
      done = true;
      reject(new PlayerError('fetch_failed', `ملف MP4 غير مقروء: ${message}`));
    };
    file.onReady = (info) => {
      done = true;
      resolve({ file, info });
    };
    (async () => {
      let pos = 0;
      let total: number | undefined;
      while (!done) {
        if (total !== undefined && pos >= total) {
          file.flush();
          if (!done) reject(new PlayerError('fetch_failed', 'لم يُعثر على صندوق moov في الملف'));
          return;
        }
        const r = await fetchRange(url, pos, pos + PARSE_CHUNK - 1);
        total = r.total ?? total;
        if (r.bytes.byteLength === 0) {
          file.flush();
          if (!done) reject(new PlayerError('fetch_failed', 'لم يُعثر على صندوق moov في الملف'));
          return;
        }
        const next = file.appendBuffer(MP4BoxBuffer.fromArrayBuffer(r.bytes, pos));
        pos = typeof next === 'number' && next > pos ? next : pos + r.bytes.byteLength;
      }
    })().catch(reject);
  });
}

function codecDescription(file: ISOFile, track: Track): Uint8Array | undefined {
  const entry = file.getTrackById(track.id).mdia.minf.stbl.stsd.entries[0] as VisualSampleEntry | undefined;
  const box = entry?.avcC ?? entry?.hvcC;
  if (!box) return undefined;
  const ds = new DataStream(undefined, 0, Endianness.BIG_ENDIAN);
  box.write(ds as unknown as MultiBufferStream);
  // أول 8 بايتات رأس الصندوق (size + fourcc)؛ VideoDecoder يريد المحتوى فقط
  return new Uint8Array(ds.buffer, 8, ds.byteLength - 8).slice();
}

export async function openDemuxer(url: string): Promise<Demuxer> {
  const { file, info } = await parseMoov(url);
  const track = info.videoTracks[0];
  if (!track) throw new PlayerError('no_video_track', 'لا يوجد مسار فيديو في الملف');
  const ts = track.timescale;
  // قائمة التحرير (x264/الجوال مع B-frames): نطرح media_time حتى يبدأ العرض من 0
  const edit = track.edits?.[0];
  const mediaTime = edit && edit.media_time > 0 ? edit.media_time : 0;
  const toUs = (t: number): number => Math.round(((t - mediaTime) * 1e6) / ts);

  const samples: VideoSample[] = file.getTrackSamplesInfo(track.id).map((s, index) => ({
    index,
    ctsUs: toUs(s.cts),
    dtsUs: Math.round((s.dts * 1e6) / ts),
    isSync: s.is_sync,
    offset: s.offset,
    size: s.size,
  }));
  if (samples.length === 0) throw new PlayerError('no_video_track', 'مسار الفيديو بلا عينات');
  const byCts = [...samples].sort((a, b) => a.ctsUs - b.ctsUs);

  return {
    codec: track.codec,
    description: codecDescription(file, track),
    codedWidth: track.video?.width ?? track.track_width,
    codedHeight: track.video?.height ?? track.track_height,
    samples,
    sampleAtUs(us) {
      // بحث ثنائي: آخر عينة cts ≤ us
      let lo = 0;
      let hi = byCts.length - 1;
      let best = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (byCts[mid]!.ctsUs <= us) {
          best = mid;
          lo = mid + 1;
        } else hi = mid - 1;
      }
      return byCts[best < 0 ? 0 : best]!.index;
    },
    keyframeAt(index) {
      for (let i = index; i >= 0; i--) if (samples[i]!.isSync) return i;
      return 0;
    },
    async readSampleData(from, to) {
      const first = samples[from]!;
      const last = samples[to]!;
      let start = first.offset;
      let end = last.offset + last.size - 1;
      for (let i = from; i <= to; i++) {
        const s = samples[i]!;
        start = Math.min(start, s.offset);
        end = Math.max(end, s.offset + s.size - 1);
      }
      const { bytes } = await fetchRange(url, start, end);
      const out: Uint8Array[] = [];
      for (let i = from; i <= to; i++) {
        const s = samples[i]!;
        out.push(new Uint8Array(bytes, s.offset - start, s.size));
      }
      return out;
    },
  };
}
