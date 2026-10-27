import { describe, it, expect } from 'vitest';
import { History } from '../../../../src/core/history/snapshots';
import type { HistoryEntry } from '../../../../src/core/history/snapshots';
import { makeProject, FIXED_NOW } from '../../../helpers/project';

function entry(name: string, snapshot = makeProject()): Omit<HistoryEntry, 'seq'> {
  return { at: FIXED_NOW, actor: 'user', command: { name: 'clip.split', params: {} }, description: name, snapshot };
}

describe('History', () => {
  it('الحد الافتراضي 200 والتسلسل يبدأ من 1', () => {
    const h = new History();
    expect(h.limit).toBe(200);
    expect(h.push(entry('a')).seq).toBe(1);
    expect(h.push(entry('b')).seq).toBe(2);
  });

  it('يطوي الأقدم عند تجاوز الحد: 205 دفعة → 200 مدخل وأول seq محفوظ 6', () => {
    const h = new History();
    for (let i = 0; i < 205; i++) h.push(entry(`e${i}`));
    const entries = h.entries();
    expect(entries).toHaveLength(200);
    expect(entries[0]?.seq).toBe(6);
    expect(entries[199]?.seq).toBe(205);
  });

  it('undo يستعيد اللقطة ويدفع الحالة الحالية إلى الإعادة، وredo يعكس ذلك', () => {
    const h = new History({ limit: 10 });
    const before = makeProject({ name: 'قبل' });
    const after = makeProject({ name: 'بعد' });
    h.push(entry('split', before));
    expect(h.canUndo()).toBe(true);
    expect(h.canRedo()).toBe(false);

    const u = h.undo(after);
    expect(u?.project).toEqual(before);
    expect(u?.entry.seq).toBe(1);
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(true);
    expect(h.redoEntries()[0]?.snapshot).toEqual(after);

    const r = h.redo(before);
    expect(r?.project).toEqual(after);
    expect(r?.entry.seq).toBe(1);
    expect(h.canUndo()).toBe(true);
    expect(h.canRedo()).toBe(false);
    expect(h.entries()[0]?.snapshot).toEqual(before);
  });

  it('ترتيب التراجع: الأحدث أولاً', () => {
    const h = new History();
    h.push(entry('1', makeProject({ name: '1' })));
    h.push(entry('2', makeProject({ name: '2' })));
    expect(h.undo(makeProject({ name: '3' }))?.project.name).toBe('2');
    expect(h.undo(makeProject({ name: '2' }))?.project.name).toBe('1');
    expect(h.undo(makeProject())).toBeNull();
    expect(h.redo(makeProject({ name: '1' }))?.project.name).toBe('2');
    expect(h.redo(makeProject({ name: '2' }))?.project.name).toBe('3');
    expect(h.redo(makeProject())).toBeNull();
  });

  it('push بعد undo يمسح مكدس الإعادة', () => {
    const h = new History();
    h.push(entry('1'));
    h.undo(makeProject());
    expect(h.canRedo()).toBe(true);
    h.push(entry('2'));
    expect(h.canRedo()).toBe(false);
    expect(h.redoEntries()).toHaveLength(0);
  });

  it('toJSON/fromJSON يحفظان المكدسين والتسلسل', () => {
    const h = new History({ limit: 50 });
    h.push(entry('1', makeProject({ name: '1' })));
    h.push(entry('2', makeProject({ name: '2' })));
    h.undo(makeProject({ name: '3' }));
    const json = JSON.parse(JSON.stringify(h.toJSON())) as ReturnType<History['toJSON']>;
    const back = History.fromJSON(json, 50);
    expect(back.limit).toBe(50);
    expect(back.toJSON()).toEqual(h.toJSON());
    expect(back.push(entry('4')).seq).toBe(3);
  });
});
