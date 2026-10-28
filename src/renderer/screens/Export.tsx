import { useState } from 'react';
import { formatNumber, formatDurationUs, t } from '../i18n';
import { run, toIpcError, useRuntime } from '../commands/runtime';
import { cancelExport, useExport } from '../export/run';
import type { ExportError } from '../export/types';
import '../export/testHooks';

// شاشة التصدير (T051، FR-014): الاسم الافتراضي <اسم المصدر>-edited.mp4 بجانب المصدر، حوار الحفظ يؤكد الاستبدال،
// تقدّم وإلغاء، ونتيجة بحكم فحص التطابق — لا «نجح» إن فشل الفحص.

type ExportErrorKey =
  | 'error.encoder_unavailable'
  | 'error.write_failed'
  | 'error.output_is_source'
  | 'error.export_busy'
  | 'error.invalid_output_path'
  | 'error.timeline_empty'
  | 'error.encode_failed';
const KNOWN: ReadonlySet<string> = new Set([
  'encoder_unavailable',
  'write_failed',
  'output_is_source',
  'export_busy',
  'invalid_output_path',
  'timeline_empty',
  'encode_failed',
]);
function errorText(e: ExportError): string {
  return KNOWN.has(e.code) ? t(`error.${e.code}` as ExportErrorKey) : `${t('error.generic')} ${e.message}`;
}

/** مجلد المصدر + <الاسم بلا لاحقة>-edited.mp4 (بلا وحدة path في الواجهة: المسار ينتهي باسم الملف). */
export function defaultOutputPath(source: { path: string; fileName: string }): string {
  const dir = source.path.slice(0, source.path.length - source.fileName.length);
  const stem = source.fileName.replace(/\.[^.]+$/, '');
  return `${dir}${stem}-edited.mp4`;
}

export function Export() {
  const { project } = useRuntime();
  const status = useExport();
  const [outputPath, setOutputPath] = useState<string | null>(null);
  const [cmdError, setCmdError] = useState<ExportError | null>(null);
  if (!project) return <section className="screen">{t('timeline.empty')}</section>;

  const path = outputPath ?? defaultOutputPath(project.source);
  const running = status.phase === 'running';

  async function choose(): Promise<void> {
    const picked = await window.api.export.pickOutput(path);
    if (picked) setOutputPath(picked);
  }

  async function start(): Promise<void> {
    setCmdError(null);
    // حوار الحفظ (مع تأكيد الاستبدال) هو التأكيد المطلوب للأمر؛ يُفتح عند كل تصدير مملوءاً بالمسار المعروض
    const target = await window.api.export.pickOutput(path);
    if (!target) return;
    setOutputPath(target);
    try {
      await run('export.mp4', { outputPath: target }, { confirmed: true });
    } catch (e) {
      setCmdError(toIpcError(e));
    }
  }

  return (
    <section className="screen export" data-testid="export">
      <h1>{t('export.title')}</h1>
      <dl className="facts">
        <dt>{t('export.output')}</dt>
        <dd data-testid="export-path">{path}</dd>
        <dt>{t('facts.frames')}</dt>
        <dd>{formatNumber(project.timeline.clips.reduce((n, c) => n + (c.outFrame - c.inFrame), 0))}</dd>
      </dl>
      <div className="actions">
        <button type="button" data-testid="export-choose" disabled={running} onClick={() => void choose()}>
          {t('export.choose')}
        </button>
        <button type="button" className="primary" data-testid="export-start" disabled={running} onClick={() => void start()}>
          {t('export.start')}
        </button>
        {running && (
          <button type="button" data-testid="export-cancel" onClick={cancelExport}>
            {t('export.cancel')}
          </button>
        )}
      </div>
      {cmdError && (
        <p className="error" role="alert" data-testid="export-error" data-code={cmdError.code}>
          {errorText(cmdError)}
        </p>
      )}
      {status.phase === 'running' && (
        <div className="export-progress" data-testid="export-progress">
          <progress max={status.total} value={status.done} />
          <span>
            {t('export.progress', { done: formatNumber(status.done), total: formatNumber(status.total) })}
            {status.encoder && ` · ${encoderLabel(status.encoder)}`}
          </span>
        </div>
      )}
      {status.phase === 'cancelled' && (
        <p className="hint" data-testid="export-cancelled">
          {t('export.cancelled')}
        </p>
      )}
      {status.phase === 'failed' && (
        <p className="error" role="alert" data-testid="export-error" data-code={status.error.code}>
          {errorText(status.error)}
        </p>
      )}
      {status.phase === 'done' && <Verdict result={status.result} />}
    </section>
  );
}

function encoderLabel(kind: string): string {
  if (kind === 'hardware') return t('export.encoder.hardware');
  if (kind === 'software') return t('export.encoder.software');
  return `FFmpeg ${kind.slice('ffmpeg:'.length)}`;
}

function Verdict({ result }: { result: NonNullable<Extract<ReturnType<typeof useExport>, { phase: 'done' }>>['result'] }) {
  const { parityCheck: parity } = result;
  const failed = parity.status === 'failed';
  return (
    <div className={`verdict ${failed ? 'bad' : 'good'}`} data-testid="export-verdict" data-status={parity.status} role="status">
      <p className="verdict-title">{failed ? t('export.parityFailed') : t('export.done')}</p>
      <dl className="facts">
        <dt>{t('export.output')}</dt>
        <dd>{result.path}</dd>
        <dt>{t('export.frames')}</dt>
        <dd>
          {formatNumber(parity.frames.actual)} / {formatNumber(parity.frames.expected)}
        </dd>
        <dt>{t('export.duration')}</dt>
        <dd>{formatDurationUs(result.durationUs)}</dd>
        <dt>PSNR / SSIM</dt>
        <dd>
          {formatNumber(Math.round(parity.psnrMedian * 100) / 100)} dB / {formatNumber(Math.round(parity.ssimMedian * 1000) / 1000)}
        </dd>
        <dt>{t('export.encoder')}</dt>
        <dd>{encoderLabel(result.encoder)}</dd>
        <dt>{t('export.size')}</dt>
        <dd>{formatNumber(Math.round(result.bytes / 1024))} KB</dd>
      </dl>
      {failed && (
        <ul className="hint" data-testid="export-failures">
          {parity.failures.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
