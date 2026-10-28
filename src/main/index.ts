import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { app, BrowserWindow, ipcMain, safeStorage } from 'electron';
import { createProjectStore } from './storage/projects';
import { createStyleStore } from './storage/styles';
import { createSettingsStore } from './storage/settings';
import { userDataDir } from './storage/paths';
import { createSecrets } from './secrets';
import { resolveFfmpeg } from './ffmpeg/paths';
import type { FfmpegBins } from './ffmpeg/paths';
import { registerIpc } from './ipc';
import { registerExportIpc } from './export/ipc';
import { registerTranscriptionIpc } from './transcription/ipc';
import { plaintextTestSafeStorage } from './testSafeStorage';
import { handleMediaProtocol, registerMediaScheme } from './protocol';

const isTest = process.env['AI_EDITOR_TEST'] === '1';
// خطاف الاختبار فقط: خادم محلي بدل المزوّدين (tests/e2e) — يُقرأ حصراً عندما isTest
const testProviderBaseUrl = isTest ? process.env['AI_EDITOR_PROVIDER_BASE_URL'] : undefined;

// خطاف الاختبار فقط: مجلد بيانات معزول لكل تشغيل (قبل whenReady كي تراه المخازن)
const testUserData = process.env['AI_EDITOR_USER_DATA'];
if (isTest && testUserData) app.setPath('userData', testUserData);

registerMediaScheme();

// التطوير: <repo>/resources (من out/main/index.*)؛ الحزمة: process.resourcesPath (electron-builder extraResources)
const resourcesDir = app.isPackaged
  ? process.resourcesPath
  : fileURLToPath(new URL('../../resources', import.meta.url));
const preloadPath = fileURLToPath(new URL('../preload/index.cjs', import.meta.url));
const rendererIndex = fileURLToPath(new URL('../renderer/index.html', import.meta.url));

let win: BrowserWindow | null = null;

const devUrl = process.env['ELECTRON_RENDERER_URL'];
const trustedOrigin = devUrl && !app.isPackaged ? devUrl : pathToFileURL(rendererIndex).href;
function isTrustedUrl(url: string): boolean {
  return url.startsWith(trustedOrigin);
}

function createWindow(): void {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'محرر المونتاج الذكي',
    show: false,
    webPreferences: { preload: preloadPath, contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  // لا نوافذ جديدة ولا تنقّل خارج صفحة الواجهة (إسقاط ملف HTML على النافذة = تنقّل في Chromium)
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e, url) => {
    if (!isTrustedUrl(url)) e.preventDefault();
  });
  // حارس احتياطي: إن اكتمل تنقّل إلى عنوان غير موثوق لأي سبب، نعيد تحميل الواجهة
  win.webContents.on('did-navigate', (_e, url) => {
    if (!isTrustedUrl(url) && url !== 'about:blank') void win?.loadFile(rendererIndex);
  });
  win.once('ready-to-show', () => win?.show());
  win.on('closed', () => {
    win = null;
  });
  if (devUrl && !app.isPackaged) void win.loadURL(devUrl);
  else void win.loadFile(rendererIndex);
}

app.whenReady().then(async () => {
  handleMediaProtocol();
  const root = userDataDir();
  const styles = createStyleStore(root);
  const defaultStylePath = join(resourcesDir, 'styles', 'default-v1.json');
  let bins: FfmpegBins | null = null;
  const projects = createProjectStore(root);
  const settings = createSettingsStore(root);
  // في الاختبار فقط: مخزن نصي في مجلد بيانات مؤقت (testSafeStorage.ts)؛ الإنتاج دائماً safeStorage (القرار 18)
  const secrets = createSecrets({ safeStorage: isTest ? plaintextTestSafeStorage() : safeStorage, filePath: join(root, 'secrets.enc'), platform: process.platform });
  const getBins = (): FfmpegBins => (bins ??= resolveFfmpeg({ resourcesDir: join(resourcesDir, 'ffmpeg') }));
  registerIpc({
    window: () => win,
    isTrustedSender: isTrustedUrl,
    projects,
    styles,
    settings,
    secrets,
    bins: getBins,
    defaultStylePath,
    isTest,
  });
  registerTranscriptionIpc(ipcMain, {
    window: () => win,
    isTrustedSender: isTrustedUrl,
    projects,
    settings,
    secrets,
    bins: getBins,
    baseUrls: testProviderBaseUrl ? { deepgram: testProviderBaseUrl, elevenlabs: testProviderBaseUrl } : undefined,
  });
  registerExportIpc({ window: () => win, isTrustedSender: isTrustedUrl, projects, bins: () => (bins ??= resolveFfmpeg({ resourcesDir: join(resourcesDir, 'ffmpeg') })), isTest });
  await styles.ensureDefault(defaultStylePath);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
