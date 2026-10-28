import { recomputeStarts } from '../timeline/ops';
import type { CommandImpl } from './types';
import { CommandError } from './types';

/** ينقل اللقطة إلى موضع آخر في الترتيب ثم يعيد حساب البدايات. */
export const impl: CommandImpl<'clip.move'> = (project, params) => {
  const clips = project.timeline.clips;
  const idx = clips.findIndex((c) => c.id === params.clipId);
  const clip = clips[idx];
  if (!clip) throw new CommandError('clip_not_found', `اللقطة ${params.clipId} غير موجودة`);
  if (params.toIndex >= clips.length) {
    throw new CommandError('index_out_of_range', `الموضع ${params.toIndex} خارج النطاق (0..${clips.length - 1})`);
  }
  const rest = clips.filter((c) => c.id !== params.clipId);
  const reordered = [...rest.slice(0, params.toIndex), clip, ...rest.slice(params.toIndex)];
  return {
    project: { ...project, timeline: { ...project.timeline, clips: recomputeStarts(reordered) } },
    description: `نقل اللقطة ${idx + 1} إلى الموضع ${params.toIndex + 1}`,
  };
};
