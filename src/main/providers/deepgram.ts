import { readFile } from 'node:fs/promises';
import { postBody } from './http';
import type { ModelParams } from '../../core/transcript/providers/types';

export interface TranscribeArgs {
  audioPath: string;
  apiKey: string;
  /** Deepgram: 'ar-SA' | 'multi' …؛ ElevenLabs: 'ar' */
  language: string;
  model: string;
  /** للاختبار فقط: خادم محلي بدل المزود */
  baseUrl?: string;
  signal?: AbortSignal;
}

export interface TranscribeResult {
  raw: unknown;
  /** المعاملات كما أُرسلت حرفياً → Transcript.modelParams */
  modelParams: ModelParams;
}

const DEEPGRAM_URL = 'https://api.deepgram.com';

export async function transcribeDeepgram(a: TranscribeArgs): Promise<TranscribeResult> {
  // mip_opt_out=true في كل طلب (المبدأ V، البحث A): لا يعتمد على إعدادات حساب المستخدم
  const modelParams: ModelParams = { model: a.model, language: a.language, punctuate: true, smart_format: false, mip_opt_out: true };
  const url = new URL('/v1/listen', a.baseUrl ?? DEEPGRAM_URL);
  for (const [k, v] of Object.entries(modelParams)) url.searchParams.set(k, String(v));
  const body = await readFile(a.audioPath);
  const { json } = await postBody(
    url.toString(),
    { headers: { authorization: `Token ${a.apiKey}` }, body, contentType: 'audio/webm' },
    { signal: a.signal },
  );
  return { raw: json, modelParams };
}
