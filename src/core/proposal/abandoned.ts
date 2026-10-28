import type { Candidate, CutRules, Sentence } from './types';

const SHORT_SEGMENT_WORDS = 4;
const MATCH_TOKENS = 2;

/**
 * «جملة متروكة»: مقطع قصير (≤ 4 كلمات) يليه وقفة ≥ silenceMaxUs/2 ثم مقطع يبدأ بنفس أول رمزَين
 * (أو الرمز الوحيد إن كان المقطع من كلمة واحدة) → حذف القصير. لا حقل خاص في النمط؛ ruleId = قاعدة الوقفة.
 */
export function detectAbandoned(sentences: readonly Sentence[], rules: CutRules): Candidate[] {
  const out: Candidate[] = [];
  const minPause = rules.silenceMaxUs / 2;
  for (let i = 1; i < sentences.length; i++) {
    const short = sentences[i - 1]!;
    const next = sentences[i]!;
    if (short.words.length > SHORT_SEGMENT_WORDS || !short.tokens.length) continue;
    if (next.startUs - short.endUs < minPause) continue;
    const k = Math.min(MATCH_TOKENS, short.tokens.length);
    if (next.tokens.length < k) continue;
    if (short.tokens.slice(0, k).every((t, j) => t === next.tokens[j])) {
      out.push({ startUs: short.startUs, endUs: short.endUs, text: short.text, reason: 'abandoned', ruleId: 'cut.silenceMaxUs' });
    }
  }
  return out;
}
