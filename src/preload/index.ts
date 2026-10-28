import { contextBridge, ipcRenderer, webUtils } from 'electron';

// الجسر الوحيد بين الواجهة وmain (T024). كل قناة ترجع غلافاً {ok,value}|{ok,error}؛ نفكّه هنا ونرفض بكائن عادي {code,message}.
type Envelope<T> = { ok: true; value: T } | { ok: false; error: { code: string; message: string } };

async function call<T>(channel: string, ...args: unknown[]): Promise<T> {
  const r = (await ipcRenderer.invoke(channel, ...args)) as Envelope<T>;
  if (r.ok) return r.value;
  throw r.error;
}

const api = {
  project: {
    pickVideoFile: () => call<string | null>('project:pickVideoFile'),
    probe: (path: string) => call('project:probe', path),
    // ملف مُسقَط: المسار يُشتق هنا من File حقيقي فقط (webUtils)؛ الواجهة لا تمرّر مسارات حرة
    probeFile: (file: File) => {
      const path = webUtils.getPathForFile(file);
      if (!path) return Promise.reject({ code: 'bad_argument', message: 'الملف المُسقَط بلا مسار' });
      return call('project:probeDropped', path);
    },
    save: (doc: unknown) => call<void>('project:save', doc),
    load: (id: string) => call('project:load', id),
    list: () => call('project:list'),
    writeSnapshot: (id: string, entry: unknown) => call<void>('project:writeSnapshot', id, entry),
    readSnapshots: (id: string) => call('project:readSnapshots', id),
  },
  style: {
    ensureDefault: () => call('style:ensureDefault'),
    loadVersion: (styleId: string, version: number) => call('style:loadVersion', styleId, version),
    listVersions: (styleId: string) => call('style:listVersions', styleId),
    saveVersion: (sv: unknown) => call<void>('style:saveVersion', sv),
  },
  settings: {
    load: () => call('settings:load'),
    save: (patch: unknown) => call('settings:save', patch),
  },
  secrets: {
    available: () => call('secrets:available'),
    list: () => call('secrets:list'),
    set: (name: string, value: string) => call<void>('secrets:set', name, value),
    delete: (name: string) => call<void>('secrets:delete', name),
  },
  ffmpeg: { encoders: () => call('ffmpeg:encoders') },
  // التصدير (T050): الواجهة ترمّز وترسل الكتل؛ main يدمج ويفحص (src/main/export/ipc.ts)
  export: {
    pickOutput: (defaultPath: string) => call<string | null>('export:pickOutput', defaultPath),
    start: (projectId: string, options: unknown) => call<{ sessionId: string }>('export:start', projectId, options),
    chunk: (sessionId: string, data: ArrayBuffer, isKey: boolean, timestampUs: number) =>
      call<void>('export:chunk', sessionId, data, isKey, timestampUs),
    referenceFrame: (sessionId: string, index: number, png: ArrayBuffer) =>
      call<void>('export:referenceFrame', sessionId, index, png),
    finish: (sessionId: string) => call('export:finish', sessionId),
    cancel: (sessionId: string) => call<void>('export:cancel', sessionId),
  },
  media: { urlFor: (projectId: string) => `media://source/${encodeURIComponent(projectId)}` },
  app: {
    version: () => call<string>('app:version'),
    platform: process.platform,
    isTest: process.env['AI_EDITOR_TEST'] === '1',
  },
};

contextBridge.exposeInMainWorld('api', api);
