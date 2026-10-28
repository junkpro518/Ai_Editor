import { describe, it, expect } from 'vitest';
import { execute } from '../../../../src/core/commands/registry';
import { CommandError } from '../../../../src/core/commands/types';
import { checkProjectInvariants } from '../../../../src/core/contracts/validate';
import { History } from '../../../../src/core/history/snapshots';
import { usToFrame } from '../../../../src/core/time';
import { clipAtTimelineFrame, recomputeStarts, timelineToSource } from '../../../../src/core/timeline/ops';
import { clipWarnings } from '../../../../src/core/timeline/warnings';
import { makeProject, makeCtx, makeStyle } from '../../../helpers/project';
import type { ProjectDocument, StyleVersion } from '../../../../src/core/contracts/types';
import type { CommandContext } from '../../../../src/core/commands/types';

type Clip = ProjectDocument['timeline']['clips'][number];

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

const user = (history = new History()) => ({ actor: 'user' as const, history });

/** ثلاث لقطات متجاورة: [0,100) [100,200) [200,300) */
function threeClips(): ProjectDocument {
  const clips: Clip[] = [
    { id: 'c1', sourceId: 'src-1', inFrame: 0, outFrame: 100, timelineStartFrame: 0 },
    { id: 'c2', sourceId: 'src-1', inFrame: 100, outFrame: 200, timelineStartFrame: 100 },
    { id: 'c3', sourceId: 'src-1', inFrame: 200, outFrame: 300, timelineStartFrame: 200 },
  ];
  return makeProject({ timeline: { clips } });
}

function preferenceStyle(): StyleVersion {
  const s = makeStyle();
  return { ...s, cut: { ...s.cut, minClipUs: { ...s.cut.minClipUs, mode: 'preference' } } };
}

const FPS = makeProject().source.fps; // 30000/1001
const MIN_FRAMES = usToFrame(makeStyle().cut.minClipUs.value as number, FPS);

describe('timeline/ops', () => {
  it('recomputeStarts يجعل اللقطات متجاورة بلا فجوات', () => {
    const clips: Clip[] = [
      { id: 'a', sourceId: 's', inFrame: 50, outFrame: 80, timelineStartFrame: 999 },
      { id: 'b', sourceId: 's', inFrame: 0, outFrame: 10, timelineStartFrame: 999 },
    ];
    expect(recomputeStarts(clips).map((c) => c.timelineStartFrame)).toEqual([0, 30]);
  });

  it('clipAtTimelineFrame و timelineToSource يتجاوزان الفجوات', () => {
    const clips: Clip[] = [
      { id: 'a', sourceId: 's', inFrame: 10, outFrame: 20, timelineStartFrame: 0 },
      { id: 'b', sourceId: 's', inFrame: 50, outFrame: 60, timelineStartFrame: 10 },
    ];
    expect(clipAtTimelineFrame(clips, 0)).toEqual({ clip: clips[0], index: 0, offset: 0 });
    expect(clipAtTimelineFrame(clips, 9)).toMatchObject({ index: 0, offset: 9 });
    expect(clipAtTimelineFrame(clips, 10)).toMatchObject({ index: 1, offset: 0 });
    expect(clipAtTimelineFrame(clips, 20)).toBeNull();
    expect(timelineToSource(clips, 0)).toBe(10);
    expect(timelineToSource(clips, 9)).toBe(19);
    expect(timelineToSource(clips, 10)).toBe(50);
    expect(timelineToSource(clips, 19)).toBe(59);
    expect(timelineToSource(clips, 20)).toBeNull();
    expect(timelineToSource(clips, -1)).toBeNull();
  });
});

describe('timeline/warnings', () => {
  it('لقطة أقصر من minClipUs: below_min_clip + violates_mandatory_rule عندما القاعدة إلزامية', () => {
    const short: Clip = { id: 'a', sourceId: 's', inFrame: 0, outFrame: MIN_FRAMES - 1, timelineStartFrame: 0 };
    expect(clipWarnings(short, makeStyle(), FPS)).toEqual(['below_min_clip', 'violates_mandatory_rule']);
    expect(clipWarnings(short, preferenceStyle(), FPS)).toEqual(['below_min_clip']);
    const ok: Clip = { ...short, outFrame: MIN_FRAMES };
    expect(clipWarnings(ok, makeStyle(), FPS)).toEqual([]);
  });
});

describe('clip.split', () => {
  it('يقسم اللقطة ويعيد حساب البدايات', () => {
    const r = execute(deepFreeze(threeClips()), 'clip.split', { clipId: 'c2', atFrame: 150 }, makeCtx(), user());
    const clips = r.project.timeline.clips;
    expect(clips.map((c) => [c.inFrame, c.outFrame, c.timelineStartFrame])).toEqual([
      [0, 100, 0],
      [100, 150, 100],
      [150, 200, 150],
      [200, 300, 200],
    ]);
    expect(checkProjectInvariants(r.project)).toEqual([]);
  });
});

describe('clip.trim', () => {
  it('يقصّ الحدّين ويعيد حساب بدايات اللقطات التالية', () => {
    const r = execute(deepFreeze(threeClips()), 'clip.trim', { clipId: 'c2', inFrame: 120, outFrame: 180 }, makeCtx(), user());
    expect(r.project.timeline.clips.map((c) => [c.inFrame, c.outFrame, c.timelineStartFrame])).toEqual([
      [0, 100, 0],
      [120, 180, 100],
      [200, 300, 160],
    ]);
    expect(checkProjectInvariants(r.project)).toEqual([]);
    expect(r.warnings ?? []).toEqual([]);
    expect(r.project.corrections).toEqual([]);
    expect(r.description).toContain('قصّ');
  });

  it('حدّ واحد فقط يكفي (inFrame أو outFrame)', () => {
    const r = execute(threeClips(), 'clip.trim', { clipId: 'c1', outFrame: 50 }, makeCtx(), user());
    expect(r.project.timeline.clips[0]).toMatchObject({ inFrame: 0, outFrame: 50 });
    expect(r.project.timeline.clips[1]!.timelineStartFrame).toBe(50);
  });

  it('يرفض الحدود خارج المصدر أو out ≤ in', () => {
    const p = threeClips();
    expect(codeOf(() => execute(p, 'clip.trim', { clipId: 'c3', outFrame: 301 }, makeCtx(), user()))).toBe('trim_out_of_range');
    expect(codeOf(() => execute(p, 'clip.trim', { clipId: 'c1', inFrame: -1 }, makeCtx(), user()))).toBe('trim_out_of_range');
    expect(codeOf(() => execute(p, 'clip.trim', { clipId: 'c2', inFrame: 150, outFrame: 150 }, makeCtx(), user()))).toBe('trim_out_of_range');
    expect(codeOf(() => execute(p, 'clip.trim', { clipId: 'nope', inFrame: 0 }, makeCtx(), user()))).toBe('clip_not_found');
  });

  it('لقطة أقصر من minClipUs (إلزامية): يُسمح مع تحذيرَين وتسجيل correction.manual_edit', () => {
    const ctx = makeCtx();
    const r = execute(deepFreeze(threeClips()), 'clip.trim', { clipId: 'c2', inFrame: 100, outFrame: 100 + MIN_FRAMES - 1 }, ctx, user());
    expect(r.warnings).toEqual(['below_min_clip', 'violates_mandatory_rule']);
    expect(r.project.corrections).toHaveLength(1);
    expect(r.project.corrections[0]).toMatchObject({
      actor: 'user',
      kind: 'manual_edit',
      violates: 'cut.minClipUs',
      ruleId: 'cut.minClipUs',
      quote: 'لقطة 2 أقصر من الحد',
    });
    expect(checkProjectInvariants(r.project)).toEqual([]);
  });

  it('القاعدة اختيارية: تحذير below_min_clip فقط بلا تسجيل', () => {
    const ctx: CommandContext = { ...makeCtx(), style: preferenceStyle() };
    const r = execute(threeClips(), 'clip.trim', { clipId: 'c2', outFrame: 100 + MIN_FRAMES - 1 }, ctx, user());
    expect(r.warnings).toEqual(['below_min_clip']);
    expect(r.project.corrections).toEqual([]);
  });

  it('الطول = الحد بالضبط لا يحذّر', () => {
    const r = execute(threeClips(), 'clip.trim', { clipId: 'c2', outFrame: 100 + MIN_FRAMES }, makeCtx(), user());
    expect(r.warnings ?? []).toEqual([]);
  });
});

describe('clip.move', () => {
  it('يعيد ترتيب اللقطات ويعيد حساب البدايات', () => {
    const r = execute(deepFreeze(threeClips()), 'clip.move', { clipId: 'c3', toIndex: 0 }, makeCtx(), user());
    expect(r.project.timeline.clips.map((c) => [c.id, c.timelineStartFrame])).toEqual([
      ['c3', 0],
      ['c1', 100],
      ['c2', 200],
    ]);
    expect(checkProjectInvariants(r.project)).toEqual([]);
    const r2 = execute(r.project, 'clip.move', { clipId: 'c3', toIndex: 2 }, makeCtx(), user());
    expect(r2.project.timeline.clips.map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
  });

  it('يرفض فهرساً خارج النطاق', () => {
    expect(codeOf(() => execute(threeClips(), 'clip.move', { clipId: 'c1', toIndex: 3 }, makeCtx(), user()))).toBe('index_out_of_range');
    expect(codeOf(() => execute(threeClips(), 'clip.move', { clipId: 'zz', toIndex: 0 }, makeCtx(), user()))).toBe('clip_not_found');
  });
});

describe('clip.delete', () => {
  it('يحذف اللقطة ويضمّ ما بعدها', () => {
    const r = execute(deepFreeze(threeClips()), 'clip.delete', { clipId: 'c2' }, makeCtx(), user());
    expect(r.project.timeline.clips.map((c) => [c.id, c.inFrame, c.outFrame, c.timelineStartFrame])).toEqual([
      ['c1', 0, 100, 0],
      ['c3', 200, 300, 100],
    ]);
    expect(checkProjectInvariants(r.project)).toEqual([]);
  });

  it('يرفض حذف آخر لقطة في التايم لاين', () => {
    expect(codeOf(() => execute(makeProject(), 'clip.delete', { clipId: 'clip-1' }, makeCtx(), user()))).toBe('last_clip');
    expect(codeOf(() => execute(makeProject(), 'clip.delete', { clipId: 'zz' }, makeCtx(), user()))).toBe('clip_not_found');
  });
});

describe('سلسلة تعديلات مع التراجع', () => {
  it('split → trim → move → delete تبقى متجاورة، والتراجع يعيد كل خطوة', () => {
    const history = new History();
    const ctx = makeCtx();
    const p0 = deepFreeze(makeProject());
    const p1 = execute(p0, 'clip.split', { clipId: 'clip-1', atFrame: 100 }, ctx, user(history)).project;
    const [a, b] = p1.timeline.clips.map((c) => c.id);
    const p2 = execute(p1, 'clip.trim', { clipId: b!, inFrame: 150 }, ctx, user(history)).project;
    const p3 = execute(p2, 'clip.move', { clipId: b!, toIndex: 0 }, ctx, user(history)).project;
    const p4 = execute(p3, 'clip.delete', { clipId: a! }, ctx, user(history)).project;
    for (const p of [p1, p2, p3, p4]) expect(checkProjectInvariants(p)).toEqual([]);
    expect(p4.timeline.clips).toEqual([{ id: b, sourceId: 'src-1', inFrame: 150, outFrame: 300, timelineStartFrame: 0 }]);

    const u1 = execute(p4, 'history.undo', {}, ctx, user(history)).project;
    expect(u1.timeline.clips).toEqual(p3.timeline.clips);
    const u2 = execute(u1, 'history.undo', {}, ctx, user(history)).project;
    expect(u2.timeline.clips).toEqual(p2.timeline.clips);
    const u3 = execute(u2, 'history.undo', {}, ctx, user(history)).project;
    expect(u3.timeline.clips).toEqual(p1.timeline.clips);
    const u4 = execute(u3, 'history.undo', {}, ctx, user(history)).project;
    expect(u4.timeline.clips).toEqual(p0.timeline.clips);
    expect(() => execute(u4, 'history.undo', {}, ctx, user(history))).toThrow(CommandError);
  });
});
