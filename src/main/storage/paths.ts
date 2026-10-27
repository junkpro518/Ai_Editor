import { createRequire } from 'node:module';
import type { app } from 'electron';

// الملف الوحيد الذي يلمس electron، وبتحميل كسول داخل الدالة:
// بقية وحدات التخزين تُحمَّل في vitest على Node بلا Electron.
export function userDataDir(): string {
  const electron = createRequire(import.meta.url)('electron') as { app: typeof app };
  return electron.app.getPath('userData');
}
