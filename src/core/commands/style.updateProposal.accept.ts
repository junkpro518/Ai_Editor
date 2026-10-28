import { withCaptions } from '../captions/derive';
import type { StyleVersion } from '../contracts/types';
import { findPendingStyleUpdate, supersedePending } from '../style/learn';
import { applyField, createVersion, nextVersionNumber } from '../style/library';
import { getRule } from '../style/rules';
import type { CommandImpl } from './types';
import { CommandError } from './types';

/**
 * القبول الصريح لاقتراح التعلّم (FR-011، SC-007): إصدار نمط reason=learned يطبّق الفرق ويلحق السوابق،
 * basedOnCorrections = التصحيحات التي بُني عليها؛ الاقتراح accepted بتاريخ والمشروع يُثبَّت على الإصدار الجديد.
 */
export const impl: CommandImpl<'style.updateProposal.accept'> = (project, params, ctx) => {
  const { index, proposal } = findPendingStyleUpdate(project, params.proposalId);
  // خط دفاع ثانٍ بعد القرار 32 (مراجعة US3): اقتراح بُني على نمط غير المثبّت، أو from لم يعد القيمة الحالية، لا يُطبَّق
  const ref = proposal.styleRef;
  const stale =
    ref.styleId !== project.style.styleId ||
    ref.version !== project.style.version ||
    proposal.diff.some((d) => JSON.stringify(getRule(ctx.style, d.path).value) !== JSON.stringify(d.from));
  if (stale) throw new CommandError('stale_proposal', 'اقتراح تحديث النمط قديم: النمط تغيّر بعد إنشائه، فلا يُطبَّق');
  const at = ctx.now();
  // قيم الفرق من ملف المشروع (قابل للتعديل خارج التطبيق) → تمرّ بفحص النوع نفسه الذي يمرّ به style.setField
  let patched: StyleVersion = ctx.style;
  for (const d of proposal.diff) patched = applyField(patched, d.path, d.to, undefined, { kind: 'learned', ref: proposal.id, at });
  const version = nextVersionNumber(ctx.style, ctx.latestStyleVersion);
  const precedents = proposal.newPrecedents.map((p) => ({ ...p, addedInVersion: version }));
  const style = createVersion(
    ctx.style,
    { cut: patched.cut, captions: patched.captions, precedents },
    { reason: 'learned', now: at, basedOnCorrections: proposal.trigger.correctionIds, latestVersion: ctx.latestStyleVersion },
  );
  const pinned = {
    ...project,
    style: { styleId: style.styleId, version: style.version },
    // المقبول accepted والمعلّقة الأخرى superseded (القرار 32)
    styleUpdateProposals: supersedePending(project.styleUpdateProposals, at, proposal.id).with(index, { ...proposal, state: 'accepted' as const, decidedAt: at }),
  };
  const touchesCaptions = proposal.diff.some((d) => d.path.startsWith('captions.'));
  return {
    project: touchesCaptions ? withCaptions(pinned, { ...ctx, style }) : pinned,
    description: `قبل تحديث النمط (الإصدار ${style.version})`,
    effects: [{ kind: 'style-version-created', style }],
  };
};
