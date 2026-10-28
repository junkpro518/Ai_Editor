import { useEffect, useState } from 'react';
import type { ProjectDocument } from '../../core/contracts/types';
import { DEFAULT_LOW_CONFIDENCE_THRESHOLD } from '../../core/captions/types';
import { normalizeArabic } from '../../core/transcript/normalize';
import { getState, run, toIpcError, useRuntime } from '../commands/runtime';
import { formatNumber, t } from '../i18n';
import '../captions/testHooks';
import './words.css';

// مراجعة الكلمات (T064، FR-013، القرار 21): قائمة الكلمات تحت عتبة المزود (settings.providerProfiles[«مزود/نموذج»]،
// وإلا الافتراضي)، كل صف بسياقه ±3 كلمات وحقل كتابة (لا بدائل من المزود في 001 — المخطط لا يحملها)، تصحيح يدوي فقط
// عبر transcript.fixWord، عدّاد التصحيحات و«تراجع» لكل تصحيح، وبحث عن أي كلمة. لا تصحيح تلقائي في أي مكان.

type Word = NonNullable<ProjectDocument['transcript']>['words'][number];
type Status = { text: string; warn: boolean } | null;

/** مصحَّحة = لها أصل ونصها الحالي يخالفه (التصحيح إلى الأصل يُسقطها من العدّ) */
const isCorrected = (w: Word): boolean => w.original !== undefined && w.text !== w.original;
const CONTEXT = 3;
const MAX_RESULTS = 50;

export function WordReview() {
  const { project } = useRuntime();
  const [threshold, setThreshold] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>(null);
  const transcript = project?.transcript ?? null;
  const profileKey = transcript ? `${transcript.provider}/${transcript.model}` : null;

  useEffect(() => {
    if (!profileKey) return;
    let cancelled = false;
    window.api.settings
      .load()
      .then((s) => {
        if (!cancelled) setThreshold(s.providerProfiles[profileKey]?.lowConfidenceThreshold ?? DEFAULT_LOW_CONFIDENCE_THRESHOLD);
      })
      .catch(() => {
        if (!cancelled) setThreshold(DEFAULT_LOW_CONFIDENCE_THRESHOLD);
      });
    return () => {
      cancelled = true;
    };
  }, [profileKey]);

  if (!project) return <section className="screen">{t('timeline.empty')}</section>;
  if (!transcript) {
    return (
      <section className="screen words" data-testid="words">
        <h1>{t('words.title')}</h1>
        <p className="hint" data-testid="words-no-transcript">
          {t('words.noTranscript')}
        </p>
      </section>
    );
  }

  const words = transcript.words;
  const noConfidence = words.some((w) => w.confidence === null);
  const low = threshold === null ? [] : words.filter((w) => w.confidence !== null && w.confidence < threshold);
  const corrected = words.filter(isCorrected);
  const q = normalizeArabic(query);
  const found = q ? words.filter((w) => normalizeArabic(w.text).includes(q) || (w.original !== undefined && normalizeArabic(w.original).includes(q))).slice(0, MAX_RESULTS) : [];

  const exec = async (fn: () => ReturnType<typeof run>): Promise<void> => {
    try {
      const r = await fn();
      if (r) setStatus({ text: r.description, warn: false });
    } catch (e) {
      setStatus({ text: toIpcError(e).message, warn: true });
    }
  };
  const fix = (w: Word, text: string): Promise<void> => exec(() => run('transcript.fixWord', { wordId: w.id, text }));
  /**
   * «تراجع» عن تصحيح كلمة: history.undo فقط عندما يكون آخر مدخل في السجل هو تصحيح هذه الكلمة (فيزول التصحيح من السجل
   * كأنه لم يكن)؛ وإلا — تعديلات أخرى جاءت بعده ولا نتراجع عنها — نعيد النص الأصلي عبر transcript.fixWord نفسه،
   * فيظهر مدخل جديد في السجل وتصحيح word_fix جديد (تصحيح إلى الأصل)، والعدّاد يسقط لأن النص عاد يطابق الأصل.
   */
  const revert = (w: Word): Promise<void> => {
    const last = getState().history.entries().at(-1);
    const params = last?.command.params as { wordId?: string } | undefined;
    if (last?.command.name === 'transcript.fixWord' && params?.wordId === w.id) return exec(() => run('history.undo', {}));
    return exec(() => run('transcript.fixWord', { wordId: w.id, text: w.original ?? w.text }));
  };
  const row = (w: Word) => <WordRow key={w.id} word={w} words={words} onFix={fix} onRevert={revert} />;

  return (
    <section className="screen words" data-testid="words">
      <h1>{t('words.title')}</h1>
      <p className="hint">{t('words.noAuto')}</p>

      <div className="actions">
        <span className="counter" data-testid="words-corrected-count" data-n={corrected.length}>
          {t('words.corrected', { n: formatNumber(corrected.length) })}
        </span>
        {threshold !== null && (
          <span className="hint" data-testid="words-threshold">
            {t('words.threshold', { t: formatNumber(threshold), profile: profileKey ?? '' })}
          </span>
        )}
      </div>

      {noConfidence && (
        <p className="notice" role="note" data-testid="words-no-confidence">
          {t('words.noConfidence')}
        </p>
      )}

      <h2>{t('words.lowConfidence', { n: formatNumber(low.length) })}</h2>
      {threshold !== null && low.length === 0 && (
        <p className="hint" data-testid="words-none-low">
          {noConfidence ? t('words.noneLowNoConfidence') : t('words.noneLow')}
        </p>
      )}
      {low.length > 0 && <table className="items" data-testid="low-words">{<tbody>{low.map(row)}</tbody>}</table>}

      <h2>{t('words.search')}</h2>
      <input
        type="search"
        className="search"
        data-testid="words-search"
        placeholder={t('words.searchPlaceholder')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {q && found.length === 0 && (
        <p className="hint" data-testid="words-search-empty">
          {t('words.searchEmpty')}
        </p>
      )}
      {found.length > 0 && <table className="items" data-testid="search-words">{<tbody>{found.map(row)}</tbody>}</table>}

      {corrected.length > 0 && (
        <>
          <h2>{t('words.corrections')}</h2>
          <table className="items" data-testid="corrected-words">
            <tbody>{corrected.map(row)}</tbody>
          </table>
        </>
      )}

      <p className={`status${status?.warn ? ' warn' : ''}`} data-testid="words-status" role="status">
        {status?.text ?? ''}
      </p>
    </section>
  );
}

function WordRow({ word, words, onFix, onRevert }: { word: Word; words: ReadonlyArray<Word>; onFix: (w: Word, text: string) => Promise<void>; onRevert: (w: Word) => Promise<void> }) {
  const [draft, setDraft] = useState(word.text);
  // نص الكلمة قد يتغيّر من خارج الصف (تصحيح أو تراجع): الحقل يتبعه
  useEffect(() => setDraft(word.text), [word.text]);
  const i = words.indexOf(word);
  const before = words.slice(Math.max(0, i - CONTEXT), i).map((w) => w.text).join(' ');
  const after = words.slice(i + 1, i + 1 + CONTEXT).map((w) => w.text).join(' ');
  const text = draft.trim();
  const canFix = text.length > 0 && !/\s/u.test(text) && text !== word.text;
  const corrected = isCorrected(word);
  const submit = (): void => {
    if (canFix) void onFix(word, text);
  };
  return (
    <tr data-testid="word-row" data-word-id={word.id} data-corrected={corrected ? 'true' : undefined}>
      <td className="context">
        <span className="muted">{before}</span> <mark data-testid="word-text">{word.text}</mark> <span className="muted">{after}</span>
      </td>
      <td className="confidence" data-testid="word-confidence">
        {word.confidence === null ? '—' : formatNumber(Math.round(word.confidence * 100) / 100)}
      </td>
      <td className="edit">
        <input
          type="text"
          data-testid="word-input"
          aria-label={t('words.fix')}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
        />
        <button type="button" data-testid="word-fix" disabled={!canFix} onClick={submit}>
          {t('words.fix')}
        </button>
        <span className="hint">{t('words.noAlternatives')}</span>
      </td>
      <td className="revert">
        {corrected && (
          <>
            <span className="hint" data-testid="word-original">
              {t('words.original', { text: word.original ?? '' })}
            </span>
            <button type="button" data-testid="word-revert" onClick={() => void onRevert(word)}>
              {t('words.revert')}
            </button>
          </>
        )}
      </td>
    </tr>
  );
}
