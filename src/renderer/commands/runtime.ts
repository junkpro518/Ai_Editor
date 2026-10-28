import { useSyncExternalStore } from 'react';
import type {
  CommandName,
  CommandParamsMap,
  ProjectDocument,
  StyleVersion,
} from '../../core/contracts/types';
import { execute } from '../../core/commands/registry';
import { getCommandSpec, validateProject } from '../../core/contracts/validate';
import type { ExecuteResult } from '../../core/commands/registry';
import type { CommandContext, Effect, ProbeLike } from '../../core/commands/types';
import { History } from '../../core/history/snapshots';
import type { Actor } from '../../core/history/snapshots';
import { measureText } from '../captions/measure';
import { loadFonts, warnUnknownFontFamily } from '../fonts';
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
  /** FR-016: ملف المصدر غير موجود في مكانه عند فتح المشروع (يُفحص في loadProject) */
  sourceMissing: boolean;
  /** US3: أحدث رقم إصدار في مكتبة النمط المثبّت؛ > project.style.version → إشعار «إصدار أحدث متاح» (لا ترقية تلقائية) */
  latestStyleVersion: number | null;
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
  sourceMissing: false,
  latestStyleVersion: null,
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
// الحفظ متسلسل: كتابتان ذريتان متزامنتان قد تكتملان بترتيب معكوس فتبقى النسخة الأقدم على القرص
let saving: Promise<void> = Promise.resolve();

function flushSave(): Promise<void> {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  const doc = dirty;
  dirty = null;
  if (doc) saving = saving.then(() => window.api.project.save(doc), () => window.api.project.save(doc));
  return saving;
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
  // measure: قياس النص عبر DOM (captions/measure.ts) — اشتقاق الكابشن يحتاجه داخل الأوامر (data-model §1.10)
  return {
    style: state.style,
    now: () => new Date().toISOString(),
    newId,
    measure: measureText,
    ...(state.latestStyleVersion !== null ? { latestStyleVersion: state.latestStyleVersion } : {}),
    ...extra,
  };
}

/** أحدث رقم إصدار في المكتبة لهذا النمط (0 إن لم يوجد) */
async function latestVersionOf(styleId: string): Promise<number> {
  const versions = await window.api.style.listVersions(styleId);
  return versions.reduce((m, v) => Math.max(m, v.version), 0);
}

/**
 * state.style يتبع تثبيت المشروع دائماً: التراجع عن style.setField يرجع التثبيت وحده (الإصدار يبقى في المكتبة،
 * data-model §1.9) وproject.upgradeStyle يثبّت بلا أثر — فيُحمَّل الإصدار المثبّت إن اختلف (أو يُؤخذ المحمَّل مسبقاً).
 */
async function syncStyleToPin(project: ProjectDocument, preloaded?: StyleVersion): Promise<void> {
  const pin = project.style;
  if (state.style && state.style.styleId === pin.styleId && state.style.version === pin.version) return;
  const style =
    preloaded && preloaded.styleId === pin.styleId && preloaded.version === pin.version
      ? preloaded
      : await window.api.style.loadVersion(pin.styleId, pin.version);
  warnUnknownFontFamily(String(style.captions.fontFamily.value));
  set({ style });
}

/** أثر style-version-created: الإصدار الجديد يصير نمط الجلسة فوراً ثم يُكتب في المكتبة (ملف جديد لا يُستبدل). */
async function persistStyleVersion(style: StyleVersion): Promise<void> {
  warnUnknownFontFamily(String(style.captions.fontFamily.value));
  set({ style, latestStyleVersion: Math.max(state.latestStyleVersion ?? 0, style.version) });
  await window.api.style.saveVersion(style);
}

/** السياق نفسه للتحديثات النظامية خارج الأوامر (إلحاق التفريغ يعيد اشتقاق الكابشن). */
export function commandContext(): CommandContext {
  return ctx();
}

export function navigate(screen: Screen): void {
  set({ screen });
}

export async function init(): Promise<void> {
  // الخطوط قبل أول معاينة (T059): كابشن لا يُرسم إلا بعد fontsReady()
  const [defaultStyle, settings, projects] = await Promise.all([
    window.api.style.ensureDefault(),
    window.api.settings.load(),
    window.api.project.list(),
    loadFonts(),
  ]);
  setLang(settings.ui.lang);
  // المشاريع الجديدة تثبّت أحدث إصدار في المكتبة لا v1 الافتراضي (FR-010: المكتبة عند المستخدم تنمو)
  const latestStyleVersion = await latestVersionOf(defaultStyle.styleId);
  const style = latestStyleVersion > defaultStyle.version ? await window.api.style.loadVersion(defaultStyle.styleId, latestStyleVersion) : defaultStyle;
  warnUnknownFontFamily(String(style.captions.fontFamily.value));
  set({ style, projects, ready: true, latestStyleVersion: Math.max(latestStyleVersion, style.version) });
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
  // الرجوع/الترقية يحتاجان إصدار الهدف داخل الأمر النقي: يُحمَّل من المكتبة هنا (مثل probe للاستيراد).
  // await لهذين فقط، وقراءة المشروع بعده: أمران متتاليان في النبضة نفسها لا يلتقطان الحالة القديمة
  const styleVersion = name === 'style.rollback' || name === 'project.upgradeStyle' ? await preloadStyleVersion(name, params) : undefined;
  const project = state.project;
  if (!project) throw { code: 'no_project', message: 'لا مشروع مفتوح' } satisfies IpcError;
  const actor = opts.actor ?? 'user';
  let result: ExecuteResult;
  try {
    result = execute(project, name, params, ctx({ ...(opts.probe ? { probe: opts.probe } : {}), ...(styleVersion ? { styleVersion } : {}) }), {
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
  for (const effect of result.effects ?? []) {
    // الإصدار الجديد يُحفظ هنا أولاً؛ ثم معالج الواجهة (إن سُجِّل) لتحديث قائمة الإصدارات مثلاً
    if (effect.kind === 'style-version-created') await persistStyleVersion(effect.style);
    effectHandlers.get(effect.kind)?.(effect, result.project, state.style!);
  }
  await syncStyleToPin(result.project, styleVersion);
  return result;
}

function preloadStyleVersion<N extends CommandName>(name: N, params: CommandParamsMap[N]): Promise<StyleVersion | undefined> {
  if (name === 'style.rollback') {
    const p = params as CommandParamsMap['style.rollback'];
    return window.api.style.loadVersion(p.styleId, p.toVersion);
  }
  if (name === 'project.upgradeStyle') {
    const p = params as CommandParamsMap['project.upgradeStyle'];
    if (!state.project) throw { code: 'no_project', message: 'لا مشروع مفتوح' } satisfies IpcError;
    return window.api.style.loadVersion(state.project.style.styleId, p.toVersion);
  }
  return Promise.resolve(undefined);
}

/**
 * تحديث نظامي خارج الأوامر (ليس في التاريخ ولا يُتراجع عنه): حالة مهمة التفريغ ونتيجتها وإعادة ربط المصدر
 * (FR-016؛ الافتراض الموثَّق في موجز المرحلة 3). يُدقَّق المستند قبل العرض والحفظ؛ `immediate` يحفظ فوراً
 * لأن main يقرأ المشروع من القرص عند بدء التفريغ.
 */
export async function systemUpdate(next: ProjectDocument, opts: { immediate?: boolean } = {}): Promise<void> {
  validateProject(next);
  if (!state.project || state.project.id !== next.id) return;
  set({ project: next });
  if (opts.immediate) {
    dirty = next;
    await flushSave();
  } else {
    scheduleSave(next);
  }
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
    set({ project: result.project, history, screen: 'timeline', projects: await window.api.project.list(), sourceMissing: false });
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
  const [style, snapshots, latestStyleVersion] = await Promise.all([
    window.api.style.loadVersion(project.style.styleId, project.style.version),
    window.api.project.readSnapshots(id),
    latestVersionOf(project.style.styleId),
  ]);
  const last = snapshots.at(-1);
  const history = History.fromJSON({ undo: snapshots, redo: [], nextSeq: (last?.seq ?? 0) + 1 });
  // FR-016: مصدر منقول أو مُعاد تسميته → الواجهة تطلب تحديد مكانه (TranscriptStatus)
  const stat = await window.api.project.statSource(id).catch(() => ({ exists: true }));
  warnUnknownFontFamily(String(style.captions.fontFamily.value));
  set({ project, style, history, screen: 'timeline', lastProbe: null, sourceMissing: !stat.exists, latestStyleVersion: Math.max(latestStyleVersion, style.version) });
  if (stat.exists) window.__preview?.show(project.id, 0);
}

export function setSourceMissing(sourceMissing: boolean): void {
  set({ sourceMissing });
}

if (window.api.app.isTest) {
  window.__test = {
    importPath: (path) => importPath(path),
    state: () => ({ ...state, history: state.history.toJSON() }),
  };
}
