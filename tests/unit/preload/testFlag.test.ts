import { describe, expect, it } from 'vitest';
import { TEST_FLAG, isTestFromArgv } from '../../../src/preload/testFlag';

// مراجعة US1 #2: خطافات الاختبار تُفعَّل بعلم argv من main فقط، لا بمتغيّر بيئة يستطيع المستخدم ضبطه
describe('isTestFromArgv', () => {
  it('العلم موجود → true', () => {
    expect(isTestFromArgv(['/usr/bin/electron', '--no-sandbox', TEST_FLAG])).toBe(true);
    expect(TEST_FLAG).toBe('--ai-editor-test');
  });
  it('بلا علم → false حتى مع AI_EDITOR_TEST في البيئة', () => {
    const prev = process.env['AI_EDITOR_TEST'];
    process.env['AI_EDITOR_TEST'] = '1';
    try {
      expect(isTestFromArgv(['/usr/bin/electron', '--no-sandbox'])).toBe(false);
      expect(isTestFromArgv([])).toBe(false);
      expect(isTestFromArgv(['--ai-editor-test=1', '--ai-editor-tests'])).toBe(false); // مطابقة تامة فقط
    } finally {
      if (prev === undefined) delete process.env['AI_EDITOR_TEST'];
      else process.env['AI_EDITOR_TEST'] = prev;
    }
  });
});
