import { realpath } from 'node:fs/promises';
import { resolve } from 'node:path';

// مساعدات مسار الإخراج بلا Electron كي تُختبر في vitest؛ export/ipc.ts يستعملها ويعرض الحوارات.

/**
 * حوار الحفظ يؤكّد الاستبدال على الاسم الذي كتبه المستخدم؛ إن أضفنا .mp4 وكان الملف الجديد موجوداً
 * فالتأكيد لم يشمله ويلزم سؤال ثانٍ (مراجعة US1 #5).
 */
export async function finalizeOutputPath(filePath: string, exists: (p: string) => Promise<boolean>): Promise<{ path: string; needsConfirm: boolean }> {
  if (/\.mp4$/i.test(filePath)) return { path: filePath, needsConfirm: false };
  const path = `${filePath}.mp4`;
  return { path, needsConfirm: await exists(path) };
}

/** هل المساران نفس الملف فعلاً؟ realpath للطرفين (وصلة رمزية إلى المصدر لا تتجاوز output_is_source — مراجعة US1 #7) */
export async function isSameFile(outputPath: string, sourcePath: string): Promise<boolean> {
  const source = await realpath(sourcePath).catch(() => resolve(sourcePath));
  let output: string;
  try {
    output = await realpath(outputPath);
  } catch (e) {
    if ((e as { code?: string }).code !== 'ENOENT') throw e;
    output = resolve(outputPath); // الملف غير موجود بعد: المسار المحلول كما هو
  }
  return output === source;
}
