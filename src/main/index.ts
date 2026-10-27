import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { app, BrowserWindow, safeStorage } from 'electron';
import { createProjectStore } from './storage/projects';
import { createStyleStore } from './storage/styles';
import { createSettingsStore } from './storage/settings';
import { userDataDir } from './storage/paths';
import { createSecrets } from './secrets';
import { resolveFfmpeg } from './ffmpeg/paths';
import type { FfmpegBins } from './ffmpeg/paths';
import { registerIpc } from './ipc';
import { handleMediaProtocol, registerMediaScheme } from './protocol';

const isTest = process.env['AI_EDITOR_TEST'] === '1';

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

function createWindow(): void {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'محرر المونتاج الذكي',
    show: false,
    webPreferences: { preload: preloadPath, contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.once('ready-to-show', () => win?.show());
  win.on('closed', () => {
    win = null;
  });
  const devUrl = process.env['ELECTRON_RENDERER_URL'];
  if (devUrl && !app.isPackaged) void win.loadURL(devUrl);
  else void win.loadFile(rendererIndex);
}

app.whenReady().then(async () => {
  handleMediaProtocol();
  const root = userDataDir();
  const styles = createStyleStore(root);
  const defaultStylePath = join(resourcesDir, 'styles', 'default-v1.json');
  let bins: FfmpegBins | null = null;
  registerIpc({
    window: () => win,
    projects: createProjectStore(root),
    styles,
    settings: createSettingsStore(root),
    secrets: createSecrets({ safeStorage, filePath: join(root, 'secrets.enc'), platform: process.platform }),
    bins: () => (bins ??= resolveFfmpeg({ resourcesDir: join(resourcesDir, 'ffmpeg') })),
    defaultStylePath,
    isTest,
  });
  await styles.ensureDefault(defaultStylePath);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
