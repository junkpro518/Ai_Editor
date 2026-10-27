import { t, useLang } from '../i18n';
import { changeLang, navigate } from '../commands/runtime';
import type { Screen } from '../commands/runtime';

const ITEMS: Array<{
  screen: Screen;
  key:
    | 'nav.import'
    | 'nav.timeline'
    | 'nav.proposal'
    | 'nav.words'
    | 'nav.style'
    | 'nav.history'
    | 'nav.settings'
    | 'nav.export';
  ready: boolean;
}> = [
  { screen: 'import', key: 'nav.import', ready: true },
  { screen: 'timeline', key: 'nav.timeline', ready: true },
  { screen: 'proposal', key: 'nav.proposal', ready: false },
  { screen: 'words', key: 'nav.words', ready: false },
  { screen: 'style', key: 'nav.style', ready: false },
  { screen: 'history', key: 'nav.history', ready: false },
  { screen: 'settings', key: 'nav.settings', ready: false },
  { screen: 'export', key: 'nav.export', ready: false },
];

export function Nav({ current, hasProject }: { current: Screen; hasProject: boolean }) {
  const lang = useLang();
  return (
    <nav className="nav" aria-label={t('app.title')}>
      <span className="brand">{t('app.title')}</span>
      <ul>
        {ITEMS.map((item) => {
          const disabled = !item.ready || (item.screen !== 'import' && !hasProject);
          return (
            <li key={item.screen}>
              <button
                type="button"
                data-screen={item.screen}
                aria-current={current === item.screen ? 'page' : undefined}
                disabled={disabled}
                title={!item.ready ? t('nav.soon') : undefined}
                onClick={() => navigate(item.screen)}
              >
                {t(item.key)}
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        className="lang"
        data-testid="lang-switch"
        onClick={() => void changeLang(lang === 'ar' ? 'en' : 'ar')}
      >
        {t('lang.switch')}
      </button>
    </nav>
  );
}
