import { useEffect, useState } from 'react';
import { Nav } from './components/Nav';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Import } from './screens/Import';
import { Timeline } from './screens/Timeline';
import { Export } from './screens/Export';
import { Proposal } from './screens/Proposal';
import { WordReview } from './screens/WordReview';
import { StylePanel, StyleUpgradeNotice } from './screens/StylePanel';
import { StyleUpdate, pendingStyleUpdates } from './screens/StyleUpdate';
import { Settings } from './screens/Settings';
import { Disclosure } from './screens/Disclosure';
import { TranscriptStatus } from './components/TranscriptStatus';
import { answerConfirm, init, useRuntime } from './commands/runtime';
import { acceptDisclosure, dismissDisclosure, useTranscriptUi } from './transcript/run';
import { t, useLang } from './i18n';

export function App() {
  useLang(); // إعادة الرسم عند تبديل اللغة
  const { ready, screen, project, pendingConfirm } = useRuntime();
  const { pendingDisclosure } = useTranscriptUi();
  const [initError, setInitError] = useState<string | null>(null);
  useEffect(() => {
    init().catch((e: unknown) =>
      setInitError(e instanceof Error ? e.message : String((e as { message?: string }).message ?? e)),
    );
  }, []);

  return (
    <>
      <Nav current={screen} hasProject={project !== null} pendingStyleUpdates={pendingStyleUpdates(project).length} />
      {ready && <TranscriptStatus />}
      {ready && <StyleUpgradeNotice />}
      <main>
        {initError && (
          <p className="error" role="alert">
            {t('error.generic')} {initError}
          </p>
        )}
        {ready && screen === 'import' && <Import />}
        {ready && screen === 'timeline' && <Timeline />}
        {ready && screen === 'proposal' && <Proposal />}
        {ready && screen === 'words' && <WordReview />}
        {ready && screen === 'style' && <StylePanel />}
        {ready && screen === 'styleUpdate' && <StyleUpdate />}
        {ready && screen === 'settings' && <Settings />}
        {ready && screen === 'export' && <Export />}
      </main>
      {pendingConfirm && <ConfirmDialog command={pendingConfirm.name} onAnswer={answerConfirm} />}
      {pendingDisclosure && <Disclosure info={pendingDisclosure} onAccept={() => void acceptDisclosure()} onCancel={dismissDisclosure} />}
    </>
  );
}
