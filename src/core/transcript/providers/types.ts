import type { Transcript } from '../../contracts/types';
import { validateTranscript } from '../../contracts/validate';

export type ModelParams = Record<string, string | number | boolean>;

/** ما يعرفه المستدعي (مهمة التفريغ) ولا تعرفه استجابة المزود. */
export interface ConvertMeta {
  model: string;
  /** المعاملات كما أُرسلت للمزود (العقد: modelParams «كما أُرسلت») */
  modelParams: ModelParams;
  audioSha256: string;
  createdAt: string;
  /** مدة ملف الصوت المرسَل بالميكروثانية (من الاستخراج، لا من المزود — ElevenLabs لا يرجعها) */
  durationUs: number;
  newId: () => string;
}

export type TranscriptWord = Transcript['words'][number];
export type TranscriptSegment = NonNullable<Transcript['segments']>[number];

export class ConvertError extends Error {
  code: 'bad_response' | 'mip_opt_out_missing';
  constructor(code: ConvertError['code'], message: string) {
    super(message);
    this.name = 'ConvertError';
    this.code = code;
  }
}

export const secondsToUs = (s: number): number => Math.round(s * 1e6);

export function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

const SENTENCE_END = /[.!?؟…]["'»)\]]*$/u;
const SEGMENT_GAP_US = 700_000;

/** جُمل بالترقيم في نهاية الكلمة أو بفجوة ≥ 700 ms بين كلمتين. */
export function buildSegments(words: readonly TranscriptWord[]): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  let current: TranscriptWord[] = [];
  const flush = (): void => {
    const first = current[0];
    const last = current[current.length - 1];
    if (!first || !last) return;
    segments.push({ startUs: first.startUs, endUs: last.endUs, wordIds: current.map((w) => w.id), text: current.map((w) => w.text).join(' ') });
    current = [];
  };
  words.forEach((w, i) => {
    current.push(w);
    const next = words[i + 1];
    if (SENTENCE_END.test(w.text) || !next || next.startUs - w.endUs >= SEGMENT_GAP_US) flush();
  });
  return segments;
}

export function finishTranscript(provider: string, language: string, meta: ConvertMeta, words: TranscriptWord[]): Transcript {
  const transcript: Transcript = {
    schemaVersion: 1,
    provider,
    model: meta.model,
    modelParams: meta.modelParams,
    audioSha256: meta.audioSha256,
    language,
    durationUs: meta.durationUs,
    createdAt: meta.createdAt,
    words,
    segments: buildSegments(words),
  };
  validateTranscript(transcript);
  return transcript;
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
