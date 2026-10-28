import { withCaptions } from '../captions/derive';
import type { Correction } from '../contracts/types';
import type { CommandImpl } from './types';
import { CommandError } from './types';

/**
 * تصحيح يدوي لكلمة واحدة (FR-013، القرار 21: لا تصحيح تلقائي): `original` يُحفظ عند أول تصحيح فقط، النص الجديد
 * كلمة واحدة بلا مسافات داخلية (مستطيلات الكابشن تُفهرس بالمسافات)، نص الجملة الحاوية يتبع الكلمة، ويُسجَّل
 * Correction word_fix بـ`before` = النص المستبدَل الآن و`after` = الجديد (الاقتباس «قبل → بعد»، لا الأصل الأول —
 * فالتصحيح الثاني يوثّق ما تغيّر فعلاً). ثم يُعاد اشتقاق الكابشن (data-model §1.10).
 */
export const impl: CommandImpl<'transcript.fixWord'> = (project, params, ctx) => {
  const transcript = project.transcript;
  if (!transcript) throw new CommandError('no_transcript', 'لا تفريغ بعد — لا كلمات لتصحيحها');
  const text = params.text.trim();
  if (!text || /\s/u.test(text)) throw new CommandError('invalid_word_text', 'التصحيح كلمة واحدة بلا مسافات');
  const word = transcript.words.find((w) => w.id === params.wordId);
  if (!word) throw new CommandError('word_not_found', `الكلمة ${params.wordId} غير موجودة في التفريغ`);

  const words = transcript.words.map((w) => (w.id === word.id ? { ...w, text, original: w.original ?? w.text, correctedBy: 'user' as const } : w));
  const byId = new Map(words.map((w) => [w.id, w.text]));
  const segments = transcript.segments?.map((s) => (s.wordIds.includes(word.id) && s.text !== undefined ? { ...s, text: s.wordIds.map((id) => byId.get(id) ?? '').join(' ') } : s));
  const correction: Correction = {
    id: ctx.newId(),
    at: ctx.now(),
    actor: 'user',
    kind: 'word_fix',
    quote: `${word.text} → ${text}`,
    before: word.text,
    after: text,
  };
  const next = {
    ...project,
    transcript: { ...transcript, words, ...(segments ? { segments } : {}) },
    corrections: [...project.corrections, correction],
  };
  return { project: withCaptions(next, ctx), description: `صحّح «${word.text}» إلى «${text}»` };
};
