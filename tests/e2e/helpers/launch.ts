import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { _electron } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';

export const repo = fileURLToPath(new URL('../../..', import.meta.url));
export const fixture = (name: string): string => join(repo, 'tests/fixtures', name);

/** يشغّل التطبيق المبني (pnpm build) بمجلد بيانات مؤقت وخطاف الاختبار؛ --no-sandbox لصندوق Linux فقط. */
export async function launchApp(): Promise<{ app: ElectronApplication; page: Page; userData: string }> {
  const mainPath = ['out/main/index.js', 'out/main/index.mjs'].map((p) => join(repo, p)).find(existsSync);
  if (!mainPath) throw new Error('لم نجد out/main — شغّل pnpm build أولاً');
  const userData = mkdtempSync(join(tmpdir(), 'ai-editor-e2e-'));
  const app = await _electron.launch({
    args: ['--no-sandbox', mainPath],
    env: { ...process.env, AI_EDITOR_TEST: '1', AI_EDITOR_USER_DATA: userData },
  });
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  return { app, page, userData };
}
