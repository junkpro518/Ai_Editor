import { getState } from '../commands/runtime';

// خطافات اختبار النمط (US3 e2e): نضيف إلى window.__test الذي ينشئه runtime ولا نستبدله.
// قائمة الإصدارات وملفاتها تُقرأ في الاختبار من window.api.style مباشرة؛ هنا حالة الجلسة فقط.
declare global {
  interface TestHooks {
    /** تثبيت المشروع المفتوح، ونمط الجلسة، وأحدث رقم في المكتبة، ومعرّفات اقتراحات التحديث المعلّقة */
    styleState?(): { pinned: { styleId: string; version: number } | null; current: number | null; latest: number | null; pendingUpdates: string[] };
  }
}

if (window.api.app.isTest && window.__test) {
  Object.assign(window.__test, {
    styleState() {
      const { project, style, latestStyleVersion } = getState();
      return {
        pinned: project ? { ...project.style } : null,
        current: style?.version ?? null,
        latest: latestStyleVersion,
        pendingUpdates: project?.styleUpdateProposals.filter((p) => p.state === 'pending').map((p) => p.id) ?? [],
      };
    },
  } satisfies Partial<TestHooks>);
}

export {};
