// التقسيم إلى مجموعات (T054، بحث B §4): يُحسب مرة واحدة داخل الأمر ويُخزَّن؛ الرسم لا يعيد التقسيم أبداً.

export interface ChunkWord {
  id: string;
  text: string;
  startUs: number;
  endUs: number;
}

export interface ChunkRules {
  wordsPerChunk: { min: number; max: number };
  breakAtPauseUs: number;
}

/** مجموعة كلمات مرتبطة بالمعرّف لا بالنص (الكلمة المكررة تحتفظ بتوقيتها). */
export interface Chunk {
  wordIds: string[];
  startUs: number;
  /** نهاية آخر كلمة، ممدودة حتى بداية المجموعة التالية عندما تكون الوقفة أقصر من breakAtPauseUs */
  endUs: number;
}

const SENTENCE_END = /[.!?؟…]$/u;

/**
 * جشع من اليسار لليمين: كسر عند (أ) الحد الأقصى، (ب) وقفة ≥ breakAtPauseUs بعد الحد الأدنى،
 * (ج) نهاية جملة بعد الحد الأدنى. مجموعة أقصر من الحد الأدنى لا تُصدر إلا إن كانت الأخيرة. حتمي.
 */
export function chunkWords(words: ReadonlyArray<ChunkWord>, rules: ChunkRules): Chunk[] {
  const min = Math.max(1, rules.wordsPerChunk.min);
  const max = Math.max(min, rules.wordsPerChunk.max);
  const chunks: Chunk[] = [];
  let current: ChunkWord[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i]!;
    current.push(w);
    const next = words[i + 1];
    const gap = next ? next.startUs - w.endUs : Infinity;
    const enough = current.length >= min;
    const breakHere = !next || current.length >= max || (enough && (gap >= rules.breakAtPauseUs || SENTENCE_END.test(w.text)));
    if (!breakHere) continue;
    const last = current[current.length - 1]!;
    chunks.push({
      wordIds: current.map((c) => c.id),
      startUs: current[0]!.startUs,
      endUs: next && gap < rules.breakAtPauseUs ? next.startUs : last.endUs,
    });
    current = [];
  }
  return chunks;
}
