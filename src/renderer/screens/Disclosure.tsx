import { formatDurationUs, formatNumber, t } from '../i18n';
import { PROVIDERS } from '../transcript/run';
import type { DisclosureInfo } from '../transcript/run';

// الإفصاح قبل أول تفريغ لكل {مزود، مفتاح} (FR-017، Q2): ما يُرسَل، إلى من، بأي مفتاح. يُعرض كنافذة فوق الشاشة الحالية.

/** حجم الصوت المرسَل تقديراً: Opus 32 kbps أحادي (audio.ts) */
export function estimateUploadMb(durationUs: number): number {
  return Math.round(((durationUs / 1e6) * 4000) / 1024 / 1024 * 100) / 100;
}

export function Disclosure({ info, onAccept, onCancel }: { info: DisclosureInfo; onAccept: () => void; onCancel: () => void }) {
  const p = PROVIDERS[info.provider];
  return (
    <div className="dialog-backdrop" role="presentation">
      <div className="dialog disclosure" role="dialog" aria-modal="true" aria-labelledby="disclosure-title" data-testid="disclosure">
        <h2 id="disclosure-title">{t('disclosure.title')}</h2>
        <dl className="facts">
          <dt>{t('disclosure.what')}</dt>
          <dd data-testid="disclosure-what">
            {t('disclosure.whatValue', { size: formatNumber(estimateUploadMb(info.durationUs)), duration: formatDurationUs(info.durationUs) })}
          </dd>
          <dt>{t('disclosure.to')}</dt>
          <dd data-testid="disclosure-to">{t('disclosure.toValue', { provider: p.label, host: p.host })}</dd>
          <dt>{t('disclosure.key')}</dt>
          <dd data-testid="disclosure-key">
            {info.keyRef} · {info.model}
          </dd>
        </dl>
        {info.provider === 'deepgram' && <p className="hint">{t('disclosure.mip')}</p>}
        <div className="dialog-actions">
          <button type="button" className="primary" data-testid="disclosure-accept" onClick={onAccept} autoFocus>
            {t('disclosure.accept')}
          </button>
          <button type="button" data-testid="disclosure-cancel" onClick={onCancel}>
            {t('disclosure.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
