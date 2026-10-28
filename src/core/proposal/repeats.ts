import type { Transcript } from '../contracts/types';
import { normalizeArabic, tokenize } from '../transcript/normalize';
import type { Candidate, CutRules, Sentence, Word } from './types';

const TERMINAL_PUNCT = /[.!?؟…]$/;

function toSentence(words: Word[]): Sentence {
  const text = words.map((w) => w.text).join(' ');
  return {
    startUs: words[0]!.startUs,
    endUs: words[words.length - 1]!.endUs,
    words,
    tokens: tokenize(normalizeArabic(text)),
    text,
  };
}

/**
 * الجمل من `segments` إن وُجدت، وإلا تُشتق من الكلمات: قطع عند فجوة ≥ silenceMaxUs
 * أو علامة ترقيم ختامية في الكلمة السابقة.
 */
export function sentencesOf(transcript: Transcript, rules: CutRules): Sentence[] {
  const { words, segments } = transcript;
  if (segments && segments.length) {
    const byId = new Map(words.map((w) => [w.id, w]));
    return segments
      .map((s) => s.wordIds.map((id) => byId.get(id)).filter((w): w is Word => w !== undefined))
      .filter((g) => g.length)
      .map(toSentence);
  }
  const groups: Word[][] = [];
  let cur: Word[] = [];
  for (const w of words) {
    const prev = cur[cur.length - 1];
    if (prev && (w.startUs - prev.endUs >= rules.silenceMaxUs || TERMINAL_PUNCT.test(prev.text))) {
      groups.push(cur);
      cur = [];
    }
    cur.push(w);
  }
  if (cur.length) groups.push(cur);
  return groups.map(toSentence);
}

/** تشابه Jaccard على مجموعتي الرموز؛ 0 إن كان الاتحاد فارغاً */
export function jaccard(a: readonly string[], b: readonly string[]): number {
  const sa = new Set(a);
  const sb = new Set(b);
  const union = new Set([...sa, ...sb]);
  if (!union.size) return 0;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  return inter / union.size;
}

/** جملتان متتاليتان بتشابه ≥ repeatsSimilarity → حذف الأولى (الإعادة الأخيرة هي المقصودة عادةً). */
export function detectRepeats(sentences: readonly Sentence[], rules: CutRules): Candidate[] {
  if (!rules.repeatsEnabled) return [];
  const out: Candidate[] = [];
  for (let i = 1; i < sentences.length; i++) {
    const prev = sentences[i - 1]!;
    const cur = sentences[i]!;
    if (jaccard(prev.tokens, cur.tokens) >= rules.repeatsSimilarity) {
      out.push({ startUs: prev.startUs, endUs: prev.endUs, text: prev.text, reason: 'repeat', ruleId: 'cut.repeatsSimilarity' });
    }
  }
  return out;
}
