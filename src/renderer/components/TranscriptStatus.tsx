import { useEffect, useState } from 'react';
import { useRuntime } from '../commands/runtime';
import { t } from '../i18n';
import { RUNNING_STATES, cancelTranscript, relinkSource, requestTranscript, resumeTranscript, useTranscriptUi } from '../transcript/run';
import type { FlowResult, JobState } from '../transcript/run';

// شريط حالة التفريغ تحت شريط التنقل (FR-001: التفريغ في الخلفية بمؤشر تقدم بلا حجب للتصفح؛ FR-016: الاستئناف
// وإعادة ربط المصدر؛ FR-017: الفشل برسالة بالسبب). يظهر فقط حين يوجد ما يُقال.

const KNOWN_ERRORS: ReadonlySet<string> = new Set([
  'offline',
  'no_api_key',
  'secret_not_found',
  'secrets_unavailable',
  'quota',
  'timeout',
  'provider_error',
  'no_audio',
  'extract_failed',
  'bad_response',
  'aborted',
  'source_missing',
  'source_changed',
  'source_mismatch',
  'local_mode_unavailable',
  'disclosure_required',
  'transcript_busy',
]);
type ErrorKey = `transcript.error.${'offline' | 'no_api_key'}`;
/** رسالة عربية مستقرة لكل رمز خطأ في التفريغ؛ الرموز غير المعروفة تظهر برمزها (لا فشل صامت). */
export function transcriptErrorText(code: string, message = ''): string {
  return KNOWN_ERRORS.has(code) ? t(`transcript.error.${code}` as ErrorKey) : `${t('error.generic')} (${code}) ${message}`.trim();
}
type StateKey = `transcript.state.${JobState & ('extracting_audio' | 'uploading' | 'transcribing' | 'done' | 'failed')}`;
export function jobStateText(state: JobState): string {
  return state === 'idle' ? '' : t(`transcript.state.${state}` as StateKey);
}

export function TranscriptStatus() {
  const { project, sourceMissing: missing } = useRuntime();
  const { live } = useTranscriptUi();
  const [flow, setFlow] = useState<FlowResult | null>(null);
  const projectId = project?.id ?? null;

  useEffect(() => setFlow(null), [projectId, missing]);

  if (!project) return null;
  const job = project.transcriptJob;
  const running = live?.projectId === project.id;
  const stale = !running && RUNNING_STATES.has(job.state);

  const act = (fn: () => Promise<FlowResult>): void => {
    setFlow(null);
    void fn().then(setFlow);
  };

  if (missing) {
    return (
      <div className="status-bar bad" role="alert" data-testid="source-missing">
        <span>{t('transcript.sourceMissing')}</span>
        <button type="button" data-testid="relink" onClick={() => act(relinkSource)}>
          {t('transcript.relink')}
        </button>
        {flow && !flow.ok && flow.code !== 'cancelled' && <span className="reason">{transcriptErrorText(flow.code, flow.message)}</span>}
      </div>
    );
  }

  if (running) {
    return (
      <div className="status-bar" role="status" data-testid="transcript-progress" data-state={job.state}>
        <span>{jobStateText(job.state)}</span>
        <progress value={job.progress ?? 0} max={1} />
        <button type="button" data-testid="transcript-cancel" disabled={!live?.jobId} onClick={cancelTranscript}>
          {t('transcript.cancel')}
        </button>
      </div>
    );
  }

  if (stale) {
    return (
      <div className="status-bar warn" role="alert" data-testid="transcript-stale">
        <strong>{t('transcript.resume.title')}</strong>
        <span>{t('transcript.resume.body')}</span>
        <button type="button" className="primary" data-testid="transcript-resume" onClick={() => act(resumeTranscript)}>
          {t('transcript.retry')}
        </button>
        {flow && !flow.ok && <span className="reason">{transcriptErrorText(flow.code, flow.message)}</span>}
      </div>
    );
  }

  if (job.state === 'failed') {
    return (
      <div className="status-bar bad" role="alert" data-testid="transcript-failed" data-code={job.error ?? ''}>
        <span>{t('transcript.failedWith', { reason: transcriptErrorText(job.error ?? 'provider_error') })}</span>
        <button type="button" data-testid="transcript-retry" onClick={() => act(requestTranscript)}>
          {t('transcript.retry')}
        </button>
        {flow && !flow.ok && <span className="reason">{transcriptErrorText(flow.code, flow.message)}</span>}
      </div>
    );
  }

  return null;
}
