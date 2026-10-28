import { withCaptions } from '../captions/derive';
import type { Correction } from '../contracts/types';
import { recomputeStarts } from '../timeline/ops';
import { clipWarnings, MIN_CLIP_RULE } from '../timeline/warnings';
import type { CommandImpl } from './types';
import { CommandError } from './types';

/** يغيّر حدّي اللقطة داخل المصدر (0 ≤ in < out ≤ frameCount)؛ القصر عن minClipUs مسموح مع تحذير وتسجيل (FR-009). */
export const impl: CommandImpl<'clip.trim'> = (project, params, ctx) => {
  const clips = project.timeline.clips;
  const idx = clips.findIndex((c) => c.id === params.clipId);
  const clip = clips[idx];
  if (!clip) throw new CommandError('clip_not_found', `اللقطة ${params.clipId} غير موجودة`);
  const inFrame = params.inFrame ?? clip.inFrame;
  const outFrame = params.outFrame ?? clip.outFrame;
  if (inFrame < 0 || outFrame > project.source.frameCount || outFrame <= inFrame) {
    throw new CommandError('trim_out_of_range', `حدود [${inFrame}, ${outFrame}) خارج المصدر (0..${project.source.frameCount}) أو معكوسة`);
  }
  const trimmed = { ...clip, inFrame, outFrame };
  const relaid = recomputeStarts([...clips.slice(0, idx), trimmed, ...clips.slice(idx + 1)]);
  const warnings = clipWarnings(trimmed, ctx.style, project.source.fps);

  const corrections = [...project.corrections];
  if (warnings.includes('violates_mandatory_rule')) {
    // الفاعل هنا user دائماً: العقد يقيّد Correction.actor بـ'user' والتعديل اليدوي من المستخدم
    const correction: Correction = {
      id: ctx.newId(),
      at: ctx.now(),
      actor: 'user',
      kind: 'manual_edit',
      ruleId: MIN_CLIP_RULE,
      violates: MIN_CLIP_RULE,
      quote: `لقطة ${idx + 1} أقصر من الحد`,
      before: { inFrame: clip.inFrame, outFrame: clip.outFrame },
      after: { inFrame, outFrame },
    };
    corrections.push(correction);
  }
  return {
    project: withCaptions({ ...project, timeline: { ...project.timeline, clips: relaid }, corrections }, ctx),
    description: `قصّ اللقطة ${idx + 1} إلى [${inFrame}, ${outFrame})`,
    ...(warnings.length ? { warnings } : {}),
  };
};
