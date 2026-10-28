import { withCaptions } from '../captions/derive';
import { supersedePending } from '../style/learn';
import { rollbackContent } from '../style/library';
import type { CommandImpl } from './types';
import { CommandError } from './types';

/**
 * الرجوع لإصدار سابق = إصدار جديد بمحتواه (لا حذف للتاريخ، FR-010) ويثبّت المشروع عليه.
 * الهدف يحمّله runtime في ctx.styleVersion قبل التنفيذ (core بلا I/O).
 */
export const impl: CommandImpl<'style.rollback'> = (project, params, ctx) => {
  if (params.styleId !== project.style.styleId) {
    throw new CommandError('style_mismatch', `المشروع مثبّت على النمط «${project.style.styleId}» لا «${params.styleId}»`);
  }
  const target = ctx.styleVersion;
  if (!target || target.styleId !== params.styleId || target.version !== params.toVersion) {
    throw new CommandError('style_version_required', `الإصدار ${params.toVersion} من النمط «${params.styleId}» غير محمَّل`);
  }
  const at = ctx.now();
  const style = rollbackContent(target, Math.max(ctx.style.version, ctx.latestStyleVersion ?? 0), at);
  const pinned = { ...project, style: { styleId: style.styleId, version: style.version }, styleUpdateProposals: supersedePending(project.styleUpdateProposals, at) };
  return {
    project: withCaptions(pinned, { ...ctx, style }),
    description: `رجع النمط إلى محتوى الإصدار ${target.version} (الإصدار ${style.version})`,
    effects: [{ kind: 'style-version-created', style }],
  };
};
