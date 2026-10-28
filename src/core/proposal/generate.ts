import type { Proposal, StyleVersion, Transcript } from '../contracts/types';
import { detectAbandoned } from './abandoned';
import { detectFillers } from './fillers';
import { detectRepeats, sentencesOf } from './repeats';
import { detectSilence } from './silence';
import { computeTotals } from './totals';
import type { Candidate, CutRules, ProposalItem, Word } from './types';
import { hasSpeech, readCutRules } from './types';

/** أولوية السبب عند دمج بنود متداخلة */
const PRIORITY: Record<Candidate['reason'], number> = { silence: 0, filler: 1, abandoned: 2, repeat: 3 };

/** يرتّب بالبداية ويدمج المتداخل حصراً (لا المتلامس): اتحاد المدى وسبب/نص الأولوية الأعلى. */
export function mergeCandidates(candidates: readonly Candidate[]): Candidate[] {
  const sorted = [...candidates].sort((a, b) => a.startUs - b.startUs || a.endUs - b.endUs);
  const out: Candidate[] = [];
  for (const c of sorted) {
    const last = out[out.length - 1];
    if (last && c.startUs < last.endUs) {
      const winner = PRIORITY[c.reason] > PRIORITY[last.reason] ? c : last;
      out[out.length - 1] = { ...winner, startUs: last.startUs, endUs: Math.max(last.endUs, c.endUs) };
    } else {
      out.push({ ...c });
    }
  }
  return out;
}

/**
 * cut.minClipUs الإلزامي: البند محظور إن ترك بين آخر قصّ مقبول وبينه (أو بعده حتى نهاية الملف)
 * لقطة كلام أقصر من الحد. الشظية بلا كلام (مثل هامش حماية الحواف 120ms بجوار جملة محذوفة)
 * لا تحظر لأنها تُبتلع في القص عند التطبيق.
 */
function blockedFlags(cands: readonly Candidate[], words: readonly Word[], durationUs: number, rules: CutRules): boolean[] {
  const flags = cands.map(() => false);
  if (!rules.minClipMandatory) return flags;
  const leavesShortSpeech = (a: number, b: number): boolean => b - a > 0 && b - a < rules.minClipUs && hasSpeech(words, a, b);
  let lastEnd = 0;
  let lastIdx = -1;
  cands.forEach((c, i) => {
    if (leavesShortSpeech(lastEnd, c.startUs)) {
      flags[i] = true;
      return;
    }
    lastEnd = c.endUs;
    lastIdx = i;
  });
  if (lastIdx >= 0 && leavesShortSpeech(lastEnd, durationUs)) flags[lastIdx] = true;
  return flags;
}

/** مقترح قص `draft` محلي بالكامل (FR-003) من التفريغ والنمط المثبّت؛ المدخلات لا تُمسّ. */
export function generateProposal(
  transcript: Transcript,
  style: StyleVersion,
  source: { durationUs: number },
  ctx: { now: () => string; newId: () => string },
): Proposal {
  const rules = readCutRules(style);
  const words = transcript.words;
  const sentences = sentencesOf(transcript, rules);
  const candidates = [
    ...detectSilence(words, source.durationUs, rules),
    ...detectFillers(words, rules),
    ...detectRepeats(sentences, rules),
    ...detectAbandoned(sentences, rules),
  ]
    // القيد البنيوي: startUs < endUs ≤ source.durationUs
    .map((c) => ({ ...c, endUs: Math.min(c.endUs, source.durationUs) }))
    .filter((c) => c.startUs < c.endUs);
  const merged = mergeCandidates(candidates);
  const blocked = blockedFlags(merged, words, source.durationUs, rules);

  const id = ctx.newId();
  const items: ProposalItem[] = merged.map((c, i) => ({
    id: ctx.newId(),
    ...c,
    state: blocked[i] ? 'blocked' : 'proposed',
    ...(blocked[i] ? { blockedBy: 'cut.minClipUs' } : {}),
  }));
  return {
    id,
    createdAt: ctx.now(),
    styleRef: { styleId: style.styleId, version: style.version },
    items,
    totals: computeTotals(items),
    state: 'draft',
    localOnly: true,
  };
}
