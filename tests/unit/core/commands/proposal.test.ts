import { describe, it, expect } from 'vitest';
import { execute } from '../../../../src/core/commands/registry';
import { validateProject } from '../../../../src/core/contracts/validate';
import { History } from '../../../../src/core/history/snapshots';
import type { Proposal, ProjectDocument } from '../../../../src/core/contracts/types';
import { makeProject, makeCtx, makeTranscript, FIXED_NOW } from '../../../helpers/project';

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

type Item = Proposal['items'][number];
const item = (id: string, startUs: number, endUs: number, p: Partial<Item> = {}): Item => ({
  id,
  startUs,
  endUs,
  text: p.text ?? '',
  reason: p.reason ?? 'silence',
  ruleId: p.ruleId ?? 'cut.silenceMaxUs',
  state: p.state ?? 'proposed',
  ...(p.blockedBy ? { blockedBy: p.blockedBy } : {}),
});

const proposal = (items: Item[], state: Proposal['state'] = 'draft'): Proposal => ({
  id: 'prop-1',
  createdAt: FIXED_NOW,
  styleRef: { styleId: 'default', version: 1 },
  items,
  totals: { byReason: { silence: 0, repeat: 0, abandoned: 0, filler: 0 }, savedUs: 0 },
  state,
  localOnly: true,
});

/** مشروع 30fps، 150 إطاراً (5 ثوانٍ)، لقطة واحدة؛ المقترح يُمرَّر مباشرة. */
const project30 = (items: Item[], extra: Partial<ProjectDocument> = {}): ProjectDocument => {
  const base = makeProject();
  return makeProject({
    source: { ...base.source, fps: { num: 30, den: 1 }, frameCount: 150, durationUs: 5_000_000 },
    timeline: { clips: [{ id: 'clip-1', sourceId: 'src-1', inFrame: 0, outFrame: 150, timelineStartFrame: 0 }] },
    proposals: [proposal(items)],
    ...extra,
  });
};

const transcript = makeTranscript([
  ['اليوم', 0, 1_000_000],
  ['بنتكلم', 2_000_000, 2_400_000], // صمت 1s قبلها
  ['يعني', 2_450_000, 2_700_000], // حشو
  ['كذا', 2_700_000, 5_000_000],
]);

describe('proposal.request', () => {
  it('بلا تفريغ → no_transcript ولا يُسجَّل', () => {
    const history = new History();
    expect(codeOf(() => execute(makeProject(), 'proposal.request', {}, makeCtx(), user(history)))).toBe('no_transcript');
    expect(history.entries()).toHaveLength(0);
  });

  it('يضيف مقترحاً draft من التفريغ والنمط المثبّت؛ غير قابل للتراجع؛ المدخل لا يتغير', () => {
    const history = new History();
    const input = deepFreeze(project30([], { transcript, proposals: [] }));
    const pristine = structuredClone(input);
    const r = execute(input, 'proposal.request', {}, makeCtx(), user(history));
    expect(input).toEqual(pristine);
    expect(r.entry).toBeUndefined();
    expect(history.entries()).toHaveLength(0);
    expect(r.project.proposals).toHaveLength(1);
    const p = r.project.proposals[0]!;
    expect(p).toMatchObject({ state: 'draft', localOnly: true, styleRef: input.style, createdAt: FIXED_NOW });
    expect(p.items.map((i) => [i.startUs, i.endUs, i.reason])).toEqual([
      [1_120_000, 1_880_000, 'silence'],
      [2_450_000, 2_700_000, 'filler'],
    ]);
    expect(p.totals).toEqual({ byReason: { silence: 1, repeat: 0, abandoned: 0, filler: 1 }, savedUs: 1_010_000 });
    expect(r.description).toBe('اقترح 2 قصّة');
    expect(() => validateProject(r.project)).not.toThrow();
  });
});

describe('proposal.exclude', () => {
  const items = [
    item('i1', 1_000_000, 2_000_000),
    item('i2', 3_000_000, 3_300_000, { reason: 'filler', ruleId: 'cut.fillerWords', text: 'يعني' }),
  ];

  it('يستثني البنود، يحوّل المقترح إلى reviewed، ويسجّل تصحيحاً لكل بند', () => {
    const history = new History();
    const input = deepFreeze(project30(items));
    const r = execute(input, 'proposal.exclude', { proposalId: 'prop-1', itemIds: ['i1', 'i2'] }, makeCtx(), user(history));
    const p = r.project.proposals[0]!;
    expect(p.state).toBe('reviewed');
    expect(p.items.map((i) => i.state)).toEqual(['excluded', 'excluded']);
    expect(p.totals).toEqual({ byReason: { silence: 0, repeat: 0, abandoned: 0, filler: 0 }, savedUs: 0 });
    expect(r.project.corrections).toEqual([
      { id: 'id-1', at: FIXED_NOW, actor: 'user', kind: 'exclude_item', proposalId: 'prop-1', itemId: 'i1', ruleId: 'cut.silenceMaxUs', reason: 'silence', quote: 'صمت' },
      { id: 'id-2', at: FIXED_NOW, actor: 'user', kind: 'exclude_item', proposalId: 'prop-1', itemId: 'i2', ruleId: 'cut.fillerWords', reason: 'filler', quote: 'يعني' },
    ]);
    expect(r.project.timeline).toEqual(input.timeline);
    expect(r.entry?.description).toBe(r.description);
    expect(history.entries()).toHaveLength(1);
  });

  it('مقترح أو بند غير موجود، أو بند ليس proposed، أو مقترح منتهٍ → أخطاء بأكواد ثابتة', () => {
    const base = project30(items);
    expect(codeOf(() => execute(base, 'proposal.exclude', { proposalId: 'nope', itemIds: ['i1'] }, makeCtx(), user()))).toBe('proposal_not_found');
    expect(codeOf(() => execute(base, 'proposal.exclude', { proposalId: 'prop-1', itemIds: ['zz'] }, makeCtx(), user()))).toBe('item_not_found');
    const excluded = project30([item('i1', 1_000_000, 2_000_000, { state: 'excluded' })]);
    expect(codeOf(() => execute(excluded, 'proposal.exclude', { proposalId: 'prop-1', itemIds: ['i1'] }, makeCtx(), user()))).toBe('item_not_proposed');
    const applied = project30([]);
    applied.proposals[0]!.state = 'applied';
    expect(codeOf(() => execute(applied, 'proposal.exclude', { proposalId: 'prop-1', itemIds: ['i1'] }, makeCtx(), user()))).toBe('proposal_not_reviewed');
  });

  it('التراجع عبر السجل يرجع المقترح والتصحيحات', () => {
    const history = new History();
    const input = project30(items);
    const r = execute(input, 'proposal.exclude', { proposalId: 'prop-1', itemIds: ['i1'] }, makeCtx(), user(history));
    const u = execute(r.project, 'history.undo', {}, makeCtx(), user(history));
    expect(u.project).toEqual(input);
  });
});

describe('proposal.apply', () => {
  it('المثال المرجعي: قص [1s, 2s) على 30fps → [0,30) و[60,150)', () => {
    const history = new History();
    const input = deepFreeze(project30([item('i1', 1_000_000, 2_000_000)]));
    const pristine = structuredClone(input);
    const r = execute(input, 'proposal.apply', { proposalId: 'prop-1' }, makeCtx(), user(history, true));
    expect(input).toEqual(pristine);
    expect(r.project.timeline.clips.map((c) => [c.inFrame, c.outFrame, c.timelineStartFrame])).toEqual([
      [0, 30, 0],
      [60, 150, 30],
    ]);
    const p = r.project.proposals[0]!;
    expect(p.state).toBe('applied');
    expect(p.items[0]?.state).toBe('applied');
    expect(p.totals).toEqual({ byReason: { silence: 1, repeat: 0, abandoned: 0, filler: 0 }, savedUs: 1_000_000 });
    expect(r.project.corrections).toEqual([]);
    expect(r.effects).toBeUndefined();
    expect(history.entries()).toHaveLength(1);
    expect(() => validateProject(r.project)).not.toThrow();
  });

  it('يطبّق غير المستثنى وغير المحظور فقط؛ المحظور يبقى blocked', () => {
    const items = [
      item('i1', 0, 1_000_000, { state: 'excluded' }),
      item('i2', 1_000_000, 2_000_000),
      item('i3', 3_000_000, 4_000_000, { state: 'blocked', blockedBy: 'cut.minClipUs' }),
    ];
    const r = execute(project30(items), 'proposal.apply', { proposalId: 'prop-1' }, makeCtx(), user(new History(), true));
    expect(r.project.timeline.clips.map((c) => [c.inFrame, c.outFrame, c.timelineStartFrame])).toEqual([
      [0, 30, 0],
      [60, 150, 30],
    ]);
    expect(r.project.proposals[0]!.items.map((i) => i.state)).toEqual(['excluded', 'applied', 'blocked']);
  });

  it('يعمل على لقطات متعددة وبند يعبر حدّ لقطة ويحذف لقطة كاملة', () => {
    const p = project30([item('i1', 1_000_000, 3_500_000)]);
    p.timeline.clips = [
      { id: 'a', sourceId: 'src-1', inFrame: 0, outFrame: 60, timelineStartFrame: 0 },
      { id: 'b', sourceId: 'src-1', inFrame: 60, outFrame: 90, timelineStartFrame: 60 },
      { id: 'c', sourceId: 'src-1', inFrame: 90, outFrame: 120, timelineStartFrame: 90 },
      { id: 'd', sourceId: 'src-1', inFrame: 120, outFrame: 150, timelineStartFrame: 120 },
    ];
    // القص [30, 105): a→[0,30)، b تُحذف كلها، c→[105,120)، d لا تُمسّ
    const r = execute(p, 'proposal.apply', { proposalId: 'prop-1' }, makeCtx(), user(new History(), true));
    expect(r.project.timeline.clips.map((c) => [c.inFrame, c.outFrame, c.timelineStartFrame])).toEqual([
      [0, 30, 0],
      [105, 120, 30],
      [120, 150, 45],
    ]);
    // اللقطة غير الملموسة تحتفظ بمعرّفها؛ القطع الناتجة عن لقطة ملموسة تأخذ معرّفات جديدة
    expect(r.project.timeline.clips.map((c) => c.id)).toEqual(['id-1', 'id-2', 'd']);
  });

  it('بند أقصر من إطار واحد لا يقص شيئاً ولا يكسر اللقطة', () => {
    const r = execute(project30([item('i1', 1_000_000, 1_020_000)]), 'proposal.apply', { proposalId: 'prop-1' }, makeCtx(), user(new History(), true));
    expect(r.project.timeline.clips).toEqual([{ id: 'clip-1', sourceId: 'src-1', inFrame: 0, outFrame: 150, timelineStartFrame: 0 }]);
    expect(r.project.proposals[0]!.items[0]?.state).toBe('applied');
  });

  it('إعادة التحقق بالإطارات: بند يترك لقطة كلام أقصر من minClipUs يُحظر عند التطبيق؛ وشظية بلا كلام تُبتلع', () => {
    // 9 إطارات متبقية في الذيل [141,150) < 15 إطاراً (500ms)
    const withSpeech = project30([item('i1', 1_000_000, 4_700_000)], {
      transcript: makeTranscript([
        ['ا', 0, 1_000_000],
        ['ب', 4_750_000, 5_000_000],
      ]),
    });
    const r1 = execute(withSpeech, 'proposal.apply', { proposalId: 'prop-1' }, makeCtx(), user(new History(), true));
    expect(r1.project.timeline.clips.map((c) => [c.inFrame, c.outFrame])).toEqual([[0, 150]]);
    expect(r1.project.proposals[0]!.items[0]).toMatchObject({ state: 'blocked', blockedBy: 'cut.minClipUs' });
    expect(r1.project.proposals[0]!.state).toBe('applied');

    const silentTail = project30([item('i1', 1_000_000, 4_700_000)], {
      transcript: makeTranscript([['ا', 0, 1_000_000]], { durationUs: 5_000_000 }),
    });
    const r2 = execute(silentTail, 'proposal.apply', { proposalId: 'prop-1' }, makeCtx(), user(new History(), true));
    expect(r2.project.timeline.clips.map((c) => [c.inFrame, c.outFrame])).toEqual([[0, 30]]);
    expect(r2.project.proposals[0]!.items[0]?.state).toBe('applied');
  });

  it('استثناء الكل → لا تغيير في اللقطات وتصحيح exclude_all واحد', () => {
    const items = [item('i1', 1_000_000, 2_000_000, { state: 'excluded' }), item('i2', 3_000_000, 3_500_000, { state: 'excluded' })];
    const input = project30(items);
    const r = execute(input, 'proposal.apply', { proposalId: 'prop-1' }, makeCtx(), user(new History(), true));
    expect(r.project.timeline).toEqual(input.timeline);
    expect(r.project.corrections).toEqual([{ id: 'id-1', at: FIXED_NOW, actor: 'user', kind: 'exclude_all', proposalId: 'prop-1', quote: 'استثنى كل بنود المقترح' }]);
    expect(r.project.proposals[0]!.state).toBe('applied');
  });

  it('≥ repeatedRejectionThreshold استثناءات بالسبب نفسه → StyleUpdateProposal pending مُلحَق + أثر style-update-proposed (وإلا لا شيء)', () => {
    // الاستثناء عبر الأمر حتى تُسجَّل التصحيحات التي يُبنى عليها الاقتراح (FR-006/FR-011)
    const items = [
      item('i1', 500_000, 700_000, { reason: 'filler', ruleId: 'cut.fillerWords', text: 'يعني' }),
      item('i2', 1_500_000, 1_700_000, { reason: 'filler', ruleId: 'cut.fillerWords', text: 'يعني' }),
      item('i3', 2_500_000, 2_700_000, { reason: 'filler', ruleId: 'cut.fillerWords', text: 'اه' }),
      item('i4', 3_500_000, 4_000_000),
    ];
    const ctx = makeCtx();
    const reviewed3 = execute(project30(items), 'proposal.exclude', { proposalId: 'prop-1', itemIds: ['i1', 'i2', 'i3'] }, ctx, user()).project;
    const r3 = execute(reviewed3, 'proposal.apply', { proposalId: 'prop-1' }, ctx, user(new History(), true));
    const sup = r3.project.styleUpdateProposals[0]!;
    expect(r3.effects).toEqual([{ kind: 'style-update-proposed', proposalId: sup.id }]);
    expect(sup).toMatchObject({
      state: 'pending',
      styleRef: { styleId: 'default', version: 1 },
      trigger: { kind: 'repeated_rejection', reason: 'filler', count: 3, correctionIds: ['id-1', 'id-2', 'id-3'] },
      diff: [{ path: 'cut.fillerWords' }],
    });
    expect(sup.newPrecedents).toHaveLength(3);
    expect(r3.project.timeline.clips.map((c) => [c.inFrame, c.outFrame])).toEqual([[0, 105], [120, 150]]);

    const reviewed2 = execute(project30(items), 'proposal.exclude', { proposalId: 'prop-1', itemIds: ['i2', 'i3'] }, makeCtx(), user()).project;
    const r2 = execute(reviewed2, 'proposal.apply', { proposalId: 'prop-1' }, makeCtx(), user(new History(), true));
    expect(r2.effects).toBeUndefined();
    expect(r2.project.styleUpdateProposals).toEqual([]);
  });

  it('حالة غير مناسبة → proposal_not_reviewed؛ غير موجود → proposal_not_found', () => {
    const applied = project30([]);
    applied.proposals[0]!.state = 'applied';
    expect(codeOf(() => execute(applied, 'proposal.apply', { proposalId: 'prop-1' }, makeCtx(), user(new History(), true)))).toBe('proposal_not_reviewed');
    expect(codeOf(() => execute(project30([]), 'proposal.apply', { proposalId: 'x' }, makeCtx(), user(new History(), true)))).toBe('proposal_not_found');
  });

  it('التراجع عبر السجل يرجع اللقطات كما كانت قبل التطبيق', () => {
    const history = new History();
    const input = project30([item('i1', 1_000_000, 2_000_000)]);
    const r = execute(input, 'proposal.apply', { proposalId: 'prop-1' }, makeCtx(), user(history, true));
    expect(r.project.timeline.clips).toHaveLength(2);
    const u = execute(r.project, 'history.undo', {}, makeCtx(), user(history));
    expect(u.project).toEqual(input);
  });
});

describe('proposal.discard', () => {
  it('يحوّل الحالة إلى discarded بلا تغيير في اللقطات؛ المطبَّق لا يُلغى', () => {
    const history = new History();
    const input = deepFreeze(project30([item('i1', 1_000_000, 2_000_000)]));
    const r = execute(input, 'proposal.discard', { proposalId: 'prop-1' }, makeCtx(), user(history));
    expect(r.project.proposals[0]!.state).toBe('discarded');
    expect(r.project.timeline).toEqual(input.timeline);
    expect(history.entries()).toHaveLength(1);
    const applied = project30([]);
    applied.proposals[0]!.state = 'applied';
    expect(codeOf(() => execute(applied, 'proposal.discard', { proposalId: 'prop-1' }, makeCtx(), user()))).toBe('proposal_not_reviewed');
  });
});
