import { describe, expect, it } from 'vitest';
import { t } from '../../../src/renderer/i18n';

// مراجعة us2 #4: قيم الاستبدال قد تحمل نص كلمة من المزود؛ أنماط `$` في String.replace يجب ألا تُفسَّر
describe('i18n t()', () => {
  it('يستبدل المتغيّر حرفياً حتى مع $& و$\' و$$ في القيمة', () => {
    expect(t('words.original', { text: "$' $& $$ $1" })).toBe("الأصل: $' $& $$ $1");
    expect(t('words.original', { text: 'سلام' })).toBe('الأصل: سلام');
  });
});
