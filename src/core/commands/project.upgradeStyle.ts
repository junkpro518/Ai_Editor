import { withCaptions } from '../captions/derive';
import { supersedePending } from '../style/learn';
import type { CommandImpl } from './types';
import { CommandError } from './types';

/**
 * ترقية النمط في هذا المشروع فقط (FR-010، الحالة الحدّية): تثبيت على الإصدار المطلوب، إلغاء المقترحات غير المطبَّقة
 * (draft|reviewed → discarded) واقتراحات تحديث النمط المعلّقة (→ superseded، القرار 32) لأنها بُنيت على القواعد القديمة،
 * وإعادة اشتقاق الكابشن — كله أمر واحد قابل للتراجع.
 * لا إصدار جديد يُنشأ؛ الهدف يحمّله runtime في ctx.styleVersion.
 */
export const impl: CommandImpl<'project.upgradeStyle'> = (project, params, ctx) => {
  if (params.toVersion === project.style.version) {
    throw new CommandError('style_version_same', `المشروع مثبّت أصلاً على الإصدار ${params.toVersion}`);
  }
  const target = ctx.styleVersion;
  if (!target || target.styleId !== project.style.styleId || target.version !== params.toVersion) {
    throw new CommandError('style_version_required', `الإصدار ${params.toVersion} من النمط «${project.style.styleId}» غير محمَّل`);
  }
  const proposals = project.proposals.map((p) => (p.state === 'draft' || p.state === 'reviewed' ? { ...p, state: 'discarded' as const } : p));
  const pinned = {
    ...project,
    style: { styleId: target.styleId, version: target.version },
    proposals,
    styleUpdateProposals: supersedePending(project.styleUpdateProposals, ctx.now()),
  };
  return {
    project: withCaptions(pinned, { ...ctx, style: target }),
    description: `رقّى النمط إلى الإصدار ${target.version}`,
  };
};
