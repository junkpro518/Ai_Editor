import type { CommandImpl } from './types';
import { CommandError } from './types';
import { createProject } from '../project/create';

/** يبني مستنداً جديداً من ناتج probe المحقون في السياق؛ المشروع المدخل يُتجاهل (أمر غير قابل للتراجع). */
export const impl: CommandImpl<'project.import'> = (_project, params, ctx) => {
  if (!ctx.probe)
    throw new CommandError('probe_required', 'الاستيراد يحتاج ناتج فحص الملف (probe) في السياق');
  const name = ctx.probe.fileName.replace(/\.[^.]+$/, '');
  const project = createProject(ctx.probe, {
    id: ctx.newId(),
    now: ctx.now(),
    newId: ctx.newId,
    styleRef: params.styleRef ?? { styleId: ctx.style.styleId, version: ctx.style.version },
    name,
    captionsEnabled: ctx.style.captions.enabled.value === true,
  });
  return { project, description: `استورد ${ctx.probe.fileName}` };
};
