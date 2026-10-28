import { withCaptions } from '../captions/derive';
import type { Precedent, StyleVersion } from '../contracts/types';
import { findPendingStyleUpdate } from '../style/learn';
import { applyField, createVersion, nextVersionNumber } from '../style/library';
import type { CommandImpl } from './types';

/**
 * القبول الصريح لاقتراح التعلّم (FR-011، SC-007): إصدار نمط reason=learned يطبّق الفرق ويلحق السوابق،
 * basedOnCorrections = التصحيحات التي بُني عليها؛ الاقتراح accepted بتاريخ والمشروع يُثبَّت على الإصدار الجديد.
 */
export const impl: CommandImpl<'style.updateProposal.accept'> = (project, params, ctx) => {
  const { index, proposal } = findPendingStyleUpdate(project, params.proposalId);
  const at = ctx.now();
  // قيم الفرق من ملف المشروع (قابل للتعديل خارج التطبيق) → تمرّ بفحص النوع نفسه الذي يمرّ به style.setField
  let patched: StyleVersion = ctx.style;
  for (const d of proposal.diff) patched = applyField(patched, d.path, d.to, undefined, { kind: 'learned', ref: proposal.id, at });
  const version = nextVersionNumber(ctx.style, ctx.latestStyleVersion);
  const precedents = (proposal.newPrecedents as Precedent[]).map((p) => ({ ...p, addedInVersion: version }));
  const style = createVersion(
    ctx.style,
    { cut: patched.cut, captions: patched.captions, precedents },
    { reason: 'learned', now: at, basedOnCorrections: proposal.trigger.correctionIds, latestVersion: ctx.latestStyleVersion },
  );
  const pinned = {
    ...project,
    style: { styleId: style.styleId, version: style.version },
    styleUpdateProposals: project.styleUpdateProposals.with(index, { ...proposal, state: 'accepted' as const, decidedAt: at }),
  };
  const touchesCaptions = proposal.diff.some((d) => d.path.startsWith('captions.'));
  return {
    project: touchesCaptions ? withCaptions(pinned, { ...ctx, style }) : pinned,
    description: `قبل تحديث النمط (الإصدار ${style.version})`,
    effects: [{ kind: 'style-version-created', style }],
  };
};
