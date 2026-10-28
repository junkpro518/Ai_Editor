import { useEffect, useState } from 'react';
import { Nav } from './components/Nav';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Import } from './screens/Import';
import { Timeline } from './screens/Timeline';
import { Export } from './screens/Export';
import { answerConfirm, init, useRuntime } from './commands/runtime';
import { t, useLang } from './i18n';

export function App() {
  useLang(); // إعادة الرسم عند تبديل اللغة
  const { ready, screen, project, pendingConfirm } = useRuntime();
  const [initError, setInitError] = useState<string | null>(null);
  useEffect(() => {
    init().catch((e: unknown) =>
      setInitError(e instanceof Error ? e.message : String((e as { message?: string }).message ?? e)),
    );
  }, []);

  return (
    <>
      <Nav current={screen} hasProject={project !== null} />
      <main>
        {initError && (
          <p className="error" role="alert">
            {t('error.generic')} {initError}
          </p>
        )}
        {ready && screen === 'import' && <Import />}
        {ready && screen === 'timeline' && <Timeline />}
        {ready && screen === 'export' && <Export />}
      </main>
      {pendingConfirm && <ConfirmDialog command={pendingConfirm.name} onAnswer={answerConfirm} />}
    </>
  );
}
