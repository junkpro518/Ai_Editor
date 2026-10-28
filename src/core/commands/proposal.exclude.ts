import type { Correction } from '../contracts/types';
import { computeTotals } from '../proposal/totals';
import { findOpenProposal } from '../proposal/types';
import type { CommandImpl } from './types';
import { CommandError } from './types';

/** يستثني بنوداً من المقترح (→ reviewed) ويسجّل كل استثناء تصحيحاً مرتبطاً بالقاعدة والسبب (FR-006). */
export const impl: CommandImpl<'proposal.exclude'> = (project, params, ctx) => {
  const { index, proposal } = findOpenProposal(project, params.proposalId);
  const ids = [...new Set(params.itemIds)];
  const targets = ids.map((id) => {
    const item = proposal.items.find((i) => i.id === id);
    if (!item) throw new CommandError('item_not_found', `البند ${id} غير موجود في المقترح`);
    if (item.state !== 'proposed') throw new CommandError('item_not_proposed', `البند ${id} في حالة ${item.state} ولا يُستثنى`);
    return item;
  });
  const items = proposal.items.map((i) => (ids.includes(i.id) ? { ...i, state: 'excluded' as const } : i));
  const corrections: Correction[] = targets.map((item) => ({
    id: ctx.newId(),
    at: ctx.now(),
    actor: 'user',
    kind: 'exclude_item',
    proposalId: proposal.id,
    itemId: item.id,
    ruleId: item.ruleId,
    reason: item.reason,
    quote: item.text || 'صمت',
  }));
  const proposals = project.proposals.with(index, { ...proposal, items, totals: computeTotals(items), state: 'reviewed' });
  return {
    project: { ...project, proposals, corrections: [...project.corrections, ...corrections] },
    description: `استثنى ${targets.length} من بنود المقترح`,
  };
};
