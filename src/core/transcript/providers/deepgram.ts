import type { Transcript } from '../../contracts/types';
import { ConvertError, clamp01, finishTranscript, isRecord, secondsToUs } from './types';
import type { ConvertMeta, TranscriptWord } from './types';

// شكل الاستجابة الموثَّق: results.channels[0].alternatives[0].words[] (البحث A §1)
interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  confidence?: number;
  punctuated_word?: string;
  language?: string;
}

function wordsOf(raw: unknown): unknown[] {
  if (!isRecord(raw) || !isRecord(raw['results'])) throw new ConvertError('bad_response', 'استجابة Deepgram بلا results');
  const channels = raw['results']['channels'];
  const channel = Array.isArray(channels) ? channels[0] : undefined;
  const alternatives = isRecord(channel) ? channel['alternatives'] : undefined;
  const alt = Array.isArray(alternatives) ? alternatives[0] : undefined;
  const words = isRecord(alt) ? alt['words'] : undefined;
  if (!Array.isArray(words)) throw new ConvertError('bad_response', 'استجابة Deepgram بلا كلمات');
  return words;
}

function isDeepgramWord(w: unknown): w is DeepgramWord {
  return isRecord(w) && typeof w['word'] === 'string' && typeof w['start'] === 'number' && typeof w['end'] === 'number';
}

export function fromDeepgram(raw: unknown, meta: ConvertMeta): Transcript {
  // المبدأ V: الخروج من برنامج تحسين النماذج شرط لا خيار
  if (meta.modelParams['mip_opt_out'] !== true) throw new ConvertError('mip_opt_out_missing', 'طلب Deepgram بلا mip_opt_out=true');

  const words: TranscriptWord[] = [];
  for (const w of wordsOf(raw)) {
    if (!isDeepgramWord(w)) throw new ConvertError('bad_response', 'كلمة Deepgram بشكل غير متوقع');
    const text = (w.punctuated_word?.trim() || w.word).trim();
    if (text === '') continue;
    const word: TranscriptWord = {
      id: meta.newId(),
      text,
      startUs: secondsToUs(w.start),
      endUs: secondsToUs(w.end),
      confidence: typeof w.confidence === 'number' ? clamp01(w.confidence) : null,
    };
    if (typeof w.language === 'string') word.lang = w.language; // في وضع multi فقط
    words.push(word);
  }

  const language = meta.modelParams['language'];
  return finishTranscript('deepgram', typeof language === 'string' ? language : 'ar', meta, words);
}
