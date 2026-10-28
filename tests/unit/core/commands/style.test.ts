import { describe, expect, it } from 'vitest';
import { execute } from '../../../../src/core/commands/registry';
import type { CommandContext, Effect } from '../../../../src/core/commands/types';
import { validateStyle } from '../../../../src/core/contracts/validate';
import type { Precedent, ProjectDocument, Proposal, StyleUpdateProposal, StyleVersion } from '../../../../src/core/contracts/types';
import { History } from '../../../../src/core/history/snapshots';
import { createVersion } from '../../../../src/core/style/library';
import { makeCtx, makeProject, makeStyle, makeTranscript, FIXED_NOW } from '../../../helpers/project';

// T070 — أوامر النمط: style.setField (إصدار جديد + تثبيت + إعادة اشتقاق الكابشن لمسار captions.*)،
// style.updateProposal.accept/reject (SC-007)، style.rollback (إصدار جديد بمحتوى قديم)،
// project.upgradeStyle (يلغي المقترح غير المطبَّق ويعيد الاشتقاق كأمر واحد). الإشعار بإصدار أحدث شأن الواجهة:
// لا أمر يغيّر التثبيت تلقائياً — يثبته اختبار «بلا أمر لا تغيير».

function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o as object)) deepFreeze(v);
  }
  return o;
}
const codeOf = (fn: () => unknown): string => {
  try {
    fn();
  } catch (e) {
    return (e as { code: string }).code;
  }
  return 'no_error';
};
const user = (history = new History(), confirmed?: boolean) => ({ actor: 'user' as const, history, confirmed });
const created = (effects: Effect[] | undefined): StyleVersion => {
  const e = effects?.find((x) => x.kind === 'style-version-created');
  if (!e || e.kind !== 'style-version-created') throw new Error('no style-version-created effect');
  validateStyle(e.style);
  return e.style;
};

const transcript = makeTranscript([
  ['السلام', 100_000, 400_000],
  ['عليكم', 600_000, 900_000],
  ['اليوم', 1_100_000, 1_400_000],
  ['يعني', 1_600_000, 1_900_000],
  ['الدرس', 2_100_000, 2_400_000],
  ['تمام', 2_600_000, 2_900_000],
]);

/** مشروع 30fps بتفريغ وكابشن مشتق على النمط الافتراضي (كما يتركه applyTranscript) */
function withCaptionsOn(extra: Partial<ProjectDocument> = {}): ProjectDocument {
  const base = makeProject();
  const p = makeProject({
    source: { ...base.source, fps: { num: 30, den: 1 }, frameCount: 150, durationUs: 5_000_000 },
    timeline: { clips: [{ id: 'clip-1', sourceId: 'src-1', inFrame: 0, outFrame: 150, timelineStartFrame: 0 }] },
    transcript,
    captions: { enabled: true, cues: [] },
    ...extra,
  });
  // اشتقاق أولي عبر أمر موجود (captions.toggle) حتى تكون cues غير فارغة قبل الاختبار
  return execute(p, 'captions.toggle', { enabled: true }, makeCtx(), user()).project;
}

describe('style.setField', () => {
  it('يُنشئ إصدار نمط جديداً (reason=user، المصدر user) ويثبّت المشروع عليه؛ الأمر غير محتاج تأكيداً وقابل للتراجع', () => {
    const input = deepFreeze(makeProject());
    const history = new History();
    const r = execute(input, 'style.setField', { path: 'cut.silenceMaxUs', value: 1_000_000 }, makeCtx(), user(history));
    const style = created(r.effects);
    expect(style.version).toBe(2);
    expect(style.reason).toBe('user');
    expect(style.date).toBe(FIXED_NOW);
    expect(style.basedOn).toEqual({ styleId: 'default', version: 1 });
    expect(style.cut.silenceMaxUs).toMatchObject({ value: 1_000_000, mode: 'preference', source: { kind: 'user', at: FIXED_NOW } });
    expect(r.project.style).toEqual({ styleId: 'default', version: 2 });
    expect(r.description).toBe('غيّر silenceMaxUs في النمط (الإصدار 2)');
    expect(input.style.version).toBe(1);
    // التراجع يرجع التثبيت فقط (ملف الإصدار يبقى في المكتبة — data-model §1.9)
    const u = execute(r.project, 'history.undo', {}, makeCtx(), user(history));
    expect(u.project.style).toEqual({ styleId: 'default', version: 1 });
  });

  it('mode وreason اختياريان: يغيّران الوضع والسبب', () => {
    const r = execute(makeProject(), 'style.setField', { path: 'captions.position', value: 'top', mode: 'mandatory', reason: 'تجربة' }, makeCtx(), user());
    const style = created(r.effects);
    expect(style.captions.position).toMatchObject({ value: 'top', mode: 'mandatory' });
    expect(style.reason).toBe('تجربة');
  });

  it('مسار captions.* يعيد اشتقاق الكابشن بالنمط الجديد؛ مسار cut.* لا يمسّ الكابشن', () => {
    const p = withCaptionsOn();
    expect(p.captions.cues.length).toBeGreaterThan(0);
    const sizes = new Set(p.captions.cues.map((c) => c.fontSizePx));

    const cut = execute(p, 'style.setField', { path: 'cut.silenceMaxUs', value: 1_000_000 }, makeCtx(), user());
    expect(cut.project.captions.cues).toEqual(p.captions.cues);

    const cap = execute(p, 'style.setField', { path: 'captions.fontSizePx', value: 50 }, makeCtx(), user());
    expect(cap.project.captions.cues.length).toBeGreaterThan(0);
    expect(new Set(cap.project.captions.cues.map((c) => c.fontSizePx))).not.toEqual(sizes);

    const off = execute(p, 'style.setField', { path: 'captions.enabled', value: false }, makeCtx(), user());
    // enabled في النمط افتراضي للمشاريع الجديدة؛ المشروع المفتوح يحتفظ بمفتاحه captions.enabled
    expect(off.project.captions.enabled).toBe(true);
  });

  it('المكتبة أحدث من المثبّت (ctx.latestStyleVersion) → الرقم الجديد بعد الأحدث لا بعد المثبّت', () => {
    const ctx: CommandContext = { ...makeCtx(), latestStyleVersion: 4 };
    const r = execute(makeProject(), 'style.setField', { path: 'cut.silenceMaxUs', value: 1_000_000 }, ctx, user());
    expect(created(r.effects).version).toBe(5);
    expect(r.project.style.version).toBe(5);
  });

  it('أخطاء: مسار خارج النمط → خطأ عقد؛ حقل غير معروف → unknown_style_field؛ نوع خاطئ → invalid_style_rule', () => {
    expect(codeOf(() => execute(makeProject(), 'style.setField', { path: 'foo.bar', value: 1 }, makeCtx(), user()))).toBe('schema');
    expect(codeOf(() => execute(makeProject(), 'style.setField', { path: 'cut.nope', value: 1 }, makeCtx(), user()))).toBe('unknown_style_field');
    expect(codeOf(() => execute(makeProject(), 'style.setField', { path: 'cut.silenceMaxUs', value: 'x' }, makeCtx(), user()))).toBe('invalid_style_rule');
  });
});

// ---- اقتراح تحديث النمط
const sup = (over: Partial<StyleUpdateProposal> = {}): StyleUpdateProposal => ({
  id: 'sup-1',
  createdAt: FIXED_NOW,
  styleRef: { styleId: 'default', version: 1 },
  trigger: { kind: 'repeated_rejection', reason: 'filler', count: 3, correctionIds: ['c1', 'c2', 'c3'] },
  diff: [{ path: 'cut.fillerWords', from: makeStyle().cut.fillerWords.value, to: ['امم', 'أمم', 'اممم', 'ايه', 'إيه'] }],
  newPrecedents: ['c1', 'c2', 'c3'].map(
    (c, k): Precedent => ({ id: `p${k}`, ruleId: 'cut.fillerWords', rule: 'قاعدة', quote: 'يعني', check: 'سؤال؟', source: { kind: 'learned', ref: c, at: FIXED_NOW }, addedInVersion: 2 }),
  ),
  state: 'pending',
  ...over,
});

describe('style.updateProposal.accept', () => {
  it('يحتاج تأكيداً؛ القبول = إصدار learned بالفرق والسوابق وbasedOnCorrections، والاقتراح accepted بتاريخ، والمشروع مثبّت عليه', () => {
    const input = deepFreeze(makeProject({ styleUpdateProposals: [sup()] }));
    expect(codeOf(() => execute(input, 'style.updateProposal.accept', { proposalId: 'sup-1' }, makeCtx(), user()))).toBe('confirmation_required');
    const history = new History();
    const r = execute(input, 'style.updateProposal.accept', { proposalId: 'sup-1' }, makeCtx(), user(history, true));
    const style = created(r.effects);
    expect(style.version).toBe(2);
    expect(style.reason).toBe('learned');
    expect(style.basedOnCorrections).toEqual(['c1', 'c2', 'c3']);
    expect(style.cut.fillerWords).toMatchObject({ value: ['امم', 'أمم', 'اممم', 'ايه', 'إيه'], mode: 'preference', source: { kind: 'learned', ref: 'sup-1', at: FIXED_NOW } });
    expect(style.precedents.map((p) => p.id)).toEqual(['p0', 'p1', 'p2']);
    expect(style.precedents.every((p) => p.addedInVersion === 2)).toBe(true);
    expect(r.project.style).toEqual({ styleId: 'default', version: 2 });
    expect(r.project.styleUpdateProposals[0]).toMatchObject({ state: 'accepted', decidedAt: FIXED_NOW });
    expect(r.description).toBe('قبل تحديث النمط (الإصدار 2)');
    const u = execute(r.project, 'history.undo', {}, makeCtx(), user(history));
    expect(u.project.style.version).toBe(1);
    expect(u.project.styleUpdateProposals[0]?.state).toBe('pending');
  });

  it('addedInVersion في السوابق يُطابق رقم الإصدار الفعلي حتى لو كانت المكتبة أحدث', () => {
    const ctx: CommandContext = { ...makeCtx(), latestStyleVersion: 3 };
    const r = execute(makeProject({ styleUpdateProposals: [sup()] }), 'style.updateProposal.accept', { proposalId: 'sup-1' }, ctx, user(new History(), true));
    const style = created(r.effects);
    expect(style.version).toBe(4);
    expect(style.precedents.every((p) => p.addedInVersion === 4)).toBe(true);
  });

  it('فرق يمسّ captions.* يعيد اشتقاق الكابشن', () => {
    const p = withCaptionsOn({ styleUpdateProposals: [sup({ diff: [{ path: 'captions.fontSizePx', from: 78, to: 50 }] })] });
    const r = execute(p, 'style.updateProposal.accept', { proposalId: 'sup-1' }, makeCtx(), user(new History(), true));
    expect(new Set(r.project.captions.cues.map((c) => c.fontSizePx))).not.toEqual(new Set(p.captions.cues.map((c) => c.fontSizePx)));
  });

  it('غير موجود → proposal_not_found؛ غير pending → proposal_not_pending؛ قيمة فرق من نوع خاطئ → invalid_style_rule', () => {
    const c = () => user(new History(), true);
    expect(codeOf(() => execute(makeProject(), 'style.updateProposal.accept', { proposalId: 'x' }, makeCtx(), c()))).toBe('proposal_not_found');
    expect(codeOf(() => execute(makeProject({ styleUpdateProposals: [sup({ state: 'rejected' })] }), 'style.updateProposal.accept', { proposalId: 'sup-1' }, makeCtx(), c()))).toBe('proposal_not_pending');
    const bad = sup({ diff: [{ path: 'cut.silenceMaxUs', from: 700_000, to: 'كثير' }] });
    expect(codeOf(() => execute(makeProject({ styleUpdateProposals: [bad] }), 'style.updateProposal.accept', { proposalId: 'sup-1' }, makeCtx(), c()))).toBe('invalid_style_rule');
  });
});

describe('style.updateProposal.reject', () => {
  it('الرفض يعلّم الاقتراح rejected بتاريخ ولا يغيّر النمط ولا التثبيت (SC-007)', () => {
    const input = deepFreeze(makeProject({ styleUpdateProposals: [sup()] }));
    const r = execute(input, 'style.updateProposal.reject', { proposalId: 'sup-1' }, makeCtx(), user());
    expect(r.effects).toBeUndefined();
    expect(r.project.style).toEqual(input.style);
    expect(r.project.styleUpdateProposals[0]).toMatchObject({ state: 'rejected', decidedAt: FIXED_NOW });
    expect(r.description).toBe('رفض تحديث النمط');
    expect(codeOf(() => execute(r.project, 'style.updateProposal.reject', { proposalId: 'sup-1' }, makeCtx(), user()))).toBe('proposal_not_pending');
  });
});

// ---- الرجوع والترقية
const v2 = (): StyleVersion =>
  createVersion(makeStyle(), { cut: { silenceMaxUs: { value: 1_000_000, mode: 'preference', source: { kind: 'user', at: FIXED_NOW } } } }, { reason: 'user', now: FIXED_NOW });

describe('style.rollback', () => {
  it('يحتاج تأكيداً وإصدار الهدف محمَّلاً في السياق؛ يُنشئ إصداراً جديداً بمحتوى الهدف ويثبّت المشروع عليه', () => {
    const project = deepFreeze(makeProject({ style: { styleId: 'default', version: 2 } }));
    const base = { ...makeCtx(), style: v2(), latestStyleVersion: 2 };
    expect(codeOf(() => execute(project, 'style.rollback', { styleId: 'default', toVersion: 1 }, { ...base, styleVersion: makeStyle() }, user()))).toBe('confirmation_required');
    expect(codeOf(() => execute(project, 'style.rollback', { styleId: 'default', toVersion: 1 }, base, user(new History(), true)))).toBe('style_version_required');
    expect(codeOf(() => execute(project, 'style.rollback', { styleId: 'default', toVersion: 1 }, { ...base, styleVersion: v2() }, user(new History(), true)))).toBe('style_version_required');
    expect(codeOf(() => execute(project, 'style.rollback', { styleId: 'other', toVersion: 1 }, { ...base, styleVersion: { ...makeStyle(), styleId: 'other' } }, user(new History(), true)))).toBe('style_mismatch');

    const r = execute(project, 'style.rollback', { styleId: 'default', toVersion: 1 }, { ...base, styleVersion: makeStyle() }, user(new History(), true));
    const style = created(r.effects);
    expect(style.version).toBe(3);
    expect(style.reason).toBe('rollback to v1');
    expect(style.cut.silenceMaxUs.value).toBe(700_000);
    expect(style.basedOn).toEqual({ styleId: 'default', version: 1 });
    expect(r.project.style).toEqual({ styleId: 'default', version: 3 });
    expect(r.description).toBe('رجع النمط إلى محتوى الإصدار 1 (الإصدار 3)');
  });

  it('الرجوع يعيد اشتقاق الكابشن بالمحتوى القديم', () => {
    const p = withCaptionsOn({ style: { styleId: 'default', version: 2 } });
    const small = createVersion(makeStyle(), { captions: { fontSizePx: { value: 50, mode: 'preference', source: { kind: 'user', at: FIXED_NOW } } } }, { reason: 'user', now: FIXED_NOW });
    const pinnedSmall = execute(p, 'style.setField', { path: 'captions.fontSizePx', value: 50 }, makeCtx(), user()).project;
    const r = execute(pinnedSmall, 'style.rollback', { styleId: 'default', toVersion: 1 }, { ...makeCtx(), style: small, styleVersion: makeStyle(), latestStyleVersion: 2 }, user(new History(), true));
    expect(r.project.captions.cues.map((c) => c.fontSizePx)).toEqual(p.captions.cues.map((c) => c.fontSizePx));
  });
});

describe('project.upgradeStyle', () => {
  const draft = (id: string, state: Proposal['state']): Proposal => ({
    id,
    createdAt: FIXED_NOW,
    styleRef: { styleId: 'default', version: 1 },
    items: [],
    totals: { byReason: { silence: 0, repeat: 0, abandoned: 0, filler: 0 }, savedUs: 0 },
    state,
    localOnly: true,
  });

  it('يحتاج تأكيداً والإصدار الهدف في السياق؛ يثبّت، يلغي المقترحات غير المطبَّقة، ويعيد اشتقاق الكابشن — أمر واحد قابل للتراجع', () => {
    const p = deepFreeze(withCaptionsOn({ proposals: [draft('a', 'draft'), draft('b', 'reviewed'), draft('c', 'applied'), draft('d', 'discarded')] }));
    const sizes = p.captions.cues.map((c) => c.fontSizePx);
    const target = createVersion(makeStyle(), { captions: { fontSizePx: { value: 50, mode: 'preference', source: { kind: 'user', at: FIXED_NOW } } } }, { reason: 'user', now: FIXED_NOW });
    expect(codeOf(() => execute(p, 'project.upgradeStyle', { toVersion: 2 }, { ...makeCtx(), styleVersion: target }, user()))).toBe('confirmation_required');
    expect(codeOf(() => execute(p, 'project.upgradeStyle', { toVersion: 2 }, makeCtx(), user(new History(), true)))).toBe('style_version_required');
    expect(codeOf(() => execute(p, 'project.upgradeStyle', { toVersion: 3 }, { ...makeCtx(), styleVersion: target }, user(new History(), true)))).toBe('style_version_required');
    expect(codeOf(() => execute(p, 'project.upgradeStyle', { toVersion: 1 }, { ...makeCtx(), styleVersion: makeStyle() }, user(new History(), true)))).toBe('style_version_same');

    const history = new History();
    const r = execute(p, 'project.upgradeStyle', { toVersion: 2 }, { ...makeCtx(), styleVersion: target }, user(history, true));
    expect(r.effects).toBeUndefined(); // لا إصدار جديد: الترقية تثبيت فقط
    expect(r.project.style).toEqual({ styleId: 'default', version: 2 });
    expect(r.project.proposals.map((x) => x.state)).toEqual(['discarded', 'discarded', 'applied', 'discarded']);
    expect(r.project.captions.cues.map((c) => c.fontSizePx)).not.toEqual(sizes);
    expect(r.description).toBe('رقّى النمط إلى الإصدار 2');
    expect(history.entries()).toHaveLength(1);
    const u = execute(r.project, 'history.undo', {}, makeCtx(), user(history));
    expect(u.project.style.version).toBe(1);
    expect(u.project.proposals.map((x) => x.state)).toEqual(['draft', 'reviewed', 'applied', 'discarded']);
    expect(u.project.captions.cues.map((c) => c.fontSizePx)).toEqual(sizes);
  });

  it('وجود إصدار أحدث لا يغيّر شيئاً بلا أمر صريح (US3-5)', () => {
    const p = deepFreeze(makeProject());
    // المكتبة عند v3 والمشروع مثبّت على v1: أي أمر آخر لا يمسّ التثبيت
    const r = execute(p, 'clip.split', { clipId: 'clip-1', atFrame: 100 }, { ...makeCtx(), latestStyleVersion: 3 }, user());
    expect(r.project.style).toEqual({ styleId: 'default', version: 1 });
  });
});

// ---- مراجعة US3 (T077) + القرار 32: اقتراح تحديث معلّق يُلغى (superseded) متى تغيّر تثبيت النمط،
// والقبول يرفض اقتراحاً قديماً (stale_proposal) كخط دفاع ثانٍ
describe('اقتراحات التحديث المعلّقة عند تغيّر النمط (القرار 32)', () => {
  const states = (p: ProjectDocument) => p.styleUpdateProposals.map((x) => [x.id, x.state, x.decidedAt ?? null]);
  const decided = (id: string, state: StyleUpdateProposal['state']) => sup({ id, state, decidedAt: FIXED_NOW });

  it('style.setField: المعلّق → superseded بتاريخ، والمحسوم يبقى؛ التراجع يعيده pending', () => {
    const input = deepFreeze(makeProject({ styleUpdateProposals: [sup(), decided('sup-old', 'rejected')] }));
    const history = new History();
    const r = execute(input, 'style.setField', { path: 'cut.silenceMaxUs', value: 1_000_000 }, makeCtx(), user(history));
    expect(states(r.project)).toEqual([
      ['sup-1', 'superseded', FIXED_NOW],
      ['sup-old', 'rejected', FIXED_NOW],
    ]);
    const u = execute(r.project, 'history.undo', {}, makeCtx(), user(history));
    expect(u.project.styleUpdateProposals[0]).toEqual(sup());
  });

  it('style.rollback وproject.upgradeStyle يلغيان المعلّق أيضاً', () => {
    const project = deepFreeze(makeProject({ style: { styleId: 'default', version: 2 }, styleUpdateProposals: [sup({ styleRef: { styleId: 'default', version: 2 } })] }));
    const rb = execute(project, 'style.rollback', { styleId: 'default', toVersion: 1 }, { ...makeCtx(), style: v2(), styleVersion: makeStyle(), latestStyleVersion: 2 }, user(new History(), true));
    expect(rb.project.styleUpdateProposals[0]).toMatchObject({ state: 'superseded', decidedAt: FIXED_NOW });
    const up = execute(project, 'project.upgradeStyle', { toVersion: 1 }, { ...makeCtx(), style: v2(), styleVersion: makeStyle() }, user(new History(), true));
    expect(up.project.styleUpdateProposals[0]).toMatchObject({ state: 'superseded', decidedAt: FIXED_NOW });
  });

  it('style.updateProposal.accept: المقبول accepted والمعلّقة الأخرى superseded', () => {
    const other = sup({ id: 'sup-2', diff: [], trigger: { kind: 'repeated_rejection', reason: 'abandoned', count: 3, correctionIds: ['c4', 'c5', 'c6'] } });
    const r = execute(makeProject({ styleUpdateProposals: [sup(), other] }), 'style.updateProposal.accept', { proposalId: 'sup-1' }, makeCtx(), user(new History(), true));
    expect(states(r.project)).toEqual([
      ['sup-1', 'accepted', FIXED_NOW],
      ['sup-2', 'superseded', FIXED_NOW],
    ]);
  });

  it('accept يرفض اقتراحاً قديماً بـstale_proposal: تثبيت مختلف، نمط مختلف، أو from لا يطابق القيمة الحالية', () => {
    const c = () => user(new History(), true);
    const run = (s: StyleUpdateProposal) => codeOf(() => execute(makeProject({ styleUpdateProposals: [s] }), 'style.updateProposal.accept', { proposalId: 'sup-1' }, makeCtx(), c()));
    expect(run(sup({ styleRef: { styleId: 'default', version: 2 } }))).toBe('stale_proposal');
    expect(run(sup({ styleRef: { styleId: 'other', version: 1 } }))).toBe('stale_proposal');
    expect(run(sup({ diff: [{ path: 'cut.silenceMaxUs', from: 123, to: 2_000_000 }] }))).toBe('stale_proposal');
    expect(run(sup({ diff: [{ path: 'cut.fillerWords', from: ['يعني'], to: [] }] }))).toBe('stale_proposal');
    // الرسالة عربية
    try {
      execute(makeProject({ styleUpdateProposals: [sup({ styleRef: { styleId: 'default', version: 2 } })] }), 'style.updateProposal.accept', { proposalId: 'sup-1' }, makeCtx(), c());
    } catch (e) {
      expect((e as Error).message).toMatch(/[؀-ۿ]/);
    }
  });
});
