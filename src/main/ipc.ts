import { isAbsolute } from 'node:path';
import { access } from 'node:fs/promises';
import type { BrowserWindow } from 'electron';
import { app, dialog, ipcMain } from 'electron';
import type { ProjectDocument, StyleVersion } from '../core/contracts/types';
import { validateProject } from '../core/contracts/validate';
import type { HistoryEntry } from '../core/history/snapshots';
import type { ProjectStore } from './storage/projects';
import type { StyleStore } from './storage/styles';
import type { SettingsPatch, SettingsStore } from './storage/settings';
import type { Secrets } from './secrets';
import type { FfmpegBins } from './ffmpeg/paths';
import { probe } from './ffmpeg/probe';
import { detectEncoders } from './ffmpeg/encoders';
import { registerMediaSource } from './protocol';

export interface IpcDeps {
  window: () => BrowserWindow | null;
  projects: ProjectStore;
  styles: StyleStore;
  settings: SettingsStore;
  secrets: Secrets;
  bins: () => FfmpegBins; // كسول: غياب ffmpeg يصل الواجهة كخطأ ffmpeg_missing لا كتعطّل للإقلاع
  defaultStylePath: string;
  isTest: boolean;
}

export interface IpcError {
  code: string;
  message: string;
}
export type Envelope<T> = { ok: true; value: T } | { ok: false; error: IpcError };

// الأخطاء تعبر IPC كأغلفة {code,message} لا كـError (contextBridge يُسقط الخصائص المخصصة والـstack لا يصل الواجهة)
function toIpcError(e: unknown): IpcError {
  const code =
    typeof e === 'object' && e !== null && typeof (e as { code?: unknown }).code === 'string'
      ? (e as { code: string }).code
      : 'internal';
  const message = e instanceof Error ? e.message : String(e);
  return { code, message };
}

class ArgError extends Error {
  code = 'bad_argument';
}
const str = (v: unknown, what: string): string => {
  if (typeof v !== 'string' || v.length === 0 || v.length > 4096)
    throw new ArgError(`وسيط غير صالح: ${what}`);
  return v;
};
const int = (v: unknown, what: string): number => {
  if (!Number.isInteger(v) || (v as number) < 0) throw new ArgError(`وسيط غير صالح: ${what}`);
  return v as number;
};
const obj = (v: unknown, what: string): Record<string, unknown> => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new ArgError(`وسيط غير صالح: ${what}`);
  return v as Record<string, unknown>;
};
const absPath = (v: unknown, what: string): string => {
  const s = str(v, what);
  if (!isAbsolute(s) || s.includes('\0')) throw new ArgError(`مسار غير مطلق: ${what}`);
  return s;
};
// معرّفات المشاريع والأنماط تصبح أسماء مجلدات: لا فواصل مسار ولا نقاط
const id = (v: unknown, what: string): string => {
  const s = str(v, what);
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(s)) throw new ArgError(`معرّف غير صالح: ${what}`);
  return s;
};

export function registerIpc(deps: IpcDeps): void {
  // المسارات التي اختارها المستخدم عبر الحوار في هذه الجلسة؛ probe لا يقبل غيرها (إلا في الاختبار)
  const pickedPaths = new Set<string>();
  const probedPaths = new Set<string>();

  function handle<T>(channel: string, fn: (...args: unknown[]) => Promise<T> | T): void {
    ipcMain.handle(channel, async (_event, ...args: unknown[]): Promise<Envelope<T>> => {
      try {
        return { ok: true, value: await fn(...args) };
      } catch (e) {
        return { ok: false, error: toIpcError(e) };
      }
    });
  }

  function allowSourcePath(doc: ProjectDocument): void {
    // مسار المصدر يجب أن يكون قد مرّ بـprobe في هذه الجلسة أو جاء من load لمشروع محفوظ
    if (!probedPaths.has(doc.source.path)) {
      throw Object.assign(new Error('مسار المصدر لم يمرّ بالفحص في هذه الجلسة'), {
        code: 'path_not_allowed',
      });
    }
  }

  handle('project:pickVideoFile', async () => {
    const win = deps.window();
    const opts = {
      properties: ['openFile' as const],
      filters: [{ name: 'فيديو', extensions: ['mp4', 'mov', 'm4v'] }],
    };
    const r = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts);
    const path = r.canceled ? undefined : r.filePaths[0];
    if (!path) return null;
    pickedPaths.add(path);
    return path;
  });

  handle('project:probe', async (p) => {
    const path = absPath(p, 'path');
    if (!pickedPaths.has(path)) {
      if (!deps.isTest) throw new ArgError('المسار لم يُختر عبر حوار الملفات');
      await access(path); // خطاف الاختبار: أي مسار مطلق موجود
    }
    const result = await probe(deps.bins(), path);
    probedPaths.add(result.path);
    return result;
  });

  // لا يصل إليها إلا preload بعد webUtils.getPathForFile على File حقيقي (الإسقاط)
  handle('project:probeDropped', async (p) => {
    const path = absPath(p, 'path');
    const result = await probe(deps.bins(), path);
    probedPaths.add(result.path);
    return result;
  });

  handle('project:save', async (d) => {
    const doc = obj(d, 'project');
    validateProject(doc);
    allowSourcePath(doc);
    await deps.projects.save(doc);
    registerMediaSource(doc.id, doc.source.path);
  });

  handle('project:load', async (i) => {
    const doc = await deps.projects.load(id(i, 'id'));
    probedPaths.add(doc.source.path);
    registerMediaSource(doc.id, doc.source.path);
    return doc;
  });

  handle('project:list', () => deps.projects.list());
  handle('project:writeSnapshot', (i, e) => {
    const entry = obj(e, 'entry');
    int(entry['seq'], 'entry.seq');
    return deps.projects.writeSnapshot(id(i, 'id'), entry as unknown as HistoryEntry);
  });
  handle('project:readSnapshots', (i) => deps.projects.readSnapshots(id(i, 'id')));

  handle('style:ensureDefault', () => deps.styles.ensureDefault(deps.defaultStylePath));
  handle('style:loadVersion', (s, v) => deps.styles.loadVersion(id(s, 'styleId'), int(v, 'version')));
  handle('style:listVersions', (s) => deps.styles.listVersions(id(s, 'styleId')));
  handle('style:saveVersion', (sv) => deps.styles.saveVersion(obj(sv, 'style') as unknown as StyleVersion));

  handle('settings:load', () => deps.settings.load());
  handle('settings:save', (p) => deps.settings.save(obj(p, 'patch') as SettingsPatch));

  // الأسرار: لا قناة قراءة أبداً (القرار 18)
  handle('secrets:available', () => deps.secrets.available());
  handle('secrets:list', () => deps.secrets.list());
  handle('secrets:set', (n, v) => deps.secrets.set(id(n, 'name'), str(v, 'value')));
  handle('secrets:delete', (n) => deps.secrets.delete(id(n, 'name')));

  handle('ffmpeg:encoders', () => detectEncoders(deps.bins()));

  handle('app:version', () => app.getVersion());
}
