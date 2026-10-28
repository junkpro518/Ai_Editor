/* eslint-disable no-restricted-imports -- أنواع فقط: توصيف window.api المشترك بين preload والواجهة (T024)؛ لا كود من main يصل الواجهة */
import type { ProjectDocument, StyleVersion, Transcript } from '../core/contracts/types';
import type { ProbeLike as ProbeResult } from '../core/commands/types';
import type { HistoryEntry } from '../core/history/snapshots';
import type { Settings, SettingsPatch } from '../main/storage/settings';
import type { EncoderReport } from '../main/ffmpeg/encoders';
import type { ExportFinishResult, ExportStartOptions } from '../main/export/ipc';

declare global {
  interface IpcError {
    code: string;
    message: string;
  }

  /** حدث مهمة التفريغ من main (src/main/transcription/ipc.ts) بعد تنقيته في preload */
  interface TranscriptEvent {
    projectId: string;
    jobId: string;
    state: ProjectDocument['transcriptJob']['state'];
    progress?: number;
    transcript?: Transcript;
    error?: IpcError;
  }

  interface Api {
    project: {
      pickVideoFile(): Promise<string | null>;
      probe(path: string): Promise<ProbeResult>;
      probeFile(file: File): Promise<ProbeResult>;
      save(doc: ProjectDocument): Promise<void>;
      load(id: string): Promise<ProjectDocument>;
      list(): Promise<Array<{ id: string; name: string; updatedAt: string }>>;
      /** FR-016: حال ملف المصدر على القرص (من المشروع المحفوظ) */
      statSource(id: string): Promise<{ exists: true; fileSize: number; mtime: string } | { exists: false }>;
      writeSnapshot(id: string, entry: HistoryEntry): Promise<void>;
      readSnapshots(id: string): Promise<HistoryEntry[]>;
    };
    style: {
      ensureDefault(): Promise<StyleVersion>;
      loadVersion(styleId: string, version: number): Promise<StyleVersion>;
      listVersions(styleId: string): Promise<Array<{ version: number; date: string; reason: string }>>;
      saveVersion(sv: StyleVersion): Promise<void>;
    };
    settings: { load(): Promise<Settings>; save(patch: SettingsPatch): Promise<Settings> };
    secrets: {
      available(): Promise<{ ok: boolean; reason?: string }>;
      list(): Promise<Array<{ name: string; last4: string; createdAt: string }>>;
      set(name: string, value: string): Promise<void>;
      delete(name: string): Promise<void>;
    };
    ffmpeg: { encoders(): Promise<EncoderReport> };
    export: {
      pickOutput(defaultPath: string): Promise<string | null>;
      start(projectId: string, options: ExportStartOptions): Promise<{ sessionId: string }>;
      chunk(sessionId: string, data: ArrayBuffer, isKey: boolean, timestampUs: number): Promise<void>;
      referenceFrame(sessionId: string, index: number, png: ArrayBuffer): Promise<void>;
      finish(sessionId: string): Promise<ExportFinishResult>;
      cancel(sessionId: string): Promise<void>;
    };
    transcript: {
      start(projectId: string, options: { provider: string; model: string; language: string }): Promise<{ jobId: string }>;
      cancel(jobId: string): Promise<void>;
      /** يعيد دالة إلغاء الاشتراك */
      onEvent(cb: (event: TranscriptEvent) => void): () => void;
    };
    media: { urlFor(projectId: string): string };
    app: { version(): Promise<string>; platform: string; isTest: boolean };
  }

  interface TestHooks {
    importPath(
      path: string,
    ): Promise<{ ok: true; projectId: string } | { ok: false; code: string; message: string }>;
    state(): unknown;
  }

  interface Window {
    api: Api;
    /** خطافات الاختبار؛ تُعرَّف فقط عندما api.app.isTest */
    __test?: TestHooks;
    /** معاينة الوكيل F (T028)؛ قد لا تكون موجودة */
    __preview?: { show(projectId: string, frameIndex: number): void };
  }
}

export {};
