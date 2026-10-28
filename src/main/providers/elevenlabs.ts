import { postMultipart } from './http';
import type { TranscribeArgs, TranscribeResult } from './deepgram';
import type { ModelParams } from '../../core/transcript/providers/types';

const ELEVENLABS_URL = 'https://api.elevenlabs.io';

export async function transcribeElevenLabs(a: TranscribeArgs): Promise<TranscribeResult> {
  const modelParams: ModelParams = { model_id: a.model, timestamps_granularity: 'word', language_code: a.language };
  const fields: Record<string, string> = {};
  for (const [k, v] of Object.entries(modelParams)) fields[k] = String(v);
  const { json } = await postMultipart(
    new URL('/v1/speech-to-text', a.baseUrl ?? ELEVENLABS_URL).toString(),
    { headers: { 'xi-api-key': a.apiKey }, fields, file: { path: a.audioPath, filename: 'audio.webm', contentType: 'audio/webm' } },
    { signal: a.signal },
  );
  return { raw: json, modelParams };
}
