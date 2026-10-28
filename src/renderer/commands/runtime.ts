import { useSyncExternalStore } from 'react';
import type {
  CommandName,
  CommandParamsMap,
  ProjectDocument,
  StyleVersion,
} from '../../core/contracts/types';
import { execute } from '../../core/commands/registry';
import { getCommandSpec } from '../../core/contracts/validate';
import type { ExecuteResult } from '../../core/commands/registry';
import type { CommandContext, Effect, ProbeLike } from '../../core/commands/types';
import { History } from '../../core/history/snapshots';
import type { Actor } from '../../core/history/snapshots';
import { setLang } from '../i18n';
import type { Lang } from '../i18n';

// الأوامر تُنفَّذ هنا في الـrenderer (plan.md §Structure Decision)؛ main يحفظ فقط عبر IPC.

export type Screen =
  'import' | 'timeline' | 'proposal' | 'words' | 'style' | 'history' | 'settings' | 'export';

export interface IpcError {
  code: string;
  message: string;
}

export interface PendingConfirm {
  name: CommandName;
  resolve: (confirmed: boolean) => void;
}

export interface RuntimeState {
  ready: boolean;
  screen: Screen;
  project: ProjectDocument | null;
  style: StyleVersion | null;
  history: History;
  projects: Array<{ id: string; name: string; updatedAt: string }>;
  pendingConfirm: PendingConfirm | null;
  /** آخر probe ناجح — تُعرض فوراً قبل أول إطار (FR-001) */
  lastProbe: ProbeLike | null;
  /** آخر خطأ استيراد (رمز مستقر → رسالة عربية في الواجهة) */
  importError: IpcError | null;
}

let state: RuntimeState = {
  ready: false,
  screen: 'import',
  project: null,
  style: null,
  history: new History(),
  projects: [],
  pendingConfirm: null,
  lastProbe: null,
  importError: null,
};
const listeners = new Set<() => void>();

function set(patch: Partial<RuntimeState>): void {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function getState(): RuntimeState {
  return state;
}

export function useRuntime(): RuntimeState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

export function toIpcError(e: unknown): IpcError {
  if (typeof e === 'object' && e !== null && typeof (e as IpcError).code === 'string') {
    return { code: (e as IpcError).code, message: String((e as IpcError).message ?? '') };
  }
  return { code: 'internal', message: e instanceof Error ? e.message : String(e) };
}

// ---- الحفظ: مؤجَّل 300ms بعد كل أمر، ويُفرَّغ عند الإغلاق (FR-016)
const SAVE_DEBOUNCE_MS = 300;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let dirty: ProjectDocument | null = null;

async function flushSave(): Promise<void> {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  const doc = dirty;
  dirty = null;
  if (doc) await window.api.project.save(doc);
}

function scheduleSave(doc: ProjectDocument): void {
  dirty = doc;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void flushSave(), SAVE_DEBOUNCE_MS);
}

window.addEventListener('beforeunload', () => {
  void flushSave(); // أفضل جهد: قد تُغلق النافذة قبل اكتمال invoke
});

function newId(): string {
  return crypto.randomUUID();
}

// آثار الأوامر (CommandResult.effects): كل نوع يسجّل معالجه من وحدته (مثل export/run.ts) حتى لا يستورد runtime تلك الوحدات
type EffectHandler<K extends Effect['kind']> = (effect: Extract<Effect, { kind: K }>, project: ProjectDocument, style: StyleVersion) => void;
const effectHandlers = new Map<Effect['kind'], EffectHandler<Effect['kind']>>();
export function onEffect<K extends Effect['kind']>(kind: K, handler: EffectHandler<K>): void {
  effectHandlers.set(kind, handler as unknown as EffectHandler<Effect['kind']>);
}

function ctx(extra?: Partial<CommandContext>): CommandContext {
  if (!state.style)
    throw { code: 'style_missing', message: 'النمط الافتراضي لم يُحمَّل بعد' } satisfies IpcError;
  return { style: state.style, now: () => new Date().toISOString(), newId, ...extra };
}

export function navigate(screen: Screen): void {
  set({ screen });
}

export async function init(): Promise<void> {
  const [style, settings, projects] = await Promise.all([
    window.api.style.ensureDefault(),
    window.api.settings.load(),
    window.api.project.list(),
  ]);
  setLang(settings.ui.lang);
  set({ style, projects, ready: true });
}

export async function changeLang(lang: Lang): Promise<void> {
  setLang(lang);
  await window.api.settings.save({ ui: { lang } });
}

export function answerConfirm(confirmed: boolean): void {
  const p = state.pendingConfirm;
  if (!p) return;
  set({ pendingConfirm: null });
  p.resolve(confirmed);
}

/**
 * ينفّذ أمراً على المشروع المفتوح. عند confirmation_required يفتح نافذة التأكيد ويعيد التشغيل مؤكَّداً؛
 * يعيد null إن ألغى المستخدم.
 */
export async function run<N extends CommandName>(
  name: N,
  params: CommandParamsMap[N],
  opts: { actor?: Actor; confirmed?: boolean; probe?: ProbeLike } = {},
): Promise<ExecuteResult | null> {
  const project = state.project;
  if (!project) throw { code: 'no_project', message: 'لا مشروع مفتوح' } satisfies IpcError;
  const actor = opts.actor ?? 'user';
  let result: ExecuteResult;
  try {
    result = execute(project, name, params, ctx(opts.probe ? { probe: opts.probe } : undefined), {
      actor,
      history: state.history,
      confirmed: opts.confirmed,
    });
  } catch (e) {
    if (toIpcError(e).code !== 'confirmation_required' || opts.confirmed) throw e;
    const confirmed = await new Promise<boolean>((resolve) => set({ pendingConfirm: { name, resolve } }));
    return confirmed ? run(name, params, { ...opts, confirmed: true }) : null;
  }
  set({ project: result.project });
  scheduleSave(result.project);
  // لقطة على القرص للأوامر القابلة للتراجع فقط؛ undo/redo يعيدان entry لكنهما لا يُنشئان مدخلاً جديداً
  if (result.entry && getCommandSpec(name).undoable)
    await window.api.project.writeSnapshot(result.project.id, result.entry);
  for (const effect of result.effects ?? []) effectHandlers.get(effect.kind)?.(effect, result.project, state.style!);
  return result;
}

/** استيراد: probe في main ← project.import نقي هنا ← حفظ فوري ← التايم لاين (T029). */
export async function importPath(
  path: string,
  probed?: ProbeLike,
): Promise<{ ok: true; projectId: string } | { ok: false; code: string; message: string }> {
  set({ importError: null });
  try {
    const probe = probed ?? (await window.api.project.probe(path));
    set({ lastProbe: probe });
    // الاستيراد لا يعمل على مشروع مفتوح؛ المدخل يُتجاهل وتاريخ جديد
    const history = new History();
    const result = execute(
      state.project ?? placeholderProject(probe),
      'project.import',
      { path },
      ctx({ probe }),
      { actor: 'user', history },
    );
    await window.api.project.save(result.project);
    set({ project: result.project, history, screen: 'timeline', projects: await window.api.project.list() });
    window.__preview?.show(result.project.id, 0);
    return { ok: true, projectId: result.project.id };
  } catch (e) {
    const err = toIpcError(e);
    set({ importError: err, lastProbe: null });
    return { ok: false, ...err };
  }
}

export async function importFile(file: File): ReturnType<typeof importPath> {
  try {
    const probe = await window.api.project.probeFile(file);
    return await importPath(probe.path, probe);
  } catch (e) {
    const err = toIpcError(e);
    set({ importError: err, lastProbe: null });
    return { ok: false, ...err };
  }
}

// execute تتطلب مستنداً مدخلاً وتتجاهله project.import؛ نمرّر هيكلاً من probe نفسه (لا يُحفظ أبداً)
function placeholderProject(probe: ProbeLike): ProjectDocument {
  return {
    schemaVersion: 1,
    id: 'pending',
    name: '',
    createdAt: '1970-01-01T00:00:00.000Z',
    updatedAt: '1970-01-01T00:00:00.000Z',
    seed: 0,
    source: { id: 'pending', ...probe },
    style: { styleId: 'default', version: 1 },
    transcript: null,
    transcriptJob: { state: 'idle' },
    timeline: { clips: [] },
    captions: { enabled: false, cues: [] },
    proposals: [],
    corrections: [],
    styleUpdateProposals: [],
  };
}

/** فتح مشروع محفوظ مع نسخة النمط المثبَّتة ولقطات السجل (FR-016). */
export async function loadProject(id: string): Promise<void> {
  await flushSave();
  const project = await window.api.project.load(id);
  const [style, snapshots] = await Promise.all([
    window.api.style.loadVersion(project.style.styleId, project.style.version),
    window.api.project.readSnapshots(id),
  ]);
  const last = snapshots.at(-1);
  const history = History.fromJSON({ undo: snapshots, redo: [], nextSeq: (last?.seq ?? 0) + 1 });
  set({ project, style, history, screen: 'timeline', lastProbe: null });
  window.__preview?.show(project.id, 0);
}

if (window.api.app.isTest) {
  window.__test = {
    importPath: (path) => importPath(path),
    state: () => ({ ...state, history: state.history.toJSON() }),
  };
}
