import { randomUUID } from 'node:crypto';
import type { Transcript } from '../../core/contracts/types';
import type { FfmpegBins } from '../ffmpeg/paths';
import type { Envelope, IpcError } from '../ipc';
import { isProviderName } from '../providers';
import type { ProviderName } from '../providers';
import type { Secrets } from '../secrets';
import type { ProjectStore } from '../storage/projects';
import type { SettingsStore } from '../storage/settings';
import { runTranscriptionJob } from './job';
import type { JobState } from './job';

// واجهة ipcMain كما نستعملها فقط، لتُسجَّل في الاختبار بلا Electron
export interface IpcEventLike {
  senderFrame?: { url: string } | null;
}
export interface IpcMainLike {
  handle(channel: string, listener: (event: IpcEventLike, ...args: unknown[]) => unknown): void;
}

export interface TranscriptEvent {
  projectId: string;
  jobId: string;
  state: JobState;
  progress?: number;
  transcript?: Transcript;
  /** عند failed؛ الإلغاء يصل كـ failed مع code 'aborted' (لا حالة cancelled في المخطط) */
  error?: IpcError;
}

export interface TranscriptionIpcDeps {
  isTrustedSender: (frameUrl: string) => boolean;
  window: () => { webContents: { send(channel: string, ...args: unknown[]): void } } | null;
  projects: ProjectStore;
  settings: SettingsStore;
  secrets: Secrets;
  bins: () => FfmpegBins;
  /** للاختبار فقط: خادم محلي بدل المزود */
  baseUrls?: Partial<Record<ProviderName, string>>;
}

// نسخة مصغّرة من مساعدي src/main/ipc.ts (غير مُصدَّرة هناك)؛ نفس غلاف Envelope ونفس فحص المرسِل
class ArgError extends Error {
  code = 'bad_argument';
}
const str = (v: unknown, what: string): string => {
  if (typeof v !== 'string' || v.length === 0 || v.length > 256) throw new ArgError(`وسيط غير صالح: ${what}`);
  return v;
};
const id = (v: unknown, what: string): string => {
  const s = str(v, what);
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(s)) throw new ArgError(`معرّف غير صالح: ${what}`);
  return s;
};
const obj = (v: unknown, what: string): Record<string, unknown> => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new ArgError(`وسيط غير صالح: ${what}`);
  return v as Record<string, unknown>;
};
function toIpcError(e: unknown): IpcError {
  const code = typeof e === 'object' && e !== null && typeof (e as { code?: unknown }).code === 'string' ? (e as { code: string }).code : 'internal';
  return { code, message: e instanceof Error ? e.message : String(e) };
}

export function registerTranscriptionIpc(ipc: IpcMainLike, deps: TranscriptionIpcDeps): void {
  const jobs = new Map<string, AbortController>();

  function handle<T>(channel: string, fn: (...args: unknown[]) => Promise<T> | T): void {
    ipc.handle(channel, async (event, ...args): Promise<Envelope<T>> => {
      try {
        if (!deps.isTrustedSender(event.senderFrame?.url ?? '')) throw new ArgError('مصدر الطلب غير موثوق');
        return { ok: true, value: await fn(...args) };
      } catch (e) {
        return { ok: false, error: toIpcError(e) };
      }
    });
  }

  handle('transcript:start', async (p, o) => {
    const projectId = id(p, 'projectId');
    const opts = obj(o, 'options');
    const provider = opts['provider'];
    if (!isProviderName(provider)) throw new ArgError('مزود غير معروف');
    const model = str(opts['model'], 'model');
    const language = str(opts['language'], 'language');
    // مسار المصدر من المشروع المحفوظ فقط، لا من الواجهة
    const doc = await deps.projects.load(projectId);
    const bins = deps.bins();

    const jobId = randomUUID();
    const ac = new AbortController();
    jobs.set(jobId, ac);
    const emit = (e: Omit<TranscriptEvent, 'projectId' | 'jobId'>): void => {
      deps.window()?.webContents.send('transcript:event', { projectId, jobId, ...e } satisfies TranscriptEvent);
    };

    void runTranscriptionJob(
      {
        bins,
        secrets: deps.secrets,
        settings: deps.settings,
        projectCacheDir: deps.projects.cacheDir(projectId),
        sourcePath: doc.source.path,
        provider,
        model,
        language,
        baseUrl: deps.baseUrls?.[provider],
        // done/failed تُرسل من then/catch أدناه مع النص أو الخطأ
        onProgress: (state, progress) => {
          if (state !== 'done' && state !== 'failed') emit({ state, progress });
        },
      },
      ac.signal,
    )
      .then(
        (transcript) => emit({ state: 'done', progress: 1, transcript }),
        (e: unknown) => emit({ state: 'failed', error: toIpcError(e) }),
      )
      .finally(() => jobs.delete(jobId));

    return { jobId };
  });

  handle('transcript:cancel', (j) => {
    jobs.get(str(j, 'jobId'))?.abort();
  });
}
