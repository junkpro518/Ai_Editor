import { BUNDLED_FONT_FAMILIES, DEFAULT_FONT_FAMILY, resolveFontFamily } from '../core/captions/layout';

// T059 — خطوط الكابشن (بحث B §4، R6): كل عائلات resources/fonts تُسجَّل بـFontFace من أصول Vite (new URL + import.meta.url
// يحوّلها البناء إلى assets/ بجانب الحزمة — نفس أصل @font-face في styles.css، فلا تغيير في CSP) وتُحمَّل فعلاً قبل
// الإطار 0؛ خطوط النظام ممنوعة: عائلة غير مشحونة تسقط إلى IBM Plex Sans Arabic مع تحذير.

interface FaceSpec {
  family: string;
  url: string;
  /** وزن واحد أو مدى لخط متغيّر */
  weight: string;
}

// مسارات حرفية ثابتة: Vite يحوّل new URL(ثابت, import.meta.url) إلى أصل مبني؛ النمط الديناميكي خارج جذر renderer لا يُبنى
const FACES: readonly FaceSpec[] = [
  { family: 'IBM Plex Sans Arabic', url: new URL('../../resources/fonts/ibm-plex-sans-arabic/IBMPlexSansArabic-Regular.ttf', import.meta.url).href, weight: '400' },
  { family: 'IBM Plex Sans Arabic', url: new URL('../../resources/fonts/ibm-plex-sans-arabic/IBMPlexSansArabic-Medium.ttf', import.meta.url).href, weight: '500' },
  { family: 'IBM Plex Sans Arabic', url: new URL('../../resources/fonts/ibm-plex-sans-arabic/IBMPlexSansArabic-SemiBold.ttf', import.meta.url).href, weight: '600' },
  { family: 'IBM Plex Sans Arabic', url: new URL('../../resources/fonts/ibm-plex-sans-arabic/IBMPlexSansArabic-Bold.ttf', import.meta.url).href, weight: '700' },
  { family: 'Cairo', url: new URL('../../resources/fonts/cairo/Cairo[slnt,wght].ttf', import.meta.url).href, weight: '200 1000' },
  { family: 'Tajawal', url: new URL('../../resources/fonts/tajawal/Tajawal-Regular.ttf', import.meta.url).href, weight: '400' },
  { family: 'Tajawal', url: new URL('../../resources/fonts/tajawal/Tajawal-Bold.ttf', import.meta.url).href, weight: '700' },
  { family: 'Noto Sans Arabic', url: new URL('../../resources/fonts/noto-sans-arabic/NotoSansArabic[wdth,wght].ttf', import.meta.url).href, weight: '100 900' },
  { family: 'Noto Naskh Arabic', url: new URL('../../resources/fonts/noto-naskh-arabic/NotoNaskhArabic[wght].ttf', import.meta.url).href, weight: '400 700' },
];

let ready = false;
let loading: Promise<void> | null = null;
const loadedFamilies = new Set<string>();

/**
 * يحمّل كل الخطوط المشحونة مرة واحدة (لا يرفض أبداً — خط فاشل يُسجَّل تحذيراً). `fontsReady()` تصير true فقط عندما
 * تحمَّل العائلة الافتراضية كاملة؛ وإلا لا يُرسم كابشن (composeFrame تتحقق من fonts.ready). `document.fonts.status`
 * لا يكفي: يكون 'loaded' قبل أي تحميل فعلي.
 */
export function loadFonts(): Promise<void> {
  loading ??= (async () => {
    const results = await Promise.allSettled(
      FACES.map(async (spec) => {
        const face = new FontFace(spec.family, `url("${spec.url}")`, { weight: spec.weight, style: 'normal' });
        document.fonts.add(face);
        await face.load();
        return spec;
      }),
    );
    const failed = new Set<string>();
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') loadedFamilies.add(r.value.family);
      else {
        failed.add(FACES[i]!.family);
        console.warn(`[fonts] تعذّر تحميل ${FACES[i]!.family} (${FACES[i]!.url}):`, r.reason);
      }
    });
    await document.fonts.ready;
    ready = loadedFamilies.has(DEFAULT_FONT_FAMILY) && !failed.has(DEFAULT_FONT_FAMILY);
    if (!ready) console.warn('[fonts] العائلة الافتراضية لم تُحمَّل — لن يُرسم كابشن');
  })();
  return loading;
}

/** هل العائلة الافتراضية محمَّلة فعلاً (الكابشن يُرسم فقط بعدها)؟ */
export function fontsReady(): boolean {
  return ready;
}

/** العائلات التي يمكن للنمط تسميتها */
export const allowedFontFamilies: readonly string[] = BUNDLED_FONT_FAMILIES;

const warned = new Set<string>();
/** يسجّل تحذيراً مرة واحدة لكل عائلة غير مشحونة يسمّيها النمط (السقوط نفسه يحدث في core: resolveFontFamily). */
export function warnUnknownFontFamily(family: string): void {
  const { fallback } = resolveFontFamily(family);
  if (!fallback || warned.has(family)) return;
  warned.add(family);
  console.warn(`[fonts] النمط يطلب الخط «${family}» وهو غير مشحون مع التطبيق؛ يُستعمل ${DEFAULT_FONT_FAMILY} (خطوط النظام ممنوعة)`);
}
