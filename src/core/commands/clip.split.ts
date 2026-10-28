import { withCaptions } from '../captions/derive';
import type { CommandImpl } from './types';
import { CommandError } from './types';

/** يقسم اللقطة عند إطار مصدر داخل (inFrame, outFrame) حصراً إلى لقطتين بمعرّفين جديدين. */
export const impl: CommandImpl<'clip.split'> = (project, params, ctx) => {
  const clips = project.timeline.clips;
  const clip = clips.find((c) => c.id === params.clipId);
  if (!clip) throw new CommandError('clip_not_found', `اللقطة ${params.clipId} غير موجودة`);
  if (params.atFrame <= clip.inFrame || params.atFrame >= clip.outFrame) {
    throw new CommandError('split_outside_clip', `الإطار ${params.atFrame} خارج اللقطة (${clip.inFrame}..${clip.outFrame})`);
  }
  const idx = clips.indexOf(clip);
  const split = [
    ...clips.slice(0, idx),
    { ...clip, id: ctx.newId(), outFrame: params.atFrame },
    { ...clip, id: ctx.newId(), inFrame: params.atFrame },
    ...clips.slice(idx + 1),
  ];
  // إعادة حساب بدايات الخط الزمني لكل اللقطات (متجاورة بلا فجوات).
  let start = 0;
  const relaid = split.map((c) => {
    const next = { ...c, timelineStartFrame: start };
    start += c.outFrame - c.inFrame;
    return next;
  });
  return {
    project: withCaptions({ ...project, timeline: { ...project.timeline, clips: relaid } }, ctx),
    description: `قسم اللقطة عند الإطار ${params.atFrame}`,
  };
};
