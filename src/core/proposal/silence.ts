import type { Candidate, CutRules, Word } from './types';

/** أقل صمت يُقترح بعد حماية الحواف */
const MIN_SILENCE_US = 100_000;

/**
 * فجوة بين كلمتين متتاليتين > silenceMaxUs → بند [نهاية السابقة + حماية، بداية التالية − حماية]،
 * مع صمت البداية (من 0) وصمت النهاية (حتى durationUs) — الحالة الحدّية في المواصفة.
 */
export function detectSilence(words: readonly Word[], durationUs: number, rules: CutRules): Candidate[] {
  const out: Candidate[] = [];
  const push = (startUs: number, endUs: number): void => {
    if (endUs - startUs >= MIN_SILENCE_US) out.push({ startUs, endUs, text: '', reason: 'silence', ruleId: 'cut.silenceMaxUs' });
  };
  const first = words[0];
  const last = words[words.length - 1];
  if (!first || !last) return out;
  const protect = rules.protectSentenceEdgesUs;

  if (first.startUs > rules.silenceMaxUs) push(0, first.startUs - protect);
  for (let i = 1; i < words.length; i++) {
    const prev = words[i - 1]!;
    const cur = words[i]!;
    if (cur.startUs - prev.endUs > rules.silenceMaxUs) push(prev.endUs + protect, cur.startUs - protect);
  }
  if (durationUs - last.endUs > rules.silenceMaxUs) push(last.endUs + protect, durationUs);
  return out;
}
