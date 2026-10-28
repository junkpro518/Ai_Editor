import { describe, it, expect } from 'vitest';
import { execute } from '../../../../src/core/commands/registry';
import { CommandError } from '../../../../src/core/commands/types';
import { History } from '../../../../src/core/history/snapshots';
import { makeProject, makeCtx } from '../../../helpers/project';

// export.mp4 (T051): أمر غير قابل للتراجع، لا يغيّر المشروع، ويطلب أثر `export-mp4` من الواجهة.

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

const confirmed = (history = new History()) => ({ actor: 'user' as const, history, confirmed: true });

describe('export.mp4', () => {
  it('يعيد أثر export-mp4 بالمسار نفسه ولا يغيّر المشروع ولا السجل', () => {
    const history = new History();
    const p = deepFreeze(makeProject());
    const r = execute(p, 'export.mp4', { outputPath: '/videos/tiny-5s-edited.mp4' }, makeCtx(), confirmed(history));
    expect(r.effects).toEqual([{ kind: 'export-mp4', outputPath: '/videos/tiny-5s-edited.mp4' }]);
    expect(r.entry).toBeUndefined();
    expect(history.entries()).toHaveLength(0);
    expect(r.description).toContain('tiny-5s-edited.mp4');
    // لا تغيير سوى updatedAt الذي يضبطه السجل
    const { updatedAt: _a, ...before } = p;
    const { updatedAt: _b, ...after } = r.project;
    expect(after).toEqual(before);
  });

  it('يقبل .MP4 بأي حالة أحرف ويرفض غيرها برمز invalid_output_path', () => {
    const p = makeProject();
    expect(codeOf(() => execute(p, 'export.mp4', { outputPath: '/x/out.MP4' }, makeCtx(), confirmed()))).toBe('no_error');
    expect(codeOf(() => execute(p, 'export.mp4', { outputPath: '/x/out.mov' }, makeCtx(), confirmed()))).toBe('invalid_output_path');
    expect(codeOf(() => execute(p, 'export.mp4', { outputPath: '/x/.mp4' }, makeCtx(), confirmed()))).toBe('invalid_output_path');
    expect(() => execute(p, 'export.mp4', { outputPath: '/x/out.mov' }, makeCtx(), confirmed())).toThrow(CommandError);
  });

  it('يرفض مشروعاً بلا لقطات برمز timeline_empty', () => {
    const p = makeProject({ timeline: { clips: [] } });
    expect(codeOf(() => execute(p, 'export.mp4', { outputPath: '/x/out.mp4' }, makeCtx(), confirmed()))).toBe('timeline_empty');
  });

  it('يحتاج تأكيداً ويرفض الفاعل agent (العقد)', () => {
    const p = makeProject();
    expect(codeOf(() => execute(p, 'export.mp4', { outputPath: '/x/out.mp4' }, makeCtx(), { actor: 'user', history: new History() }))).toBe(
      'confirmation_required',
    );
    expect(codeOf(() => execute(p, 'export.mp4', { outputPath: '/x/out.mp4' }, makeCtx(), { actor: 'agent', history: new History(), confirmed: true }))).toBe(
      'actor_not_allowed',
    );
  });
});
