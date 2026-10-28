import { useSyncExternalStore } from 'react';
import ar from './ar.json';
import en from './en.json';

export type Lang = 'ar' | 'en';
type Key = keyof typeof ar;

const dict: Record<Lang, Record<string, string>> = { ar, en };
let lang: Lang = 'ar';
const listeners = new Set<() => void>();

function apply(): void {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

/** يبدّل اللغة في الذاكرة ويحدّث dir/lang؛ الحفظ في الإعدادات مسؤولية المستدعي (FR-018). */
export function setLang(next: Lang): void {
  if (next === lang) return;
  lang = next;
  apply();
  listeners.forEach((l) => l());
}

export function getLang(): Lang {
  return lang;
}

export function useLang(): Lang {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => lang,
  );
}

export function t(key: Key, vars?: Record<string, string>): string {
  let s = dict[lang][key] ?? dict.ar[key] ?? key;
  // دالة بدل سلسلة: القيمة قد تحمل نص كلمة من المزود، و`$&`/`$'` في سلسلة الاستبدال تُفسَّر أنماطاً (مراجعة us2 #4)
  for (const [k, v] of Object.entries(vars ?? {})) s = s.replace(`{${k}}`, () => v);
  return s;
}

// أرقام غربية حتى بالعربية (الموجز): التايم كود والإطارات تُقرأ كأرقام لا كنص
export function formatNumber(n: number): string {
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-u-nu-latn' : 'en', { maximumFractionDigits: 3 }).format(n);
}

/** mm:ss من ميكروثانية (تقريب للأسفل). */
export function formatDurationUs(us: number): string {
  const total = Math.floor(us / 1e6);
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-u-nu-latn' : 'en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}
