import { transcribeDeepgram } from './deepgram';
import type { TranscribeArgs, TranscribeResult } from './deepgram';
import { transcribeElevenLabs } from './elevenlabs';

export type { TranscribeArgs, TranscribeResult } from './deepgram';
export { ProviderError } from './http';
export type { ProviderErrorCode } from './http';

export type ProviderName = 'deepgram' | 'elevenlabs';
const PROVIDER_NAMES: readonly ProviderName[] = ['deepgram', 'elevenlabs'];

export function isProviderName(v: unknown): v is ProviderName {
  return typeof v === 'string' && (PROVIDER_NAMES as readonly string[]).includes(v);
}

export function transcribe(provider: ProviderName, args: TranscribeArgs): Promise<TranscribeResult> {
  return provider === 'deepgram' ? transcribeDeepgram(args) : transcribeElevenLabs(args);
}
