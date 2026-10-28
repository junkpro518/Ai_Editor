import { useEffect, useRef, useState } from 'react';
import type { Rule, StyleVersion } from '../../core/contracts/types';
import type { Clip } from '../../core/timeline/ops';
import { timelineToSource } from '../../core/timeline/ops';
import { onEffect, run, toIpcError, useRuntime } from '../commands/runtime';
import { formatDate, formatNumber, t } from '../i18n';
import { mountPreview } from '../player';
import { FIELDS, FONT_FAMILIES, POSITIONS, fieldLabel } from '../style/fields';
import type { FieldDef } from '../style/fields';
import '../style/testHooks';
import './style.css';

// لوحة النمط (T075، FR-008، FR-010): حقول القص والكابشن بتسمياتها العامية (ريلز 17) ومحرّر بنوع كل حقل، مفتاح
// إلزامي/تفضيل لكل قاعدة، شارة المصدر (افتراضي/أنت/متعلَّم) بتاريخه، الحفظ عند الخروج من الحقل أو Enter → style.setField
// (إصدار جديد في المكتبة والمشروع يُثبَّت عليه)، معاينة كابشن حية، وسجل الإصدارات مع «رجوع» → style.rollback (تأكيد).
// إشعار «إصدار أحدث متاح» في StyleUpgradeNotice (يُعرض في App على كل الشاشات: المستخدم يراه عند فتح المشروع).

type Status = { text: string; warn: boolean } | null;
type VersionRow = { version: number; date: string; reason: string };
type SourceKey = `style.source.${Rule['source']['kind']}`;

// قائمة الإصدارات تُحدَّث بعد كتابة الملف لا قبلها: الأثر يصل بعد api.style.saveVersion (runtime)
const versionListeners = new Set<() => void>();
onEffect('style-version-created', () => versionListeners.forEach((l) => l()));

const toMs = (us: unknown): string => (typeof us === 'number' ? String(us / 1000) : '');
const ROLLBACK_REASON = /^rollback to v(\d+)$/;

/** السبب كما يقرأه المستخدم؛ غير المعروف يُعرض كما هو */
export function reasonLabel(reason: string): string {
  if (reason === 'default' || reason === 'user' || reason === 'learned') return t(`style.reason.${reason}`);
  const m = ROLLBACK_REASON.exec(reason);
  return m ? t('style.reason.rollback', { v: m[1]! }) : reason;
}

export function StylePanel() {
  const { project, style, latestStyleVersion } = useRuntime();
  const [status, setStatus] = useState<Status>(null);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const styleId = project?.style.styleId ?? null;

  useEffect(() => {
    if (!styleId) return;
    let cancelled = false;
    const refresh = (): void => {
      window.api.style
        .listVersions(styleId)
        .then((v) => {
          if (!cancelled) setVersions([...v].sort((a, b) => a.version - b.version));
        })
        .catch((e: unknown) => {
          if (!cancelled) setStatus({ text: toIpcError(e).message, warn: true });
        });
    };
    refresh();
    versionListeners.add(refresh);
    return () => {
      cancelled = true;
      versionListeners.delete(refresh);
    };
  }, [styleId, latestStyleVersion]);

  if (!project || !style) return <section className="screen">{t('timeline.empty')}</section>;

  const exec = async (fn: () => ReturnType<typeof run>): Promise<void> => {
    try {
      const r = await fn();
      if (r) setStatus({ text: r.description, warn: false });
    } catch (e) {
      const err = toIpcError(e);
      setStatus({ text: err.code === 'invalid_style_rule' ? `${t('style.invalid')} — ${err.message}` : err.message, warn: true });
    }
  };
  const setField = (path: string, value: unknown, mode?: Rule['mode']): Promise<void> =>
    exec(() => run('style.setField', { path, value, ...(mode ? { mode } : {}) }));
  const rollback = (toVersion: number): Promise<void> => exec(() => run('style.rollback', { styleId: style.styleId, toVersion }));

  const ruleOf = (def: FieldDef): Rule => (style[def.section] as Record<string, Rule>)[def.field]!;
  const rows = (section: FieldDef['section']) =>
    FIELDS.filter((f) => f.section === section).map((f) => <FieldRow key={f.path} def={f} rule={ruleOf(f)} onSave={setField} />);

  return (
    <section className="screen style-panel" data-testid="style-panel">
      <h1>{t('style.title')}</h1>
      <p className="hint" data-testid="style-pinned" data-version={style.version}>
        {t('style.pinned', { v: formatNumber(style.version), name: style.name ?? style.styleId })}
      </p>

      <h2>{t('style.cut')}</h2>
      <div className="style-fields">{rows('cut')}</div>

      <h2>{t('style.captions')}</h2>
      <CaptionPreview projectId={project.id} clips={project.timeline.clips} cues={project.captions.cues} style={style} />
      <div className="style-fields">{rows('captions')}</div>

      <h2>{t('style.versions')}</h2>
      <table className="items versions" data-testid="style-versions">
        <thead>
          <tr>
            <th>{t('style.version')}</th>
            <th>{t('style.date')}</th>
            <th>{t('style.reason')}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {versions.map((v) => {
            const current = v.version === style.version;
            return (
              <tr key={v.version} data-testid="style-version" data-version={v.version} data-reason={v.reason} data-current={current ? 'true' : undefined}>
                <td className="num">v{formatNumber(v.version)}</td>
                <td>
                  <time dateTime={v.date}>{formatDate(v.date)}</time>
                </td>
                <td>{reasonLabel(v.reason)}</td>
                <td>
                  {current ? (
                    <span className="badge current">{t('style.current')}</span>
                  ) : (
                    <button type="button" data-testid="style-rollback" onClick={() => void rollback(v.version)}>
                      {t('style.rollback')}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className={`status${status?.warn ? ' warn' : ''}`} data-testid="style-status" role="status">
        {status?.text ?? ''}
      </p>
    </section>
  );
}

/** إشعار FR-010/US3-5: إصدار أحدث في المكتبة من المثبّت — لا ترقية تلقائية؛ الزر → project.upgradeStyle (تأكيد). */
export function StyleUpgradeNotice() {
  const { project, latestStyleVersion } = useRuntime();
  const [error, setError] = useState<string | null>(null);
  if (!project || latestStyleVersion === null || latestStyleVersion <= project.style.version) return null;
  const upgrade = async (): Promise<void> => {
    setError(null);
    try {
      await run('project.upgradeStyle', { toVersion: latestStyleVersion });
    } catch (e) {
      setError(toIpcError(e).message);
    }
  };
  return (
    <div className="status-bar warn style-upgrade" role="status" data-testid="style-upgrade-notice" data-latest={latestStyleVersion} data-current={project.style.version}>
      <span>{t('style.upgrade.notice', { v: formatNumber(latestStyleVersion), current: formatNumber(project.style.version) })}</span>
      <button type="button" className="primary" data-testid="style-upgrade" onClick={() => void upgrade()}>
        {t('style.upgrade.button')}
      </button>
      {error && <span className="reason">{error}</span>}
    </div>
  );
}

/** معاينة حية (ريلز 17): إطار أول كابشن بالنمط الحالي؛ تتجدد مع كل تغيير لأن الكابشن يُعاد اشتقاقه والنمط يُقرأ من الجلسة */
function CaptionPreview({ projectId, clips, cues, style }: { projectId: string; clips: ReadonlyArray<Clip>; cues: ReadonlyArray<{ startFrame: number }>; style: StyleVersion }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const timelineFrame = cues[0]?.startFrame ?? 0;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    mountPreview(canvas, projectId)
      .then((p) => {
        if (cancelled) return;
        setError(null);
        const src = timelineToSource(clips, timelineFrame);
        if (src !== null) void p.show(src, timelineFrame).catch(() => undefined);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, clips, timelineFrame, style]);
  return (
    <div className="style-preview" data-testid="style-preview" data-frame={timelineFrame}>
      <canvas ref={canvasRef} id="preview-canvas" width={640} height={360} />
      <span className="hint">{cues.length ? t('style.preview') : t('style.noCues')}</span>
      {error && <span className="hint warn">{error}</span>}
    </div>
  );
}

function FieldRow({ def, rule, onSave }: { def: FieldDef; rule: Rule; onSave: (path: string, value: unknown, mode?: Rule['mode']) => Promise<void> }) {
  const save = (value: unknown): Promise<void> => onSave(def.path, value);
  const sourceKey = `style.source.${rule.source.kind}` as SourceKey;
  return (
    <div className="style-field" data-testid="style-field" data-path={def.path} data-mode={rule.mode}>
      <label className="label" htmlFor={`f-${def.path}`}>
        {fieldLabel(def.path)}
      </label>
      <div className="editor">
        <Editor def={def} value={rule.value} onSave={save} />
      </div>
      <label className="mode">
        <input type="checkbox" data-testid="style-mode" checked={rule.mode === 'mandatory'} onChange={(e) => void onSave(def.path, rule.value, e.target.checked ? 'mandatory' : 'preference')} />
        {t('style.mandatory')}
      </label>
      <span className="source badge" data-testid="style-source" data-kind={rule.source.kind} title={formatDate(rule.source.at)}>
        {t(sourceKey)} · {formatDate(rule.source.at)}
      </span>
    </div>
  );
}

/** حقل نصي/رقمي يحفظ عند blur أو Enter إذا تغيّر؛ القيمة الخارجية تعيد ضبط المسوّدة (تراجع/إصدار آخر) */
function Committed({ id, value, type, step, min, max, dir, onCommit, testId }: { id: string; value: string; type: 'number' | 'text'; step?: number; min?: number; max?: number; dir?: 'ltr'; onCommit: (raw: string) => void; testId?: string }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = (): void => {
    if (draft.trim() !== value) onCommit(draft.trim());
  };
  return (
    <input
      id={id}
      type={type}
      step={step}
      min={min}
      max={max}
      dir={dir}
      data-testid={testId ?? 'style-input'}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

function Editor({ def, value, onSave }: { def: FieldDef; value: unknown; onSave: (value: unknown) => Promise<void> }) {
  const id = `f-${def.path}`;
  const num = (raw: string): number | null => {
    const n = Number(raw);
    return raw === '' || !Number.isFinite(n) ? null : n;
  };
  switch (def.kind) {
    case 'duration':
      return (
        <span className="unit">
          <Committed id={id} type="number" step={50} min={0} value={toMs(value)} onCommit={(raw) => void onSave(num(raw) === null ? raw : Math.round(num(raw)! * 1000))} />
          <span className="hint">{t('style.ms')}</span>
        </span>
      );
    case 'integer':
      return (
        <span className="unit">
          <Committed id={id} type="number" step={1} min={0} value={typeof value === 'number' ? String(value) : ''} onCommit={(raw) => void onSave(num(raw) === null ? raw : Math.round(num(raw)!))} />
          {def.field === 'fontSizePx' && <span className="hint">{t('style.px')}</span>}
        </span>
      );
    case 'ratio':
      return (
        <span className="unit">
          <Committed id={id} type="number" step={1} min={0} max={100} value={typeof value === 'number' ? String(Math.round(value * 100)) : ''} onCommit={(raw) => void onSave(num(raw) === null ? raw : Math.round(num(raw)!) / 100)} />
          <span className="hint">{t('style.percent')}</span>
        </span>
      );
    case 'percent':
      return (
        <span className="unit">
          <Committed id={id} type="number" step={1} min={0} max={100} value={typeof value === 'number' ? String(value) : ''} onCommit={(raw) => void onSave(num(raw) ?? raw)} />
          <span className="hint">{t('style.percent')}</span>
        </span>
      );
    case 'boolean':
      return <input id={id} type="checkbox" data-testid="style-input" checked={value === true} onChange={(e) => void onSave(e.target.checked)} />;
    case 'font':
      return (
        <select id={id} data-testid="style-input" value={String(value)} onChange={(e) => void onSave(e.target.value)}>
          {FONT_FAMILIES.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      );
    case 'position':
      return (
        <select id={id} data-testid="style-input" value={String(value)} onChange={(e) => void onSave(e.target.value)}>
          {POSITIONS.map((p) => (
            <option key={p} value={p}>
              {t(`captions.position.${p}`)}
            </option>
          ))}
        </select>
      );
    case 'color':
      return (
        <span className="unit">
          <span className="swatch" style={{ background: String(value) }} aria-hidden="true" />
          <Committed id={id} type="text" dir="ltr" value={String(value)} onCommit={(raw) => void onSave(raw)} />
        </span>
      );
    case 'minmax': {
      const mm = (typeof value === 'object' && value !== null ? value : { min: 0, max: 0 }) as { min: number; max: number };
      return (
        <span className="unit">
          <span className="hint">{t('style.min')}</span>
          <Committed id={id} type="number" step={1} min={1} value={String(mm.min)} testId="style-input-min" onCommit={(raw) => void onSave({ ...mm, min: num(raw) ?? raw })} />
          <span className="hint">{t('style.max')}</span>
          <Committed id={`${id}-max`} type="number" step={1} min={1} value={String(mm.max)} testId="style-input-max" onCommit={(raw) => void onSave({ ...mm, max: num(raw) ?? raw })} />
        </span>
      );
    }
    case 'words':
      return <WordChips id={id} words={Array.isArray(value) ? value.map(String) : []} onSave={onSave} />;
  }
}

function WordChips({ id, words, onSave }: { id: string; words: string[]; onSave: (value: unknown) => Promise<void> }) {
  const [draft, setDraft] = useState('');
  const add = (): void => {
    const w = draft.trim();
    if (!w || words.includes(w)) return;
    setDraft('');
    void onSave([...words, w]);
  };
  return (
    <span className="chips" data-testid="style-words">
      {words.map((w) => (
        <span key={w} className="chip" data-testid="style-word" data-word={w}>
          {w}
          <button type="button" data-testid="style-word-remove" title={t('style.removeWord')} aria-label={`${t('style.removeWord')} ${w}`} onClick={() => void onSave(words.filter((x) => x !== w))}>
            ×
          </button>
        </span>
      ))}
      <input
        id={id}
        type="text"
        data-testid="style-word-add"
        placeholder={t('style.addWord')}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') add();
        }}
      />
    </span>
  );
}
