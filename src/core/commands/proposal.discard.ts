import { findOpenProposal } from '../proposal/types';
import type { CommandImpl } from './types';

/** يلغي مقترحاً غير مطبَّق؛ اللقطات لا تتغير. */
export const impl: CommandImpl<'proposal.discard'> = (project, params) => {
  const { index, proposal } = findOpenProposal(project, params.proposalId);
  return {
    project: { ...project, proposals: project.proposals.with(index, { ...proposal, state: 'discarded' }) },
    description: 'ألغى المقترح',
  };
};
