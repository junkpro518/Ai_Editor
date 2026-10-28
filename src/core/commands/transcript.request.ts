import type { CommandImpl } from './types';
import { CommandError } from './types';

/**
 * يطلب التفريغ (FR-002): الأمر نقي — يضبط حالة المهمة ويطلق أثر request-transcript، والطبقة الخارجية
 * (renderer runtime → main) تستخرج الصوت وترسله. المزود والنموذج من الإعدادات، يضيفهما الأثر لا الأمر.
 * غير قابل للتراجع: النتيجة تُلحق لاحقاً كحدث نظامي (applyTranscript).
 */
export const impl: CommandImpl<'transcript.request'> = (project, params, ctx) => {
  if (!project.source.hasAudio) throw new CommandError('no_audio', 'المقطع بلا مسار صوت؛ لا يمكن تفريغه');
  const mode = params.mode ?? 'cloud';
  // القرار 23: التفريغ المحلي ميزة لاحقة؛ المخطط يبقي الوضع ليُفعَّل لاحقاً
  if (mode !== 'cloud') throw new CommandError('local_mode_unavailable', 'التفريغ المحلي غير متاح في هذه النسخة');
  return {
    project: { ...project, transcriptJob: { state: 'extracting_audio', progress: 0, startedAt: ctx.now() } },
    description: 'طلب التفريغ',
    effects: [{ kind: 'request-transcript', mode }],
  };
};
