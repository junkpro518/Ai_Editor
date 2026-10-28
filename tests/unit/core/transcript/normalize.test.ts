import { describe, expect, it } from 'vitest';
import { normalizeArabic, tokenize } from '../../../../src/core/transcript/normalize';

describe('normalizeArabic (بروتوكول WER، البحث A §3)', () => {
  it('يحذف التشكيل U+064B–U+0652 والألف الخنجرية U+0670 والتطويل U+0640', () => {
    expect(normalizeArabic('مُحَمَّدٌ')).toBe('محمد');
    expect(normalizeArabic('الرَّحْمَـٰن')).toBe('الرحمن');
    expect(normalizeArabic('كتـــاب')).toBe('كتاب');
  });

  it('يوحّد الألف والهمزات المحمولة والتاء المربوطة والألف المقصورة', () => {
    expect(normalizeArabic('أإآٱ')).toBe('اااا');
    expect(normalizeArabic('مؤمن')).toBe('مومن');
    expect(normalizeArabic('رئيس')).toBe('رييس');
    expect(normalizeArabic('مدرسة')).toBe('مدرسه');
    expect(normalizeArabic('على')).toBe('علي');
    // الهمزة المفردة تبقى
    expect(normalizeArabic('سماء')).toBe('سماء');
  });

  it('NFKC قبل توحيد الألف: ا + مدّة U+0653 → آ → ا', () => {
    expect(normalizeArabic('آلن')).toBe('الن');
  });

  it('الأرقام المشرقية والفارسية → غربية', () => {
    expect(normalizeArabic('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
    expect(normalizeArabic('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
    expect(normalizeArabic('سنة ٢٠٢٦')).toBe('سنه 2026');
  });

  it('الترقيم العربي واللاتيني → مسافة، وضغط المسافات', () => {
    expect(normalizeArabic('مرحبا، كيف الحال؟ تمام! نعم... «جداً»')).toBe('مرحبا كيف الحال تمام نعم جدا');
    expect(normalizeArabic('  a,b;c  ')).toBe('a b c');
  });

  it('اللاتيني → أحرف صغيرة', () => {
    expect(normalizeArabic('Cloud Computing')).toBe('cloud computing');
  });

  it('لا يحذف «ال» التعريف ولا يفصل «و» العطف', () => {
    expect(normalizeArabic('البيت والسيارة')).toBe('البيت والسياره');
    expect(normalizeArabic('والكتاب')).toBe('والكتاب');
  });

  it('السلسلة الفارغة والمسافات فقط → سلسلة فارغة', () => {
    expect(normalizeArabic('')).toBe('');
    expect(normalizeArabic('   ، ')).toBe('');
  });
});

describe('tokenize', () => {
  it('يطبّع ثم يقسم على المسافات بلا رموز فارغة', () => {
    expect(tokenize('السَّلامُ عليكم، Hello 123!')).toEqual(['السلام', 'عليكم', 'hello', '123']);
    expect(tokenize('')).toEqual([]);
  });
});
