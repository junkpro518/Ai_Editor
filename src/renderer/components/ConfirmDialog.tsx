import { t } from '../i18n';
import type { CommandName } from '../../core/contracts/types';

export function ConfirmDialog({
  command,
  onAnswer,
}: {
  command: CommandName;
  onAnswer: (confirmed: boolean) => void;
}) {
  const label = t(`command.${command}`);
  return (
    <div className="dialog-backdrop" role="presentation">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 id="confirm-title">{t('confirm.title')}</h2>
        <p>{t('confirm.body', { label })}</p>
        <div className="dialog-actions">
          <button type="button" className="primary" onClick={() => onAnswer(true)} autoFocus>
            {t('confirm.ok')}
          </button>
          <button type="button" onClick={() => onAnswer(false)}>
            {t('confirm.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
