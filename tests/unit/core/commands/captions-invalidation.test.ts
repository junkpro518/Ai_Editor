import { describe, expect, it } from 'vitest';
import { withCaptions } from '../../../../src/core/captions/derive';
import { execute } from '../../../../src/core/commands/registry';
import type { ProjectDocument, Proposal } from '../../../../src/core/contracts/types';
import { History } from '../../../../src/core/history/snapshots';
import { makeCtx, makeProject, makeTranscript, FIXED_NOW } from '../../../helpers/project';

// قاعدة الإبطال (data-model §1.10): كل أمر يغيّر التايم لاين يعيد اشتقاق captions.cues داخل تنفيذه.
// القياس هنا احتياطي (بلا DOM) — المستطيلات تقريبية والاختبار عن التوقيت والربط لا عن البكسلات.

function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o as object)) deepFreeze(v);
  }
  return o;
}
const user = (history = new History(), confirmed?: boolean) => ({ actor: 'user' as const, history, confirmed });

const transcript = makeTranscript([
  ['السلام', 100_000, 400_000],
  ['عليكم', 600_000, 900_000],
  ['اليوم', 1_100_000, 1_400_000],
  ['نشرح', 1_600_000, 1_900_000],
  ['الدرس', 2_100_000, 2_400_000],
  ['تمام', 2_600_000, 2_900_000],
]);

function project30(extra: Partial<ProjectDocument> = {}): ProjectDocument {
  const base = makeProject();
  const p = makeProject({
    source: { ...base.source, fps: { num: 30, den: 1 }, frameCount: 150, durationUs: 5_000_000 },
    timeline: { clips: [{ id: 'clip-1', sourceId: 'src-1', inFrame: 0, outFrame: 150, timelineStartFrame: 0 }] },
    transcript,
    captions: { enabled: true, cues: [] },
    ...extra,
  });
  return withCaptions(p, makeCtx());
}

const spans = (p: ProjectDocument) => p.captions.cues.map((c) => [c.id, c.startFrame, c.endFrame]);

describe('إبطال الكابشن في أوامر اللقطات', () => {
  it('clip.split عند إطار يعيد الاشتقاق: الكابشن بعد القسمة لا يعبر الحدّ ويبقى صالحاً', () => {
    const p = deepFreeze(project30());
    expect(p.captions.cues).toHaveLength(6);
    // القسمة عند 40 (داخل كلمة «اليوم» [33,42)): كلمة تمتد عبر لقطتين تُنسب للقطة الأكبر تداخلاً (الأولى)
    const r = execute(p, 'clip.split', { clipId: 'clip-1', atFrame: 40 }, makeCtx(), user());
    expect(r.project.captions.cues.length).toBe(6);
    expect(spans(r.project).slice(0, 3)).toEqual([
      ['cue:w1', 3, 18],
      ['cue:w2', 18, 33],
      ['cue:w3', 33, 40], // مقصوصة على حدّ اللقطة الأولى
    ]);
    expect(r.project.captions.cues[3]!.wordIds).toEqual(['w4', 'w5', 'w6']);
  });

  it('clip.delete يحذف كابشن اللقطة المحذوفة ويزحف الباقي؛ clip.move يعيد الترتيب؛ clip.trim يقصّ', () => {
    const split = execute(project30(), 'clip.split', { clipId: 'clip-1', atFrame: 45 }, makeCtx(), user()).project;
    const [first, second] = split.timeline.clips as [ProjectDocument['timeline']['clips'][number], ProjectDocument['timeline']['clips'][number]];

    const deleted = execute(deepFreeze(split), 'clip.delete', { clipId: first.id }, makeCtx(), user()).project;
    expect(deleted.captions.cues.map((c) => c.id)).toEqual(['cue:w4', 'cue:w5', 'cue:w6']);
    expect(deleted.captions.cues[0]).toMatchObject({ startFrame: 3, endFrame: 18 }); // 48−45

    const moved = execute(deepFreeze(split), 'clip.move', { clipId: second.id, toIndex: 0 }, makeCtx(), user()).project;
    expect(moved.captions.cues.map((c) => c.id)).toEqual(['cue:w4', 'cue:w5', 'cue:w6', 'cue:w1', 'cue:w2', 'cue:w3']);
    for (let i = 1; i < moved.captions.cues.length; i++) expect(moved.captions.cues[i]!.startFrame).toBeGreaterThanOrEqual(moved.captions.cues[i - 1]!.endFrame);

    const trimmed = execute(deepFreeze(split), 'clip.trim', { clipId: first.id, inFrame: 20 }, makeCtx(), user()).project;
    expect(trimmed.captions.cues.map((c) => c.id)).toEqual(['cue:w2', 'cue:w3', 'cue:w4', 'cue:w5', 'cue:w6']); // w1 [3,12) ضاعت
    expect(trimmed.captions.cues[0]).toMatchObject({ startFrame: 0, endFrame: 13 }); // w2 [18,33) − 20 → [0,13)
  });

  it('proposal.apply يسقط كلمات المدى المقصوص ويعيد الاشتقاق؛ التراجع يعيد الكابشن القديم', () => {
    const items: Proposal['items'] = [{ id: 'i1', startUs: 500_000, endUs: 1_700_000, text: '', reason: 'silence', ruleId: 'cut.silenceMaxUs', state: 'proposed' }];
    const proposal: Proposal = { id: 'prop-1', createdAt: FIXED_NOW, styleRef: { styleId: 'default', version: 1 }, items, totals: { byReason: { silence: 1, repeat: 0, abandoned: 0, filler: 0 }, savedUs: 1_200_000 }, state: 'draft', localOnly: true };
    const p = deepFreeze(project30({ proposals: [proposal] }));
    const history = new History();
    const r = execute(p, 'proposal.apply', { proposalId: 'prop-1' }, makeCtx(), user(history, true));
    expect(r.project.timeline.clips.map((c) => [c.inFrame, c.outFrame])).toEqual([
      [0, 15],
      [51, 150],
    ]);
    expect(r.project.captions.cues.map((c) => c.id)).toEqual(['cue:w1', 'cue:w4', 'cue:w5', 'cue:w6']);
    const undone = execute(r.project, 'history.undo', {}, makeCtx(), user(history));
    expect(undone.project.captions.cues).toEqual(p.captions.cues);
  });

  it('إطفاء الكابشن يفرّغ cues (المسار الذي سيستعمله captions.toggle)', () => {
    const p = project30();
    const off = withCaptions({ ...p, captions: { ...p.captions, enabled: false } }, makeCtx());
    expect(off.captions.cues).toEqual([]);
    const on = withCaptions({ ...off, captions: { ...off.captions, enabled: true } }, makeCtx());
    expect(on.captions.cues).toEqual(p.captions.cues);
  });
});
