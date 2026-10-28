import { useCallback, useEffect, useState } from 'react';
import { changeLang, toIpcError } from '../commands/runtime';
import { formatDate, formatDurationUs, t, useLang } from '../i18n';
import { PROVIDERS, providerOf } from '../transcript/run';
import type { Provider } from '../transcript/run';

// الإعدادات (T046): المزود والنموذج، إدخال المفتاح → secrets (لا يُعرض بعد الحفظ إلا الاسم وآخر 4 أحرف — القرار 18)،
// حذف المفتاح، سجل الإرسالات (FR-017)، ولغة الواجهة (FR-018).

type Settings = Awaited<ReturnType<Api['settings']['load']>>;
type KeyInfo = Awaited<ReturnType<Api['secrets']['list']>>[number];

export function Settings() {
  const lang = useLang();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [keys, setKeys] = useState<KeyInfo[]>([]);
  const [available, setAvailable] = useState<{ ok: boolean; reason?: string } | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [status, setStatus] = useState<{ text: string; warn: boolean } | null>(null);

  const reload = useCallback(async (): Promise<void> => {
    const [s, k, a] = await Promise.all([window.api.settings.load(), window.api.secrets.list(), window.api.secrets.available()]);
    setSettings(s);
    setKeys(k);
    setAvailable(a);
  }, []);

  useEffect(() => {
    reload().catch((e: unknown) => setStatus({ text: toIpcError(e).message, warn: true }));
  }, [reload]);

  if (!settings) return <section className="screen settings">{t('settings.title')}</section>;
  const provider = providerOf(settings.transcription.provider);

  async function save(patch: Parameters<Api['settings']['save']>[0]): Promise<void> {
    try {
      setSettings(await window.api.settings.save(patch));
      setStatus({ text: t('settings.saved'), warn: false });
    } catch (e) {
      setStatus({ text: toIpcError(e).message, warn: true });
    }
  }

  function changeProvider(next: Provider): void {
    void save({ transcription: { provider: next, model: PROVIDERS[next].defaultModel } });
  }

  async function saveKey(): Promise<void> {
    const value = keyInput.trim();
    if (!value) return;
    try {
      await window.api.secrets.set(provider, value);
      setKeyInput(''); // المفتاح لا يبقى في الواجهة بعد الإرسال
      setStatus({ text: t('settings.keySaved'), warn: false });
      await reload();
    } catch (e) {
      setStatus({ text: toIpcError(e).message, warn: true });
    }
  }

  async function deleteKey(name: string): Promise<void> {
    try {
      await window.api.secrets.delete(name);
      setStatus({ text: t('settings.keyDeleted'), warn: false });
      await reload();
    } catch (e) {
      setStatus({ text: toIpcError(e).message, warn: true });
    }
  }

  return (
    <section className="screen settings" data-testid="settings">
      <h1>{t('settings.title')}</h1>

      <div className="field">
        <label htmlFor="provider">{t('settings.provider')}</label>
        <select id="provider" data-testid="settings-provider" value={provider} onChange={(e) => changeProvider(providerOf(e.target.value))}>
          {(Object.keys(PROVIDERS) as Provider[]).map((p) => (
            <option key={p} value={p}>
              {PROVIDERS[p].label} — {PROVIDERS[p].host}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="model">{t('settings.model')}</label>
        <input
          id="model"
          data-testid="settings-model"
          dir="ltr"
          value={settings.transcription.model}
          onChange={(e) => setSettings({ ...settings, transcription: { ...settings.transcription, model: e.target.value } })}
          onBlur={(e) => void save({ transcription: { model: e.target.value.trim() || PROVIDERS[provider].defaultModel } })}
        />
      </div>

      <div className="field">
        <label htmlFor="api-key">
          {t('settings.key')} ({PROVIDERS[provider].label})
        </label>
        <div className="row">
          <input
            id="api-key"
            data-testid="settings-key"
            type="password"
            dir="ltr"
            autoComplete="off"
            placeholder={t('settings.keyPlaceholder')}
            value={keyInput}
            disabled={available !== null && !available.ok}
            onChange={(e) => setKeyInput(e.target.value)}
          />
          <button type="button" className="primary" data-testid="settings-save-key" disabled={!keyInput.trim() || (available !== null && !available.ok)} onClick={() => void saveKey()}>
            {t('settings.saveKey')}
          </button>
        </div>
        {available && !available.ok && (
          <p className="error" role="alert" data-testid="secrets-unavailable">
            {t('settings.unavailable', { reason: available.reason ?? '' })}
          </p>
        )}
      </div>

      <h2>{t('settings.savedKeys')}</h2>
      {keys.length === 0 ? (
        <p className="hint">{t('settings.noKeys')}</p>
      ) : (
        <ul className="keys" data-testid="settings-keys">
          {keys.map((k) => (
            <li key={k.name} data-key-name={k.name}>
              <span dir="ltr">
                {k.name} (…{k.last4})
              </span>
              <time dateTime={k.createdAt}>{formatDate(k.createdAt)}</time>
              <button type="button" data-testid="settings-delete-key" onClick={() => void deleteKey(k.name)}>
                {t('settings.deleteKey')}
              </button>
            </li>
          ))}
        </ul>
      )}

      <h2>{t('settings.sendLog')}</h2>
      {settings.transcription.sendLog.length === 0 ? (
        <p className="hint">{t('settings.sendLogEmpty')}</p>
      ) : (
        <table className="send-log" data-testid="send-log">
          <thead>
            <tr>
              <th>{t('settings.log.at')}</th>
              <th>{t('settings.log.provider')}</th>
              <th>{t('settings.log.duration')}</th>
            </tr>
          </thead>
          <tbody>
            {settings.transcription.sendLog.map((e, i) => (
              <tr key={`${e.at}-${i}`}>
                <td>{formatDate(e.at)}</td>
                <td dir="ltr">{e.provider}</td>
                <td>{formatDurationUs(e.audioDurationUs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>{t('settings.language')}</h2>
      <button type="button" data-testid="settings-lang" onClick={() => void changeLang(lang === 'ar' ? 'en' : 'ar')}>
        {t('lang.switch')}
      </button>

      <p className={`status${status?.warn ? ' warn' : ''}`} role="status" data-testid="settings-status">
        {status?.text ?? ''}
      </p>
    </section>
  );
}
