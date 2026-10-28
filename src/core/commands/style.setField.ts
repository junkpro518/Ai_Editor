import { withCaptions } from '../captions/derive';
import { supersedePending } from '../style/learn';
import { applyField, createVersion } from '../style/library';
import { resolvePath } from '../style/rules';
import type { CommandImpl } from './types';

/**
 * يغيّر قاعدة واحدة في النمط: إصدار جديد في المكتبة (reason=user) ويثبّت المشروع عليه (FR-010، US3-1).
 * الكتابة في main عبر أثر style-version-created؛ مسار captions.* يعيد اشتقاق الكابشن بالنمط الجديد (data-model §1.10).
 */
export const impl: CommandImpl<'style.setField'> = (project, params, ctx) => {
  const { section, field } = resolvePath(ctx.style, params.path);
  const at = ctx.now();
  const candidate = applyField(ctx.style, params.path, params.value, params.mode, { kind: 'user', at });
  const style = createVersion(ctx.style, { [section]: candidate[section] }, { reason: params.reason ?? 'user', now: at, latestVersion: ctx.latestStyleVersion });
  // القرار 32: الاقتراحات المعلّقة بُنيت على القواعد السابقة → superseded
  const pinned = { ...project, style: { styleId: style.styleId, version: style.version }, styleUpdateProposals: supersedePending(project.styleUpdateProposals, at) };
  return {
    project: section === 'captions' ? withCaptions(pinned, { ...ctx, style }) : pinned,
    description: `غيّر ${field} في النمط (الإصدار ${style.version})`,
    effects: [{ kind: 'style-version-created', style }],
  };
};
