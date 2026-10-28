import type { Transcript } from '../../contracts/types';
import { ConvertError, clamp01, finishTranscript, isRecord, secondsToUs } from './types';
import type { ConvertMeta, TranscriptWord } from './types';

// شكل الاستجابة الموثَّق: words[] بأنواع word | spacing | audio_event، والثقة logprob (−∞..0) → exp (البحث A §1)
export function fromElevenLabs(raw: unknown, meta: ConvertMeta): Transcript {
  if (!isRecord(raw) || !Array.isArray(raw['words'])) throw new ConvertError('bad_response', 'استجابة ElevenLabs بلا كلمات');

  const words: TranscriptWord[] = [];
  for (const w of raw['words']) {
    if (!isRecord(w)) throw new ConvertError('bad_response', 'كلمة ElevenLabs بشكل غير متوقع');
    if (w['type'] !== 'word') continue; // spacing / audio_event تُحذف
    const text = typeof w['text'] === 'string' ? w['text'].trim() : '';
    if (text === '') continue;
    if (typeof w['start'] !== 'number' || typeof w['end'] !== 'number') throw new ConvertError('bad_response', 'كلمة ElevenLabs بلا توقيت');
    const logprob = w['logprob'];
    words.push({
      id: meta.newId(),
      text,
      startUs: secondsToUs(w['start']),
      endUs: secondsToUs(w['end']),
      confidence: typeof logprob === 'number' ? clamp01(Math.exp(logprob)) : null,
    });
  }

  const detected = raw['language_code'];
  const requested = meta.modelParams['language_code'];
  const language = typeof detected === 'string' ? detected : typeof requested === 'string' ? requested : 'ar';
  return finishTranscript('elevenlabs', language, meta, words);
}
