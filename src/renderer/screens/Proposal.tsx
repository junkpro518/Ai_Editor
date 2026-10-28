import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProjectDocument, Proposal as ProposalDoc, Reason } from '../../core/contracts/types';
import type { Rational } from '../../core/time';
import { usToFrame } from '../../core/time';
import { playableRanges } from '../../core/proposal/listen';
import type { FrameRange } from '../../core/proposal/listen';
import { navigate, run, toIpcError, useRuntime } from '../commands/runtime';
import { formatNumber, t } from '../i18n';
import { mountPreview } from '../player';
import type { Player } from '../player';
import { RUNNING_STATES, requestTranscript, useTranscriptUi } from '../transcript/run';
import { transcriptErrorText } from '../components/TranscriptStatus';
import { timecode } from './Timeline';

// شاشة المقترح (T048، FR-003..FR-006، القرار 22): قائمة البنود مع الزمن والنص والسبب، استثناء فوري بالنقر،
// وضعا الاستماع (تشغيل المشروع مع تخطّي المقترح + تشغيل البند وحده)، الموافقة بتأكيد ← proposal.apply،
// والإلغاء ← proposal.discard. لا قصّ يُطبَّق قبل الموافقة (FR-005).

type Item = ProposalDoc['items'][number];
type ReasonKey = `reason.${Reason}`;
const REASONS: readonly Reason[] = ['silence', 'repeat', 'abandoned', 'filler'];

/** آخر مقترح ما زال قابلاً للمراجعة */
export function openProposal(project: ProjectDocument): ProposalDoc | null {
  return project.proposals.findLast((p) => p.state === 'draft' || p.state === 'reviewed') ?? null;
}

const seconds = (us: number): string => t('proposal.seconds', { s: formatNumber(Math.round(us / 1e5) / 10) });

export function Proposal() {
  const { project, style } = useRuntime();
  const { live } = useTranscriptUi();
  const [status, setStatus] = useState<{ text: string; warn: boolean } | null>(null);
  const [playing, setPlaying] = useState<'skip' | string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<Player | null>(null);
  const playingRef = useRef(false);
  const projectId = project?.id ?? null;

  const stop = useCallback((): void => {
    playingRef.current = false;
    setPlaying(null);
    playerRef.current?.pause();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!projectId || !canvas) return;
    let cancelled = false;
    mountPreview(canvas, projectId)
      .then((p) => {
        if (!cancelled) playerRef.current = p;
      })
      .catch((e: unknown) => {
        if (!cancelled) setStatus({ text: `${t('timeline.previewError')} ${e instanceof Error ? e.message : String(e)}`, warn: true });
      });
    return () => {
      cancelled = true;
      stop();
    };
  }, [projectId, stop]);

  /** تشغيل سلسلة مديات بإطارات المصدر فوق المشغّل (نمط Timeline.play: إيقاف ← عرض بداية التالي ← تشغيل). */
  const playRanges = useCallback(
    (ranges: FrameRange[], label: 'skip' | string, lastFrame: number): void => {
      const player = playerRef.current;
      const first = ranges[0];
      if (!player || !first) return;
      playingRef.current = true;
      setPlaying(label);
      let seg = 0;
      const tick = (): void => {
        if (!playingRef.current) return;
        const r = ranges[seg];
        if (!r) return stop();
        const cur = player.currentFrame();
        if (cur < r.outFrame - 1 && cur < lastFrame) {
          requestAnimationFrame(tick);
          return;
        }
        const next = ranges[seg + 1];
        if (!next) return stop();
        seg += 1;
        player.pause();
        void player
          .show(next.inFrame)
          .then(() => {
            if (!playingRef.current) return;
            player.play();
            requestAnimationFrame(tick);
          })
          .catch(() => stop());
      };
      void player
        .show(first.inFrame)
        .then(() => {
          if (!playingRef.current) return;
          player.play();
          requestAnimationFrame(tick);
        })
        .catch(() => stop());
    },
    [stop],
  );

  if (!project || !style) return <section className="screen">{t('timeline.empty')}</section>;

  const fps: Rational = project.source.fps;
  const lastFrame = project.source.frameCount - 1;
  const proposal = openProposal(project);
  const hasAudio = project.source.hasAudio;
  const running = live?.projectId === project.id || RUNNING_STATES.has(project.transcriptJob.state);
  const hasTranscript = project.transcript !== null;
  const disabledReason = !hasAudio ? t('transcript.noAudio') : running ? t('proposal.running') : !hasTranscript ? t('proposal.noTranscript') : null;

  const exec = async (fn: () => ReturnType<typeof run>): Promise<Awaited<ReturnType<typeof run>>> => {
    stop();
    try {
      const r = await fn();
      if (r) setStatus({ text: r.description, warn: false });
      return r;
    } catch (e) {
      const err = toIpcError(e);
      setStatus({ text: err.code === 'no_transcript' ? t('proposal.noTranscript') : err.message, warn: true });
      return null;
    }
  };

  const transcribe = async (): Promise<void> => {
    setStatus(null);
    const r = await requestTranscript();
    if (!r.ok) setStatus({ text: transcriptErrorText(r.code, r.message), warn: true });
  };

  const exclude = (item: Item): void => {
    if (!proposal) return;
    void exec(() => run('proposal.exclude', { proposalId: proposal.id, itemIds: [item.id] }));
  };

  const apply = async (): Promise<void> => {
    if (!proposal) return;
    const r = await exec(() => run('proposal.apply', { proposalId: proposal.id }));
    if (r) navigate('timeline');
  };

  const playSkipping = (): void => {
    if (!proposal) return;
    playRanges(playableRanges(project.timeline.clips, proposal.items, fps), 'skip', lastFrame);
  };

  const playItem = (item: Item): void => {
    const inFrame = usToFrame(item.startUs, fps);
    playRanges([{ inFrame, outFrame: Math.max(inFrame + 1, usToFrame(item.endUs, fps)) }], item.id, lastFrame);
  };

  const range = (item: Item): string => `${timecode(usToFrame(item.startUs, fps), fps)}–${timecode(usToFrame(item.endUs, fps), fps)}`;

  return (
    <section className="screen proposal" data-testid="proposal-screen">
      <h1>{t('proposal.title')}</h1>

      <div className="actions">
        {hasAudio && !hasTranscript && !running && (
          <button type="button" className="primary" data-testid="transcript-start" onClick={() => void transcribe()}>
            {t('transcript.start')}
          </button>
        )}
        <button type="button" className="primary" data-testid="proposal-request" disabled={disabledReason !== null} title={disabledReason ?? undefined} onClick={() => void exec(() => run('proposal.request', {}))}>
          {t('proposal.request')}
        </button>
        {disabledReason && (
          <span className="hint" data-testid="proposal-disabled-reason">
            {disabledReason}
          </span>
        )}
      </div>

      <div className="preview-root">
        <canvas ref={canvasRef} id="preview-canvas" width={640} height={360} />
      </div>

      {proposal ? (
        <ProposalList
          proposal={proposal}
          playing={playing}
          noSpeech={(project.transcript?.words.length ?? 0) === 0}
          range={range}
          onExclude={exclude}
          onPlayItem={playItem}
          onPlaySkipping={playSkipping}
          onStop={stop}
          onApply={() => void apply()}
          onDiscard={() => void exec(() => run('proposal.discard', { proposalId: proposal.id }))}
        />
      ) : (
        hasTranscript && <p className="hint" data-testid="proposal-none">{t('proposal.none')}</p>
      )}

      <p className={`status${status?.warn ? ' warn' : ''}`} data-testid="proposal-status" role="status">
        {status?.text ?? ''}
      </p>
    </section>
  );
}

function ProposalList({
  proposal,
  playing,
  noSpeech,
  range,
  onExclude,
  onPlayItem,
  onPlaySkipping,
  onStop,
  onApply,
  onDiscard,
}: {
  proposal: ProposalDoc;
  playing: string | null;
  noSpeech: boolean;
  range: (item: Item) => string;
  onExclude: (item: Item) => void;
  onPlayItem: (item: Item) => void;
  onPlaySkipping: () => void;
  onStop: () => void;
  onApply: () => void;
  onDiscard: () => void;
}) {
  const items = proposal.items;
  return (
    <div className="proposal-list" data-testid="proposal" data-proposal-id={proposal.id} data-state={proposal.state}>
      {items.length === 0 ? (
        <p className="hint" data-testid="proposal-empty">
          {noSpeech ? t('proposal.noSpeech') : t('proposal.nothingToCut')}
        </p>
      ) : (
        <>
          <div className="actions">
            {playing === 'skip' ? (
              <button type="button" data-testid="proposal-stop" onClick={onStop}>
                {t('proposal.stop')}
              </button>
            ) : (
              <button type="button" data-testid="proposal-play-skipping" onClick={onPlaySkipping}>
                ▶ {t('proposal.playSkipping')}
              </button>
            )}
            <span className="hint">{t('proposal.items', { n: formatNumber(items.length) })}</span>
          </div>
          <table className="items">
            <thead>
              <tr>
                <th>{t('proposal.listen')}</th>
                <th>{t('proposal.time')}</th>
                <th>{t('proposal.text')}</th>
                <th>{t('proposal.reason')}</th>
                <th>{t('proposal.exclude')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} data-testid="proposal-item" data-item-id={item.id} data-reason={item.reason} data-state={item.state}>
                  <td>
                    <button type="button" data-testid="item-play" title={t('proposal.listen')} onClick={() => (playing === item.id ? onStop() : onPlayItem(item))}>
                      {playing === item.id ? '■' : '▶'}
                    </button>
                  </td>
                  <td className="time">{range(item)}</td>
                  <td className="text">{item.text || <span className="muted">{t('proposal.silence')}</span>}</td>
                  <td>
                    <span className={`badge ${item.reason}`}>{t(`reason.${item.reason}` as ReasonKey)}</span>
                    {item.state === 'blocked' && (
                      <span className="badge blocked" data-testid="item-blocked">
                        {t('proposal.blocked', { rule: item.blockedBy ?? '' })}
                      </span>
                    )}
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      data-testid="item-exclude"
                      aria-label={t('proposal.exclude')}
                      checked={item.state === 'excluded'}
                      disabled={item.state !== 'proposed'}
                      onChange={() => onExclude(item)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="facts totals" data-testid="proposal-totals">
            {REASONS.map((r) => (
              <Total key={r} reason={r} n={proposal.totals.byReason[r] ?? 0} />
            ))}
            <dt>{t('proposal.saved')}</dt>
            <dd data-testid="saved-us" data-us={proposal.totals.savedUs}>
              {seconds(proposal.totals.savedUs)}
            </dd>
          </dl>
          <div className="actions">
            <button type="button" className="primary" data-testid="proposal-apply" onClick={onApply}>
              {t('proposal.apply')}
            </button>
            <button type="button" data-testid="proposal-discard" onClick={onDiscard}>
              {t('proposal.discard')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Total({ reason, n }: { reason: Reason; n: number }) {
  return (
    <>
      <dt>{t(`reason.${reason}` as ReasonKey)}</dt>
      <dd data-reason={reason}>{formatNumber(n)}</dd>
    </>
  );
}
