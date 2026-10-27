import { formatNumber, t } from '../i18n';
import { useRuntime } from '../commands/runtime';
import { ProbeFacts } from './Import';

/** عنصر نائب (T025/T029): حقائق المشروع وقائمة اللقطات. التحرير الحقيقي في T049. */
export function Timeline() {
  const { project } = useRuntime();
  if (!project) return <section className="screen">{t('timeline.empty')}</section>;
  const { id: _id, ...probe } = project.source;
  return (
    <section className="screen timeline" data-testid="timeline" data-project-id={project.id}>
      <h1>{project.name}</h1>
      <ProbeFacts probe={probe} />
      <h2>
        {t('timeline.clips')}{' '}
        <span data-testid="clip-count">{formatNumber(project.timeline.clips.length)}</span>
      </h2>
      <ol className="clips" data-testid="clips">
        {project.timeline.clips.map((c, i) => (
          <li key={c.id} data-testid="clip" data-frames={c.outFrame - c.inFrame}>
            {t('timeline.clip')} {formatNumber(i + 1)}: {formatNumber(c.inFrame)}–{formatNumber(c.outFrame)} (
            {formatNumber(c.outFrame - c.inFrame)} {t('timeline.frames')})
          </li>
        ))}
      </ol>
      <p className="hint">{t('timeline.placeholder')}</p>
    </section>
  );
}
