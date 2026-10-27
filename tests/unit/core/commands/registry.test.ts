import { describe, it, expect } from 'vitest';
import schema from '../../../../src/core/contracts/schemas/commands.schema.json';
import { commands } from '../../../../src/core/commands/index';
import { execute } from '../../../../src/core/commands/registry';
import { CommandError } from '../../../../src/core/commands/types';
import { ContractError, validateProject } from '../../../../src/core/contracts/validate';
import { History } from '../../../../src/core/history/snapshots';
import { makeProject, makeCtx, FIXED_NOW } from '../../../helpers/project';
import type { ProjectDocument } from '../../../../src/core/contracts/types';

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
const split = { clipId: 'clip-1', atFrame: 100 };

describe('سجل الأوامر الموحد', () => {
  it('كل أمر في commands.schema.json له تنفيذ، ولا زيادة', () => {
    const names = schema.commands.map((c) => c.name).sort();
    expect(names).toHaveLength(20);
    expect(Object.keys(commands).sort()).toEqual(names);
    for (const n of names) expect(typeof commands[n as keyof typeof commands]).toBe('function');
  });

  it('يرفض المعاملات غير الصالحة قبل أخذ أي لقطة', () => {
    const history = new History();
    const p = makeProject();
    expect(() => execute(p, 'clip.split', { clipId: 'clip-1', atFrame: -1 }, makeCtx(), user(history))).toThrow(ContractError);
    expect(() =>
      execute(p, 'clip.split', { clipId: 'clip-1' } as unknown as typeof split, makeCtx(), user(history)),
    ).toThrow(ContractError);
    expect(history.entries()).toHaveLength(0);
  });

  it('الأوامر الموسومة confirm تحتاج confirmed: true', () => {
    const history = new History();
    const p = makeProject();
    expect(codeOf(() => execute(p, 'proposal.apply', { proposalId: 'x' }, makeCtx(), user(history)))).toBe('confirmation_required');
    expect(history.entries()).toHaveLength(0);
    // مع التأكيد يصل إلى التنفيذ (هيكل المرحلة 2 يرمي not_implemented)
    expect(codeOf(() => execute(p, 'proposal.apply', { proposalId: 'x' }, makeCtx(), { ...user(history), confirmed: true }))).toBe(
      'not_implemented',
    );
  });

  it('الفاعل غير المسموح يُرفض', () => {
    const history = new History();
    expect(codeOf(() => execute(makeProject(), 'proposal.apply', { proposalId: 'x' }, makeCtx(), { actor: 'agent', history, confirmed: true }))).toBe(
      'actor_not_allowed',
    );
    expect(history.entries()).toHaveLength(0);
  });

  it('clip.split: لقطة واحدة قبل التنفيذ، المدخل لا يتغير، الناتج صالح، updatedAt من ctx', () => {
    const history = new History();
    const input = deepFreeze(makeProject({ updatedAt: '2020-01-01T00:00:00.000Z' }));
    const pristine = structuredClone(input);
    const ctx = makeCtx();

    const r = execute(input, 'clip.split', split, ctx, user(history));

    expect(input).toEqual(pristine);
    expect(history.entries()).toHaveLength(1);
    expect(history.entries()[0]?.snapshot).toEqual(pristine);
    expect(history.entries()[0]).toMatchObject({ seq: 1, at: FIXED_NOW, actor: 'user', command: { name: 'clip.split', params: split } });
    expect(r.entry).toBe(history.entries()[0]);
    expect(r.description).toBe('قسم اللقطة عند الإطار 100');
    expect(() => validateProject(r.project)).not.toThrow();
    expect(r.project.updatedAt).toBe(FIXED_NOW);
    expect(r.project.timeline.clips).toEqual([
      { id: 'id-1', sourceId: 'src-1', inFrame: 0, outFrame: 100, timelineStartFrame: 0 },
      { id: 'id-2', sourceId: 'src-1', inFrame: 100, outFrame: 300, timelineStartFrame: 100 },
    ]);
  });

  it('clip.split: أخطاء clip_not_found وsplit_outside_clip بلا لقطة', () => {
    const history = new History();
    const p = makeProject();
    expect(codeOf(() => execute(p, 'clip.split', { clipId: 'nope', atFrame: 10 }, makeCtx(), user(history)))).toBe('clip_not_found');
    expect(codeOf(() => execute(p, 'clip.split', { clipId: 'clip-1', atFrame: 0 }, makeCtx(), user(history)))).toBe('split_outside_clip');
    expect(codeOf(() => execute(p, 'clip.split', { clipId: 'clip-1', atFrame: 300 }, makeCtx(), user(history)))).toBe('split_outside_clip');
    expect(history.entries()).toHaveLength(0);
  });

  it('نقي: نفس المدخل والسياق = نفس المخرج', () => {
    const p = deepFreeze(makeProject());
    const a = execute(p, 'clip.split', split, makeCtx(), user());
    const b = execute(p, 'clip.split', split, makeCtx(), user());
    expect(a.project).toEqual(b.project);
    expect(a.description).toBe(b.description);
  });

  it('history.undo يستعيد ما قبل القسم وhistory.redo يعيده، وأمر جديد يمسح الإعادة', () => {
    const history = new History();
    const input = deepFreeze(makeProject());
    const ctx = makeCtx();
    const afterSplit = execute(input, 'clip.split', split, ctx, user(history)).project;

    const undone = execute(afterSplit, 'history.undo', {}, ctx, user(history));
    expect(undone.project).toEqual(input);
    expect(undone.entry?.seq).toBe(1);
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(true);

    const redone = execute(undone.project, 'history.redo', {}, ctx, user(history));
    expect(redone.project).toEqual(afterSplit);
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);

    execute(redone.project, 'history.undo', {}, ctx, user(history));
    const fresh: ProjectDocument = execute(input, 'clip.split', { clipId: 'clip-1', atFrame: 50 }, ctx, user(history)).project;
    expect(fresh.timeline.clips).toHaveLength(2);
    expect(history.canRedo()).toBe(false);
    expect(history.entries()).toHaveLength(1);
  });

  it('history.undo على سجل فارغ يرمي nothing_to_undo', () => {
    expect(codeOf(() => execute(makeProject(), 'history.undo', {}, makeCtx(), user()))).toBe('nothing_to_undo');
    expect(codeOf(() => execute(makeProject(), 'history.redo', {}, makeCtx(), user()))).toBe('nothing_to_redo');
  });

  it('تراجع إلى لقطة فاسدة من القرص يرمي ContractError (مراجعة phase-2 #4)', () => {
    const history = History.fromJSON({
      undo: [{ seq: 1, at: FIXED_NOW, actor: 'user', command: { name: 'clip.split', params: {} }, description: 'x', snapshot: {} as ProjectDocument }],
      redo: [],
      nextSeq: 2,
    });
    expect(() => execute(makeProject(), 'history.undo', {}, makeCtx(), { actor: 'user', history })).toThrow(ContractError);
  });

  it('CommandError يحمل code ورسالة عربية', () => {
    const e = new CommandError('x', 'رسالة');
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe('x');
    expect(e.message).toBe('رسالة');
  });
});
