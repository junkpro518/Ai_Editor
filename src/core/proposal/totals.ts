import type { Proposal } from '../contracts/types';
import type { ProposalItem } from './types';

/** الإجماليات على البنود الفعّالة (proposed | applied): عدد لكل سبب (المفاتيح الأربعة دائماً) والوقت الموفَّر. */
export function computeTotals(items: readonly ProposalItem[]): Proposal['totals'] {
  const byReason: Record<ProposalItem['reason'], number> = { silence: 0, repeat: 0, abandoned: 0, filler: 0 };
  let savedUs = 0;
  for (const item of items) {
    if (item.state !== 'proposed' && item.state !== 'applied') continue;
    byReason[item.reason] += 1;
    savedUs += item.endUs - item.startUs;
  }
  return { byReason, savedUs };
}
