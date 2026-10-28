import type { CommandName, CommandParamsMap, ProjectDocument } from '../../core/contracts/types';
import { getState, loadProject, run, toIpcError } from '../commands/runtime';
import { cancelExport, getExportStatus, inflightExport, startExport } from './run';
import type { ExportResult, ExportStatus } from './types';

// خطافات اختبار التصدير (e2e): نضيف إلى window.__test الذي ينشئه runtime ولا نستبدله.
declare global {
  interface TestHooks {
    /** ينفّذ أمراً على المشروع المفتوح مؤكَّداً (الأوامر الموسومة confirm لا تفتح حواراً في الاختبار). */
    run?<N extends CommandName>(
      name: N,
      params: CommandParamsMap[N],
    ): Promise<{ ok: true; project: ProjectDocument } | { ok: false; code: string; message: string }>;
    /** تصدير المشروع المفتوح إلى مسار مطلق وانتظار النتيجة (الأمر export.mp4 ثم أثره). */
    exportMp4?(outputPath: string): Promise<{ ok: true; result: ExportResult } | { ok: false; code: string; message: string }>;
    exportState?(): ExportStatus;
    exportCancel?(): void;
    loadProject?(id: string): Promise<void>;
  }
}

// runtime ينشئ window.__test قبلنا (نستورده أعلاه)؛ نضيف خطافاتنا إليه
if (window.api.app.isTest && window.__test) {
  Object.assign(window.__test, {
    async run(name, params) {
      try {
        const r = await run(name, params, { confirmed: true });
        if (!r) return { ok: false, code: 'cancelled', message: 'أُلغي التأكيد' };
        return { ok: true, project: r.project };
      } catch (e) {
        return { ok: false, ...toIpcError(e) };
      }
    },
    async exportMp4(outputPath) {
      try {
        const { project, style } = getState();
        if (!project || !style) throw { code: 'no_project', message: 'لا مشروع مفتوح' };
        // الأمر النقي أولاً (يتحقق من المسار واللقطات ويطلق الأثر)؛ ثم ننتظر الأثر الذي بدأه run.ts
        await run('export.mp4', { outputPath }, { confirmed: true });
        const result = await (inflightExport() ?? startExport(project, style, outputPath));
        return { ok: true, result };
      } catch (e) {
        return { ok: false, ...toIpcError(e) };
      }
    },
    exportState: getExportStatus,
    exportCancel: cancelExport,
    loadProject,
  } satisfies Partial<TestHooks>);
}

export {};
