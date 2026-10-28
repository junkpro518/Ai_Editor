import { generateProposal } from '../proposal/generate';
import type { CommandImpl } from './types';
import { CommandError } from './types';

/** يولّد مقترح قص من التفريغ والنمط المثبّت ويلحقه بالمشروع (FR-003)؛ غير قابل للتراجع (عقد الأوامر). */
export const impl: CommandImpl<'proposal.request'> = (project, _params, ctx) => {
  if (!project.transcript) throw new CommandError('no_transcript', 'لا يوجد تفريغ بعد؛ اطلب التفريغ أولاً');
  const generated = generateProposal(project.transcript, ctx.style, project.source, ctx);
  const proposal = { ...generated, styleRef: { ...project.style } };
  const n = proposal.items.filter((i) => i.state === 'proposed').length;
  return {
    project: { ...project, proposals: [...project.proposals, proposal] },
    description: `اقترح ${n} قصّة`,
  };
};
