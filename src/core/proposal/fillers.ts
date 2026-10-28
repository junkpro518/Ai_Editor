import { normalizeArabic, tokenize } from '../transcript/normalize';
import type { Candidate, CutRules, Word } from './types';

/** كلمة حشو = كلمة كاملة (رمز واحد بعد التطبيع) ضمن قائمة النمط المطبَّعة؛ المتجاورة تُدمج في بند واحد. */
export function detectFillers(words: readonly Word[], rules: CutRules): Candidate[] {
  const fillers = new Set(rules.fillerWords.map((f) => normalizeArabic(f)).filter((f) => f.length));
  const isFiller = (w: Word): boolean => {
    const tokens = tokenize(normalizeArabic(w.text));
    return tokens.length === 1 && fillers.has(tokens[0]!);
  };
  const out: Candidate[] = [];
  let run: Word[] = [];
  const flush = (): void => {
    if (run.length) {
      out.push({
        startUs: run[0]!.startUs,
        endUs: run[run.length - 1]!.endUs,
        text: run.map((w) => w.text).join(' '),
        reason: 'filler',
        ruleId: 'cut.fillerWords',
      });
    }
    run = [];
  };
  for (const w of words) {
    if (isFiller(w)) run.push(w);
    else flush();
  }
  flush();
  return out;
}
