import type { CommandName, CommandParamsMap } from '../../core/contracts/types';
import { getState, run, toIpcError } from '../commands/runtime';

/**
 * خطافات اختبار التايم لاين (e2e): نضيف خصائص إلى window.__test ولا نستبدله (الكائن ملك runtime).
 * `run` مشترك مع خطافات التصدير (export/testHooks.ts) بنفس الشكل { ok, project }؛ نعرّفه فقط إن لم يسبقنا أحد.
 * page.evaluate لا ينقل الاستثناءات بوضوح، فالنتيجة قابلة للتسلسل دائماً.
 */
export function installTimelineTestHooks(): void {
  const w = window as unknown as { __test?: Record<string, unknown> };
  if (!w.__test) return;
  if (typeof w.__test.run !== 'function') {
    w.__test.run = async <N extends CommandName>(name: N, params: CommandParamsMap[N]) => {
      try {
        const r = await run(name, params, { confirmed: true });
        if (!r) return { ok: false as const, code: 'cancelled', message: 'أُلغي التأكيد' };
        return { ok: true as const, project: r.project };
      } catch (e) {
        return { ok: false as const, ...toIpcError(e) };
      }
    };
  }
  if (typeof w.__test.clips !== 'function') w.__test.clips = () => getState().project?.timeline.clips ?? [];
}
