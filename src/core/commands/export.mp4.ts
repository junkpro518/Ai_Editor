import type { CommandImpl } from './types';
import { CommandError } from './types';

/**
 * تصدير MP4 (T051): الأمر نقي ولا يغيّر المشروع؛ الواجهة تنفّذ أثر `export-mp4` (الترميز والدمج في main).
 * غير قابل للتراجع ويحتاج تأكيداً (commands.schema.json).
 */
export const impl: CommandImpl<'export.mp4'> = (project, params) => {
  const name = params.outputPath.split(/[\\/]/).pop() ?? '';
  if (!/^.+\.mp4$/i.test(name)) {
    throw new CommandError('invalid_output_path', `اسم الملف يجب أن ينتهي بـ .mp4: ${params.outputPath}`);
  }
  if (project.timeline.clips.length === 0) {
    throw new CommandError('timeline_empty', 'لا لقطات في التايم لاين للتصدير');
  }
  return {
    project,
    description: `صدّر MP4 إلى ${name}`,
    effects: [{ kind: 'export-mp4', outputPath: params.outputPath }],
  };
};
