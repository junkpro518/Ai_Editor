import { isAbsolute } from 'node:path';
import { access, stat } from 'node:fs/promises';
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
  /** هل عنوان الإطار المرسِل هو صفحة الواجهة المحمَّلة (index.html أو خادم التطوير)؟ */
  isTrustedSender: (frameUrl: string) => boolean;
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
export function toIpcError(e: unknown): IpcError {
  const code =
    typeof e === 'object' && e !== null && typeof (e as { code?: unknown }).code === 'string'
      ? (e as { code: string }).code
      : 'internal';
  const message = e instanceof Error ? e.message : String(e);
  return { code, message };
}

export class ArgError extends Error {
  code = 'bad_argument';
}
export const str = (v: unknown, what: string): string => {
  if (typeof v !== 'string' || v.length === 0 || v.length > 4096)
    throw new ArgError(`وسيط غير صالح: ${what}`);
  return v;
};
export const int = (v: unknown, what: string): number => {
  if (!Number.isInteger(v) || (v as number) < 0) throw new ArgError(`وسيط غير صالح: ${what}`);
  return v as number;
};
export const obj = (v: unknown, what: string): Record<string, unknown> => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new ArgError(`وسيط غير صالح: ${what}`);
  return v as Record<string, unknown>;
};
export const absPath = (v: unknown, what: string): string => {
  const s = str(v, what);
  if (!isAbsolute(s) || s.includes('\0')) throw new ArgError(`مسار غير مطلق: ${what}`);
  return s;
};
// معرّفات المشاريع والأنماط تصبح أسماء مجلدات: لا فواصل مسار ولا نقاط
export const id = (v: unknown, what: string): string => {
  const s = str(v, what);
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(s)) throw new ArgError(`معرّف غير صالح: ${what}`);
  return s;
};

export type Handle = <T>(channel: string, fn: (...args: unknown[]) => Promise<T> | T) => void;

/** مسجّل قنوات بغلاف موحد؛ تستعمله registerIpc وقنوات التصدير (src/main/export/ipc.ts). */
export function makeHandle(isTrustedSender: IpcDeps['isTrustedSender']): Handle {
  return function handle<T>(channel: string, fn: (...args: unknown[]) => Promise<T> | T): void {
    ipcMain.handle(channel, async (event, ...args: unknown[]): Promise<Envelope<T>> => {
      try {
        // دفاع في العمق: لا يُقبل طلب إلا من صفحة الواجهة نفسها (لا من صفحة انزلق إليها التنقل)
        if (!isTrustedSender(event.senderFrame?.url ?? '')) throw new ArgError('مصدر الطلب غير موثوق');
        return { ok: true, value: await fn(...args) };
      } catch (e) {
        return { ok: false, error: toIpcError(e) };
      }
    });
  };
}

export function registerIpc(deps: IpcDeps): void {
  // المسارات التي اختارها المستخدم عبر الحوار في هذه الجلسة؛ probe لا يقبل غيرها (إلا في الاختبار)
  const pickedPaths = new Set<string>();
  const probedPaths = new Set<string>();
  const handle = makeHandle(deps.isTrustedSender);

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
    id(doc.id, 'project.id'); // يصير اسم مجلد (مراجعة phase-2 #1)
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

  // FR-016: هل ملف المصدر ما زال في مكانه وبلا تغيير؟ المسار من المشروع المحفوظ لا من الواجهة
  handle('project:statSource', async (i) => {
    const doc = await deps.projects.load(id(i, 'id'));
    try {
      const st = await stat(doc.source.path);
      return { exists: true, fileSize: st.size, mtime: st.mtime.toISOString() };
    } catch (e) {
      if ((e as { code?: string }).code === 'ENOENT') return { exists: false };
      throw e;
    }
  });
  handle('project:writeSnapshot', (i, e) => {
    const entry = obj(e, 'entry');
    int(entry['seq'], 'entry.seq');
    validateProject(entry['snapshot']); // اللقطة تُدقَّق قبل أن تُكتب وتُستعاد (مراجعة phase-2 #4)
    return deps.projects.writeSnapshot(id(i, 'id'), entry as unknown as HistoryEntry);
  });
  handle('project:readSnapshots', (i) => deps.projects.readSnapshots(id(i, 'id')));

  handle('style:ensureDefault', () => deps.styles.ensureDefault(deps.defaultStylePath));
  handle('style:loadVersion', (s, v) => deps.styles.loadVersion(id(s, 'styleId'), int(v, 'version')));
  handle('style:listVersions', (s) => deps.styles.listVersions(id(s, 'styleId')));
  handle('style:saveVersion', (sv) => {
    const style = obj(sv, 'style');
    id(style['styleId'], 'style.styleId'); // يصير اسم مجلد (مراجعة phase-2 #3)
    return deps.styles.saveVersion(style as unknown as StyleVersion);
  });

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
