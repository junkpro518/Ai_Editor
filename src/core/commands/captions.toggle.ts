import { withCaptions } from '../captions/derive';
import type { CommandImpl } from './types';
import { CommandError } from './types';

/** يفعّل الكابشن أو يطفئه؛ بلا تفريغ لا معنى له في الاتجاهين (no_transcript). الاشتقاق/التفريغ في withCaptions. */
export const impl: CommandImpl<'captions.toggle'> = (project, params, ctx) => {
  if (!project.transcript) throw new CommandError('no_transcript', 'لا تفريغ بعد — فرّغ الكلام قبل الكابشن');
  return {
    project: withCaptions({ ...project, captions: { ...project.captions, enabled: params.enabled } }, ctx),
    description: params.enabled ? 'فعّل الكابشن' : 'أطفأ الكابشن',
  };
};
