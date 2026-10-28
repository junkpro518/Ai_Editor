// تطبيع النص العربي لبروتوكول WER وكشف الإعادات/الحشو (البحث A §3، T036).
// الترتيب مهم: NFKC أولاً (يركّب ا + مدّة → آ) ثم حذف التشكيل ثم توحيد الحروف.

const DIACRITICS = /[ً-ْٰـ]/g; // التشكيل، الألف الخنجرية، التطويل
const EASTERN_DIGITS = /[٠-٩۰-۹]/g; // ٠-٩ و۰-۹
const PUNCTUATION = /\p{P}+/gu;

function westernDigit(d: string): string {
  const cp = d.codePointAt(0) as number;
  const base = cp >= 0x06f0 ? 0x06f0 : 0x0660;
  return String(cp - base);
}

export function normalizeArabic(text: string): string {
  return text
    .normalize('NFKC')
    .replace(DIACRITICS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(EASTERN_DIGITS, westernDigit)
    .replace(PUNCTUATION, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(text: string): string[] {
  const s = normalizeArabic(text);
  return s === '' ? [] : s.split(' ');
}
