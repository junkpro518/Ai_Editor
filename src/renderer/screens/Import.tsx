import { useState } from 'react';
import type { DragEvent } from 'react';
import { formatDate, formatNumber, formatDurationUs, t } from '../i18n';
import { importFile, importPath, loadProject, useRuntime } from '../commands/runtime';
import type { ProbeLike } from '../../core/commands/types';

type ErrorKey =
  | 'error.too_long'
  | 'error.too_large'
  | 'error.resolution_too_high'
  | 'error.no_video_stream'
  | 'error.unsupported_format'
  | 'error.ffmpeg_missing'
  | 'error.path_not_allowed'
  | 'error.project_unreadable';
const KNOWN: ReadonlySet<string> = new Set([
  'too_long',
  'too_large',
  'resolution_too_high',
  'no_video_stream',
  'unsupported_format',
  'ffmpeg_missing',
  'path_not_allowed',
  'project_unreadable',
]);

export function errorText(code: string): string {
  return KNOWN.has(code) ? t(`error.${code}` as ErrorKey) : t('error.generic');
}

export function ProbeFacts({ probe }: { probe: ProbeLike }) {
  const fps = probe.fps.num / probe.fps.den;
  return (
    <dl className="facts" data-testid="probe-facts">
      <dt>{t('facts.name')}</dt>
      <dd>{probe.fileName}</dd>
      <dt>{t('facts.duration')}</dt>
      <dd>{formatDurationUs(probe.durationUs)}</dd>
      <dt>{t('facts.fps')}</dt>
      <dd>
        {probe.fps.num}/{probe.fps.den} ({formatNumber(fps)})
      </dd>
      <dt>{t('facts.frames')}</dt>
      <dd data-testid="probe-frames">{formatNumber(probe.frameCount)}</dd>
      <dt>{t('facts.resolution')}</dt>
      <dd>
        {probe.width}×{probe.height}
        {probe.rotation ? ` · ${t('facts.rotation')} ${probe.rotation}°` : ''}
      </dd>
      <dt>{t('facts.audio')}</dt>
      <dd>{probe.hasAudio ? t('yes') : t('no')}</dd>
      {probe.sourceIsVfr && (
        <>
          <dt>VFR</dt>
          <dd>{t('facts.vfr')}</dd>
        </>
      )}
    </dl>
  );
}

export function Import() {
  const { projects, lastProbe, importError: error } = useRuntime();
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);

  async function finish(p: ReturnType<typeof importPath>): Promise<void> {
    setBusy(true);
    await p;
    setBusy(false);
  }

  async function pick(): Promise<void> {
    const path = await window.api.project.pickVideoFile();
    if (path) await finish(importPath(path));
  }

  function drop(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void finish(importFile(file));
  }

  return (
    <section className="screen import">
      <div
        className={`dropzone${over ? ' over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
      >
        <p>{t('import.drop')}</p>
        <button
          type="button"
          className="primary"
          data-testid="pick-file"
          disabled={busy}
          onClick={() => void pick()}
        >
          {busy ? t('import.busy') : t('import.pick')}
        </button>
        <p className="hint">{t('import.limits')}</p>
      </div>
      {error && (
        <p className="error" role="alert" data-testid="import-error" data-code={error.code}>
          {errorText(error.code)}
        </p>
      )}
      {lastProbe && !error && <ProbeFacts probe={lastProbe} />}
      {/* هدف معاينة الوكيل F (T028): أول إطار يُرسم هنا بعد الاستيراد */}
      <div id="preview-root" className="preview-root">
        <canvas id="preview-canvas" width={640} height={360} />
      </div>
      {projects.length > 0 && (
        <div className="recent">
          <h2>{t('import.recent')}</h2>
          <ul data-testid="recent-projects">
            {projects.map((p) => (
              <li key={p.id}>
                <span>{p.name}</span>
                <time dateTime={p.updatedAt}>{formatDate(p.updatedAt)}</time>
                <button type="button" onClick={() => void loadProject(p.id)}>
                  {t('import.open')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
