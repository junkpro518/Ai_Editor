import { useSyncExternalStore } from 'react';
import type { ProjectDocument, Transcript } from '../../core/contracts/types';
import { withCaptions } from '../../core/captions/derive';
import { commandContext, getState, onEffect, run, setSourceMissing, systemUpdate, toIpcError } from '../commands/runtime';
import type { IpcError } from '../commands/runtime';

// مهمة التفريغ من طرف الواجهة (T046، FR-002/FR-016/FR-017): الأمر النقي transcript.request يطلق الأثر
// request-transcript؛ هنا نقرأ المزود من الإعدادات، نطلب من main، ونحدّث transcriptJob بتحديثات نظامية
// (ليست أوامر ولا تُتراجع). jobId يبقى في الذاكرة فقط (المخطط لا يسمح بحقول إضافية في transcriptJob).

export type Provider = 'deepgram' | 'elevenlabs';
export const PROVIDERS: Record<Provider, { label: string; host: string; defaultModel: string; language: string }> = {
  deepgram: { label: 'Deepgram', host: 'api.deepgram.com', defaultModel: 'nova-3', language: 'ar-SA' },
  elevenlabs: { label: 'ElevenLabs', host: 'api.elevenlabs.io', defaultModel: 'scribe_v2', language: 'ar' },
};
export function providerOf(name: string): Provider {
  return name === 'elevenlabs' ? 'elevenlabs' : 'deepgram';
}
/** نفس صيغة Secrets.keyRef في main: «deepgram (…abcd)» */
export const keyRefOf = (provider: Provider, last4: string): string => `${provider} (…${last4})`;

export type JobState = ProjectDocument['transcriptJob']['state'];
export const RUNNING_STATES: ReadonlySet<JobState> = new Set<JobState>(['extracting_audio', 'uploading', 'transcribing']);

export interface DisclosureInfo {
  provider: Provider;
  model: string;
  host: string;
  keyRef: string;
  last4: string;
  durationUs: number;
}

interface LiveJob {
  projectId: string;
  jobId: string | null;
}
interface TranscriptUiState {
  live: LiveJob | null;
  /** إفصاح FR-017 بانتظار موافقة المستخدم */
  pendingDisclosure: DisclosureInfo | null;
}
let ui: TranscriptUiState = { live: null, pendingDisclosure: null };
const listeners = new Set<() => void>();
function set(patch: Partial<TranscriptUiState>): void {
  ui = { ...ui, ...patch };
  listeners.forEach((l) => l());
}
export function useTranscriptUi(): TranscriptUiState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => ui,
  );
}
export const isLive = (projectId: string): boolean => ui.live?.projectId === projectId;

const now = (): string => new Date().toISOString();

function patchJob(projectId: string, patch: Partial<ProjectDocument['transcriptJob']>, immediate = false): Promise<void> {
  const p = getState().project;
  if (!p || p.id !== projectId) return Promise.resolve();
  return systemUpdate({ ...p, transcriptJob: { ...p.transcriptJob, ...patch } }, { immediate });
}

function fail(projectId: string, code: string): void {
  set({ live: null });
  void patchJob(projectId, { state: 'failed', error: code, finishedAt: now() }, true);
}

/** الحدث النظامي الوحيد الذي يغيّر المشروع خارج الأوامر: إلحاق التفريغ المكتمل (موجز المرحلة 3). */
export function applyTranscript(transcript: Transcript): Promise<void> {
  const p = getState().project;
  if (!p) return Promise.resolve();
  const { error: _dropped, ...job } = p.transcriptJob;
  // قاعدة الإبطال (data-model §1.10): التفريغ تغيّر → الكابشن يُشتق هنا بنفس سياق الأوامر (measure)
  return systemUpdate(
    withCaptions({ ...p, transcript, transcriptJob: { ...job, state: 'done', progress: 1, finishedAt: now(), audioHash: transcript.audioSha256 } }, commandContext()),
    { immediate: true },
  );
}

async function startJob(project: ProjectDocument): Promise<void> {
  const settings = await window.api.settings.load();
  const provider = providerOf(settings.transcription.provider);
  const model = settings.transcription.model || PROVIDERS[provider].defaultModel;
  set({ live: { projectId: project.id, jobId: null } });
  // حفظ فوري: main يقرأ المشروع من القرص، والحالة الجارية يجب أن تبقى محفوظة لحالة الإغلاق أثناء التفريغ (FR-016)
  await patchJob(project.id, { provider, model }, true);
  try {
    const { jobId } = await window.api.transcript.start(project.id, { provider, model, language: PROVIDERS[provider].language });
    if (ui.live?.projectId === project.id) set({ live: { projectId: project.id, jobId } });
  } catch (e) {
    fail(project.id, toIpcError(e).code);
  }
}

onEffect('request-transcript', (_effect, project) => {
  void startJob(project);
});

// الأحداث تُفتح عند تحميل الوحدة: أول حدث (extracting_audio) قد يسبق وصول jobId، فنطابق بالمشروع لا بالمهمة
window.api.transcript.onEvent((e) => {
  // مهمة انتهت لمشروع لم يبقَ مفتوحاً (FR-001 يسمح بالتصفح أثناء التفريغ): نحرّر المؤشر الحي؛ المستند المحفوظ
  // يبقى «جارياً» فيعرض الاستئناف عند فتحه (FR-016) — النتيجة نفسها لا تُلحق بمشروع غير مفتوح
  if ((e.state === 'done' || e.state === 'failed') && ui.live?.projectId === e.projectId) set({ live: null });
  const project = getState().project;
  if (!project || e.projectId !== project.id) return;
  if (e.state === 'done' && e.transcript) {
    set({ live: null });
    void applyTranscript(e.transcript);
    return;
  }
  if (e.state === 'failed') {
    fail(project.id, e.error?.code ?? 'provider_error');
    return;
  }
  const progress = typeof e.progress === 'number' ? Math.max(0, Math.min(1, e.progress)) : undefined;
  void patchJob(project.id, { state: e.state, ...(progress === undefined ? {} : { progress }) });
});

export function cancelTranscript(): void {
  const jobId = ui.live?.jobId;
  if (jobId) void window.api.transcript.cancel(jobId);
}

export type FlowResult = { ok: true } | { ok: false; code: string; message: string };
const err = (code: string, message = ''): FlowResult => ({ ok: false, code, message });

/**
 * طلب التفريغ من الواجهة: مفتاح محفوظ؟ ← إفصاح لأول مرة لكل {مزود، مفتاح} (FR-017) ← الأمر (التأكيد عبر runtime).
 * بعد الإفصاح يُشغَّل الأمر مؤكَّداً من acceptDisclosure.
 */
export async function requestTranscript(): Promise<FlowResult> {
  const project = getState().project;
  if (!project) return err('no_project');
  if (!project.source.hasAudio) return err('no_audio');
  const [settings, keys] = await Promise.all([window.api.settings.load(), window.api.secrets.list()]);
  const provider = providerOf(settings.transcription.provider);
  const key = keys.find((k) => k.name === provider);
  if (!key) return err('secret_not_found');
  const keyRef = keyRefOf(provider, key.last4);
  const accepted = settings.transcription.disclosures.some((d) => d.provider === provider && d.keyRef === keyRef);
  if (!accepted) {
    set({
      pendingDisclosure: {
        provider,
        model: settings.transcription.model || PROVIDERS[provider].defaultModel,
        host: PROVIDERS[provider].host,
        keyRef,
        last4: key.last4,
        durationUs: project.source.durationUs,
      },
    });
    return { ok: true };
  }
  return runRequest(false);
}

async function runRequest(confirmed: boolean): Promise<FlowResult> {
  try {
    await run('transcript.request', { mode: 'cloud' }, { confirmed });
    return { ok: true };
  } catch (e) {
    const ie: IpcError = toIpcError(e);
    return err(ie.code, ie.message);
  }
}

export async function acceptDisclosure(): Promise<FlowResult> {
  const info = ui.pendingDisclosure;
  if (!info) return err('no_disclosure');
  set({ pendingDisclosure: null });
  // main يسجّل الإفصاح بـkeyRef المفتاح المحفوظ فعلاً ويرفض أي تفريغ قبله (FR-017)؛ الواجهة لا تكتب disclosures
  try {
    await window.api.transcript.acceptDisclosure(info.provider);
  } catch (e) {
    const ie = toIpcError(e);
    return err(ie.code, ie.message);
  }
  // الموافقة على الإفصاح هي تأكيد الأمر نفسه (العقد: «التأكيد الأول يعرض الإفصاح»)
  return runRequest(true);
}

export function dismissDisclosure(): void {
  set({ pendingDisclosure: null });
}

/**
 * الاستئناف (FR-016): بعد إغلاق أثناء التفريغ نعيد الطلب من استخراج الصوت بعد التحقق أن المصدر لم يتغير
 * (الحجم وتاريخ التعديل؛ مستند قديم بلا هذين الحقلين يُكتفى بوجود الملف).
 */
export async function resumeTranscript(): Promise<FlowResult> {
  const project = getState().project;
  if (!project) return err('no_project');
  const st = await window.api.project.statSource(project.id);
  if (!st.exists) {
    setSourceMissing(true);
    return err('source_missing');
  }
  const { fileSize, mtime } = project.source;
  if (fileSize !== undefined && mtime !== undefined && (st.fileSize !== fileSize || st.mtime !== mtime)) return err('source_changed');
  return requestTranscript();
}

/** إعادة ربط مصدر منقول (FR-016): اختيار ملف ← probe ← مطابقة البصمة ← تحديث المسار وحفظ فوري (يعيد تسجيل media://). */
export async function relinkSource(): Promise<FlowResult | { ok: false; code: 'cancelled'; message: string }> {
  const project = getState().project;
  if (!project) return err('no_project');
  const path = await window.api.project.pickVideoFile();
  if (!path) return err('cancelled');
  try {
    const probe = await window.api.project.probe(path);
    if (probe.hash !== project.source.hash) return err('source_mismatch');
    const source = { ...project.source, path: probe.path, fileName: probe.fileName };
    if (probe.fileSize !== undefined) source.fileSize = probe.fileSize;
    if (probe.mtime !== undefined) source.mtime = probe.mtime;
    await systemUpdate({ ...project, source }, { immediate: true });
    setSourceMissing(false);
    window.__preview?.show(project.id, 0);
    return { ok: true };
  } catch (e) {
    const ie = toIpcError(e);
    return err(ie.code, ie.message);
  }
}
