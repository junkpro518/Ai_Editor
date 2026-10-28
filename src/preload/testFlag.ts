/**
 * علم الاختبار يصل preload عبر additionalArguments من main (لا عبر البيئة): main وحده يقرّر أن البناء غير محزوم
 * وأن AI_EDITOR_TEST=1، فلا يمكن لبيئة المستخدم تشغيل خطافات الاختبار في حزمة الإنتاج (مراجعة US1 #2).
 */
export const TEST_FLAG = '--ai-editor-test';

export function isTestFromArgv(argv: readonly string[]): boolean {
  return argv.includes(TEST_FLAG);
}
