import { withCaptions } from '../captions/derive';
import { recomputeStarts } from '../timeline/ops';
import type { CommandImpl } from './types';
import { CommandError } from './types';

/** يحذف اللقطة ويضمّ ما بعدها؛ آخر لقطة لا تُحذف (تايم لاين فارغ لا معنى له في المعاينة والتصدير). */
export const impl: CommandImpl<'clip.delete'> = (project, params, ctx) => {
  const clips = project.timeline.clips;
  const idx = clips.findIndex((c) => c.id === params.clipId);
  if (idx < 0) throw new CommandError('clip_not_found', `اللقطة ${params.clipId} غير موجودة`);
  if (clips.length === 1) throw new CommandError('last_clip', 'لا يمكن حذف آخر لقطة في التايم لاين');
  return {
    project: withCaptions({ ...project, timeline: { ...project.timeline, clips: recomputeStarts(clips.filter((c) => c.id !== params.clipId)) } }, ctx),
    description: `حذف اللقطة ${idx + 1}`,
  };
};
