import { findPendingStyleUpdate } from '../style/learn';
import type { CommandImpl } from './types';

/** الرفض يعلّم الاقتراح rejected بتاريخ ولا يمسّ النمط ولا التثبيت (SC-007)؛ تصحيحاته لا تُعاد عدّها. */
export const impl: CommandImpl<'style.updateProposal.reject'> = (project, params, ctx) => {
  const { index, proposal } = findPendingStyleUpdate(project, params.proposalId);
  return {
    project: { ...project, styleUpdateProposals: project.styleUpdateProposals.with(index, { ...proposal, state: 'rejected', decidedAt: ctx.now() }) },
    description: 'رفض تحديث النمط',
  };
};
