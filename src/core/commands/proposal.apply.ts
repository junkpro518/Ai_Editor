import type { Correction, ProjectDocument, Reason } from '../contracts/types';
import { computeTotals } from '../proposal/totals';
import { findOpenProposal, hasSpeech, readCutRules } from '../proposal/types';
import { frameToUs, usToFrame } from '../time';
import type { CommandImpl, Effect } from './types';

type Clip = ProjectDocument['timeline']['clips'][number];
/** لقطة أثناء العمل: id غائب = قطعة جديدة تأخذ معرّفاً عند الختام؛ fresh = نتجت عن البند الحالي */
type Piece = Omit<Clip, 'id' | 'timelineStartFrame'> & { id?: string; fresh?: boolean };

/** يطرح مدى إطارات مصدر [from, to) من كل اللقطات؛ القطع المتغيّرة fresh وبلا id. */
function subtract(pieces: readonly Piece[], from: number, to: number): Piece[] {
  const out: Piece[] = [];
  for (const p of pieces) {
    if (to <= p.inFrame || from >= p.outFrame) {
      out.push({ ...p, fresh: false });
      continue;
    }
    const { id: _id, ...rest } = p;
    if (from > p.inFrame) out.push({ ...rest, outFrame: from, fresh: true });
    if (to < p.outFrame) out.push({ ...rest, inFrame: to, fresh: true });
  }
  return out;
}

/**
 * يطبّق البنود proposed فقط كقصّات على اللقطات في أمر واحد (لقطة تراجع واحدة؛ data-model §3).
 * إعادة التحقق من cut.minClipUs بالإطارات (data-model §4): قطعة كلام جديدة أقصر من الحد تحظر بندها،
 * وقطعة بلا كلام أقصر من الحد تُبتلع في القص.
 */
export const impl: CommandImpl<'proposal.apply'> = (project, params, ctx) => {
  const { index, proposal } = findOpenProposal(project, params.proposalId);
  const rules = readCutRules(ctx.style);
  const fps = project.source.fps;
  const minFrames = usToFrame(rules.minClipUs, fps);
  const words = project.transcript?.words ?? [];

  let pieces: Piece[] = project.timeline.clips.map((c) => ({ id: c.id, sourceId: c.sourceId, inFrame: c.inFrame, outFrame: c.outFrame }));
  const outcome = new Map<string, 'applied' | 'blocked'>();
  const todo = proposal.items.filter((i) => i.state === 'proposed').sort((a, b) => a.startUs - b.startUs);
  for (const item of todo) {
    const from = usToFrame(item.startUs, fps);
    const to = usToFrame(item.endUs, fps);
    if (from >= to) {
      // أقصر من إطار واحد: لا شيء يُقص، ولا نكسر اللقطة بلا داعٍ
      outcome.set(item.id, 'applied');
      continue;
    }
    const next = subtract(pieces, from, to);
    const shortFresh = next.filter((p) => p.fresh && p.outFrame - p.inFrame < minFrames);
    const speech = shortFresh.filter((p) => hasSpeech(words, frameToUs(p.inFrame, fps), frameToUs(p.outFrame, fps)));
    if (rules.minClipMandatory && speech.length) {
      outcome.set(item.id, 'blocked');
      continue;
    }
    const silent = new Set(shortFresh.filter((p) => !speech.includes(p)));
    pieces = next.filter((p) => !silent.has(p));
    outcome.set(item.id, 'applied');
  }

  let start = 0;
  const clips: Clip[] = pieces.map((p) => {
    const clip: Clip = { id: p.id ?? ctx.newId(), sourceId: p.sourceId, inFrame: p.inFrame, outFrame: p.outFrame, timelineStartFrame: start };
    start += p.outFrame - p.inFrame;
    return clip;
  });

  const items = proposal.items.map((i) => {
    const state = outcome.get(i.id);
    if (!state) return i;
    return state === 'blocked' ? { ...i, state, blockedBy: 'cut.minClipUs' } : { ...i, state };
  });
  const appliedCount = items.filter((i) => i.state === 'applied').length;
  const excluded = items.filter((i) => i.state === 'excluded');

  const corrections: Correction[] = [...project.corrections];
  if (appliedCount === 0 && excluded.length) {
    // الحالة الحدّية «استثنى كل المقترحات»: لا يتغير المشروع ويُسجَّل تصحيح شامل
    corrections.push({ id: ctx.newId(), at: ctx.now(), actor: 'user', kind: 'exclude_all', proposalId: proposal.id, quote: 'استثنى كل بنود المقترح' });
  }

  // FR-011: ≥ العتبة استثناءات بالسبب نفسه في هذا المقترح → أثر فقط؛ StyleUpdateProposal نفسه في US3
  const byReason = new Map<Reason, number>();
  for (const i of excluded) byReason.set(i.reason, (byReason.get(i.reason) ?? 0) + 1);
  const effects: Effect[] | undefined = [...byReason.values()].some((n) => n >= rules.repeatedRejectionThreshold)
    ? [{ kind: 'style-update-proposed', proposalId: proposal.id }]
    : undefined;

  const proposals = project.proposals.with(index, { ...proposal, items, totals: computeTotals(items), state: 'applied' });
  return {
    project: { ...project, timeline: { ...project.timeline, clips }, proposals, corrections },
    description: appliedCount ? `طبّق المقترح: ${appliedCount} قصّة` : 'طبّق المقترح بلا قصّات',
    ...(effects ? { effects } : {}),
  };
};
