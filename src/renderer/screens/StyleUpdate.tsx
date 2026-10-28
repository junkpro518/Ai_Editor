import { useState } from 'react';
import type { ProjectDocument, Reason, StyleUpdateProposal } from '../../core/contracts/types';
import { run, toIpcError, useRuntime } from '../commands/runtime';
import { formatDate, formatNumber, t } from '../i18n';
import { fieldDef, fieldLabel, formatValue } from '../style/fields';
import './style.css';

// اقتراح تحديث النمط (T076، FR-011، SC-007): الفرق بالوحدات البشرية، التصحيحات المقتبسة التي بُني عليها (بعددها)،
// السوابق الجديدة (قاعدة + سؤال فحص)، زرّا «اقبل» (تأكيد → style.updateProposal.accept) و«ارفض» (reject).
// لا يتغير النمط إلا بالقبول؛ الاقتراحات المحسومة تبقى معروضة مختصرة.

type Status = { text: string; warn: boolean } | null;
type StateKey = `styleUpdate.state.${StyleUpdateProposal['state']}`;

export function pendingStyleUpdates(project: ProjectDocument | null): StyleUpdateProposal[] {
  return project?.styleUpdateProposals.filter((p) => p.state === 'pending') ?? [];
}

export function StyleUpdate() {
  const { project, style } = useRuntime();
  const [status, setStatus] = useState<Status>(null);
  if (!project || !style) return <section className="screen">{t('timeline.empty')}</section>;

  const exec = async (fn: () => ReturnType<typeof run>): Promise<void> => {
    try {
      const r = await fn();
      if (r) setStatus({ text: r.description, warn: false });
    } catch (e) {
      setStatus({ text: toIpcError(e).message, warn: true });
    }
  };
  const pending = pendingStyleUpdates(project);
  const decided = project.styleUpdateProposals.filter((p) => p.state !== 'pending').reverse();
  const threshold = style.cut.repeatedRejectionThreshold.value;

  return (
    <section className="screen style-update" data-testid="style-update-screen">
      <h1>{t('styleUpdate.title')}</h1>
      <p className="hint">{t('styleUpdate.noChange')}</p>
      {pending.length === 0 && (
        <p className="hint" data-testid="style-update-none">
          {t('styleUpdate.none', { n: formatNumber(typeof threshold === 'number' ? threshold : 3) })}
        </p>
      )}
      {pending.map((p) => (
        <Card
          key={p.id}
          proposal={p}
          project={project}
          onAccept={() => void exec(() => run('style.updateProposal.accept', { proposalId: p.id }))}
          onReject={() => void exec(() => run('style.updateProposal.reject', { proposalId: p.id }))}
        />
      ))}
      {decided.length > 0 && (
        <>
          <h2>{t('styleUpdate.past')}</h2>
          {decided.map((p) => (
            <article key={p.id} data-testid="style-update-past" data-id={p.id} data-state={p.state}>
              <span className="badge">{t(`styleUpdate.state.${p.state}` as StateKey)}</span> {trigger(p)}
              {p.decidedAt && <span className="hint"> · {formatDate(p.decidedAt)}</span>}
              {p.state === 'superseded' && (
                <p className="hint" data-testid="style-update-superseded">
                  {t('styleUpdate.superseded')}
                </p>
              )}
            </article>
          ))}
        </>
      )}
      <p className={`status${status?.warn ? ' warn' : ''}`} data-testid="style-update-status" role="status">
        {status?.text ?? ''}
      </p>
    </section>
  );
}

function trigger(p: StyleUpdateProposal): string {
  const reason = p.trigger.reason ? t(`reason.${p.trigger.reason as Reason}`) : '';
  return t('styleUpdate.trigger', { n: formatNumber(p.trigger.count ?? p.trigger.correctionIds.length), reason });
}

function Card({ proposal: p, project, onAccept, onReject }: { proposal: StyleUpdateProposal; project: ProjectDocument; onAccept: () => void; onReject: () => void }) {
  // الاقتباسات من التصحيحات نفسها (المصدر)؛ السوابق تحمل نسخة منها احتياطاً
  const precedents = p.newPrecedents;
  const quotes = p.trigger.correctionIds.map((id) => project.corrections.find((c) => c.id === id)?.quote ?? precedents.find((x) => x.source.ref === id)?.quote ?? '');
  return (
    <article data-testid="style-update" data-id={p.id} data-state={p.state} data-reason={p.trigger.reason}>
      <p>{trigger(p)}</p>

      <h2>{t('styleUpdate.diff')}</h2>
      {p.diff.length === 0 ? (
        <p className="hint" data-testid="style-update-no-diff">
          {t('styleUpdate.noDiff')}
        </p>
      ) : (
        <table className="diff" data-testid="style-update-diff-table">
          <tbody>
            {p.diff.map((d) => {
              const def = fieldDef(d.path);
              return (
                <tr key={d.path} data-testid="style-update-diff" data-path={d.path}>
                  <th>{fieldLabel(d.path)}</th>
                  <td className="from" data-testid="diff-from">
                    {formatValue(def, d.from)}
                  </td>
                  <td>→</td>
                  <td className="to" data-testid="diff-to">
                    {formatValue(def, d.to)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <h2>{t('styleUpdate.quotes', { n: formatNumber(quotes.length) })}</h2>
      <ul data-testid="style-update-quotes">
        {quotes.map((q, i) => (
          <li key={p.trigger.correctionIds[i] ?? i} data-testid="style-update-quote">
            «{q}»
          </li>
        ))}
      </ul>

      <h2>{t('styleUpdate.precedents')}</h2>
      <ul data-testid="style-update-precedents">
        {precedents.map((x) => (
          <li key={x.id} data-testid="style-update-precedent" data-rule-id={x.ruleId}>
            {x.rule}
            <span className="check">
              {t('styleUpdate.check')} {x.check}
            </span>
          </li>
        ))}
      </ul>

      <div className="actions">
        <button type="button" className="primary" data-testid="style-update-accept" onClick={onAccept}>
          {t('styleUpdate.accept')}
        </button>
        <button type="button" data-testid="style-update-reject" onClick={onReject}>
          {t('styleUpdate.reject')}
        </button>
      </div>
    </article>
  );
}
