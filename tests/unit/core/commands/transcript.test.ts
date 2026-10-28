import { describe, expect, it } from 'vitest';
import { execute } from '../../../../src/core/commands/registry';
import { validateProject } from '../../../../src/core/contracts/validate';
import type { ProjectDocument } from '../../../../src/core/contracts/types';
import { History } from '../../../../src/core/history/snapshots';
import { withCaptions } from '../../../../src/core/captions/derive';
import { makeCtx, makeProject, makeTranscript, FIXED_NOW } from '../../../helpers/project';

// T057 — transcript.fixWord يحفظ الأصل مرة واحدة ويعلّم correctedBy=user ويسجّل word_fix ويعيد اشتقاق الكابشن؛
// captions.toggle يرفض بلا تفريغ ويفرّغ/يشتق الكابشن. كلاهما قابل للتراجع عبر السجل.

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

const transcript = makeTranscript(
  [
    ['السلام', 100_000, 400_000],
    ['عليكم', 600_000, 900_000],
    ['اليوم', 1_100_000, 1_400_000],
    ['يعني', 1_600_000, 1_900_000, 0.45],
    ['الدرس', 2_100_000, 2_400_000],
    ['تمام', 2_600_000, 2_900_000],
  ],
  { segments: [[0, 1, 2], [3, 4, 5]] },
);

function project30(extra: Partial<ProjectDocument> = {}): ProjectDocument {
  const base = makeProject();
  return withCaptions(
    makeProject({
      source: { ...base.source, fps: { num: 30, den: 1 }, frameCount: 150, durationUs: 5_000_000 },
      timeline: { clips: [{ id: 'clip-1', sourceId: 'src-1', inFrame: 0, outFrame: 150, timelineStartFrame: 0 }] },
      transcript,
      captions: { enabled: true, cues: [] },
      ...extra,
    }),
    makeCtx(),
  );
}
const linesWith = (p: ProjectDocument, text: string) => p.captions.cues.filter((c) => c.lines.some((l) => l.split(' ').includes(text)));
const word = (p: ProjectDocument, id: string) => p.transcript!.words.find((w) => w.id === id)!;

describe('transcript.fixWord', () => {
  it('يحفظ original مرة واحدة، يعلّم correctedBy=user، يسجّل word_fix (قبل → بعد)، ويعيد اشتقاق الكابشن؛ المدخل لا يُمسّ', () => {
    const p = deepFreeze(project30());
    expect(linesWith(p, 'يعني')).toHaveLength(3); // مجموعة «يعني الدرس تمام»
    const r = execute(p, 'transcript.fixWord', { wordId: 'w4', text: 'أقصد' }, makeCtx(), user());

    expect(word(r.project, 'w4')).toMatchObject({ text: 'أقصد', original: 'يعني', correctedBy: 'user', confidence: 0.45 });
    expect(r.project.corrections).toEqual([
      expect.objectContaining({ id: 'id-1', at: FIXED_NOW, actor: 'user', kind: 'word_fix', quote: 'يعني → أقصد', before: 'يعني', after: 'أقصد' }),
    ]);
    expect(r.description).toBe('صحّح «يعني» إلى «أقصد»');
    // الكابشن أُعيد اشتقاقه بالنص الجديد وبالمعرّفات نفسها
    expect(linesWith(r.project, 'يعني')).toHaveLength(0);
    expect(linesWith(r.project, 'أقصد').map((c) => c.id)).toEqual(['cue:w4', 'cue:w5', 'cue:w6']);
    expect(r.project.captions.cues.map((c) => [c.startFrame, c.endFrame])).toEqual(p.captions.cues.map((c) => [c.startFrame, c.endFrame]));
    // نص الجملة يتبع الكلمة
    expect(r.project.transcript!.segments![1]!.text).toBe('أقصد الدرس تمام');
    expect(() => validateProject(r.project)).not.toThrow();
    expect(word(p, 'w4')).toMatchObject({ text: 'يعني' });
    expect(word(p, 'w4').original).toBeUndefined();
  });

  it('تصحيح ثانٍ يبقي الأصل الأول؛ التصحيح للأصل نفسه يسجَّل تصحيحاً أيضاً', () => {
    const history = new History();
    const first = execute(project30(), 'transcript.fixWord', { wordId: 'w4', text: 'أقصد' }, makeCtx(), user(history)).project;
    const second = execute(first, 'transcript.fixWord', { wordId: 'w4', text: 'يعني' }, makeCtx(), user(history)).project;
    expect(word(second, 'w4')).toMatchObject({ text: 'يعني', original: 'يعني', correctedBy: 'user' });
    expect(second.corrections.map((c) => c.quote)).toEqual(['يعني → أقصد', 'أقصد → يعني']);
    expect(linesWith(second, 'يعني')).toHaveLength(3);
  });

  it('التراجع عبر السجل يعيد التفريغ والكابشن والتصحيحات كما كانت', () => {
    const p = project30();
    const history = new History();
    const r = execute(p, 'transcript.fixWord', { wordId: 'w4', text: 'أقصد' }, makeCtx(), user(history));
    expect(r.entry?.command).toEqual({ name: 'transcript.fixWord', params: { wordId: 'w4', text: 'أقصد' } });
    const undone = execute(r.project, 'history.undo', {}, makeCtx(), user(history));
    expect(undone.project.transcript).toEqual(p.transcript);
    expect(undone.project.captions.cues).toEqual(p.captions.cues);
    expect(undone.project.corrections).toEqual([]);
  });

  it('يرفض: بلا تفريغ no_transcript، كلمة مجهولة word_not_found، نص فارغ أو بمسافة داخلية', () => {
    const noTranscript = makeProject();
    expect(codeOf(() => execute(noTranscript, 'transcript.fixWord', { wordId: 'w1', text: 'x' }, makeCtx(), user()))).toBe('no_transcript');
    expect(codeOf(() => execute(project30(), 'transcript.fixWord', { wordId: 'nope', text: 'x' }, makeCtx(), user()))).toBe('word_not_found');
    expect(codeOf(() => execute(project30(), 'transcript.fixWord', { wordId: 'w4', text: '' }, makeCtx(), user()))).toBe('schema');
    expect(codeOf(() => execute(project30(), 'transcript.fixWord', { wordId: 'w4', text: '   ' }, makeCtx(), user()))).toBe('invalid_word_text');
    // كلمة واحدة لا كلمتان: مستطيلات الكلمات في الكابشن تُفهرس بالمسافات
    expect(codeOf(() => execute(project30(), 'transcript.fixWord', { wordId: 'w4', text: 'يعني كذا' }, makeCtx(), user()))).toBe('invalid_word_text');
  });

  it('المسافات الطرفية تُشذَّب', () => {
    const r = execute(project30(), 'transcript.fixWord', { wordId: 'w4', text: ' أقصد ' }, makeCtx(), user());
    expect(word(r.project, 'w4').text).toBe('أقصد');
  });

  it('الكابشن مطفأ → لا اشتقاق (cues تبقى فارغة) لكن الكلمة تُصحَّح', () => {
    const off = project30({ captions: { enabled: false, cues: [] } });
    const r = execute(off, 'transcript.fixWord', { wordId: 'w4', text: 'أقصد' }, makeCtx(), user());
    expect(r.project.captions.cues).toEqual([]);
    expect(word(r.project, 'w4').text).toBe('أقصد');
  });
});

describe('captions.toggle', () => {
  it('بلا تفريغ → no_transcript (في الاتجاهين)', () => {
    const p = makeProject();
    expect(codeOf(() => execute(p, 'captions.toggle', { enabled: true }, makeCtx(), user()))).toBe('no_transcript');
    expect(codeOf(() => execute(p, 'captions.toggle', { enabled: false }, makeCtx(), user()))).toBe('no_transcript');
  });

  it('إطفاء يفرّغ cues، تشغيل يشتقها؛ قابل للتراجع والمدخل لا يُمسّ', () => {
    const on = deepFreeze(project30());
    expect(on.captions.cues.length).toBeGreaterThan(0);
    const history = new History();
    const off = execute(on, 'captions.toggle', { enabled: false }, makeCtx(), user(history));
    expect(off.project.captions).toEqual({ enabled: false, cues: [] });
    expect(off.description).toBe('أطفأ الكابشن');
    expect(on.captions.enabled).toBe(true);

    const back = execute(off.project, 'captions.toggle', { enabled: true }, makeCtx(), user(history));
    expect(back.project.captions).toEqual(on.captions);
    expect(back.description).toBe('فعّل الكابشن');

    const undone = execute(back.project, 'history.undo', {}, makeCtx(), user(history));
    expect(undone.project.captions).toEqual({ enabled: false, cues: [] });
    expect(() => validateProject(back.project)).not.toThrow();
  });

  it('مشروع مستورد بلا cues والكابشن مفعّل: التشغيل يشتقها من التفريغ الموجود', () => {
    const p = project30();
    const bare = { ...p, captions: { enabled: true, cues: [] } };
    const r = execute(bare, 'captions.toggle', { enabled: true }, makeCtx(), user());
    expect(r.project.captions.cues).toEqual(p.captions.cues);
  });
});
