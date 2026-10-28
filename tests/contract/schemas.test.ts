import { describe, expect, it } from 'vitest';
import {
  ContractError,
  checkProjectInvariants,
  commandSpecs,
  getCommandSpec,
  validateCommandParams,
  validateProject,
  validateStyle,
  validateTranscript,
} from '../../src/core/contracts';
import type { ProjectDocument, StyleVersion, Transcript } from '../../src/core/contracts';
import projectFixture from './fixtures/project.valid.json';
import transcriptFixture from './fixtures/transcript.valid.json';
import defaultStyle from '../../resources/styles/default-v1.json';

const project = (): ProjectDocument => structuredClone(projectFixture) as unknown as ProjectDocument;
const transcript = (): Transcript => structuredClone(transcriptFixture) as unknown as Transcript;
const style = (): StyleVersion => structuredClone(defaultStyle) as unknown as StyleVersion;

function expectContractError(fn: () => void, code: 'schema' | 'invariant', detail?: string): void {
  let caught: unknown;
  try {
    fn();
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeInstanceOf(ContractError);
  const err = caught as ContractError;
  expect(err.code).toBe(code);
  if (detail) expect(err.details.join('\n')).toContain(detail);
}

describe('project.schema', () => {
  it('المستند الصالح يمر', () => {
    expect(() => validateProject(project())).not.toThrow();
  });
  it('المستند الصالح متسق زمنياً (frameCount ↔ durationUs)', () => {
    const p = project();
    // 5005000us × 30000/1001/1e6 = 150 إطاراً بالضبط
    expect(p.source.frameCount).toBe(150);
    expect(p.timeline.clips[0]!.outFrame).toBe(p.source.frameCount);
  });
  it('مع تفريغ صالح يمر', () => {
    const p = project();
    p.transcript = transcript();
    expect(() => validateProject(p)).not.toThrow();
  });
  it('durationUs > 900000000 يُرفض', () => {
    const p = project();
    p.source.durationUs = 900_000_001;
    expectContractError(() => validateProject(p), 'schema', 'durationUs');
  });
  it('خاصية غير معروفة تُرفض', () => {
    const p = project() as unknown as Record<string, unknown>;
    p['extra'] = 1;
    expectContractError(() => validateProject(p), 'schema');
  });
  it('تاريخ غير صالح يُرفض (format date-time)', () => {
    const p = project();
    p.createdAt = 'yesterday';
    expectContractError(() => validateProject(p), 'schema', 'createdAt');
  });
  it('outFrame ≤ inFrame يُرفض بالقيود البنيوية', () => {
    const p = project();
    p.timeline.clips[0]!.outFrame = 0;
    expect(checkProjectInvariants(p)).not.toHaveLength(0);
    expectContractError(() => validateProject(p), 'invariant');
  });
  it('فجوة أو تداخل أو تجاوز frameCount يُرفض', () => {
    const gap = project();
    gap.timeline.clips = [
      { id: 'a', sourceId: 'src-1', inFrame: 0, outFrame: 50, timelineStartFrame: 0 },
      { id: 'b', sourceId: 'src-1', inFrame: 50, outFrame: 150, timelineStartFrame: 60 },
    ];
    expect(checkProjectInvariants(gap)).not.toHaveLength(0);

    const over = project();
    over.timeline.clips[0]!.outFrame = 151;
    expect(checkProjectInvariants(over)).not.toHaveLength(0);

    const ok = project();
    ok.timeline.clips = [
      { id: 'a', sourceId: 'src-1', inFrame: 100, outFrame: 150, timelineStartFrame: 0 },
      { id: 'b', sourceId: 'src-1', inFrame: 0, outFrame: 50, timelineStartFrame: 50 },
    ];
    expect(checkProjectInvariants(ok)).toEqual([]);
  });
  it('كابشن خارج التايم لاين وبند مقترح بزمن معكوس يُرفضان', () => {
    const p = project();
    p.captions.cues = [{ id: 'q', startFrame: 100, endFrame: 200, fontSizePx: 40, wordIds: [], lines: ['x'] }];
    expect(checkProjectInvariants(p)).not.toHaveLength(0);

    const q = project();
    q.proposals = [
      {
        id: 'p1',
        createdAt: '2026-10-28T10:00:00.000Z',
        styleRef: { styleId: 'default', version: 1 },
        items: [{ id: 'i1', startUs: 2000, endUs: 1000, text: 'x', reason: 'silence', ruleId: 'cut.silenceMaxUs', state: 'proposed' }],
        totals: { byReason: { silence: 1, repeat: 0, abandoned: 0, filler: 0 }, savedUs: 0 },
        state: 'draft',
      },
    ];
    expect(checkProjectInvariants(q)).not.toHaveLength(0);
  });
});

describe('style.schema', () => {
  it('النمط الافتراضي v1 يمر', () => {
    expect(() => validateStyle(style())).not.toThrow();
  });
  it("mode: 'maybe' يُرفض", () => {
    const s = style() as unknown as { cut: { silenceMaxUs: { mode: string } } };
    s.cut.silenceMaxUs.mode = 'maybe';
    expectContractError(() => validateStyle(s), 'schema', 'mode');
  });
  it('version 0 يُرفض', () => {
    const s = style();
    s.version = 0;
    expectContractError(() => validateStyle(s), 'schema');
  });
});

describe('transcript.schema', () => {
  it('التفريغ الصالح يمر (مع confidence: null)', () => {
    expect(() => validateTranscript(transcript())).not.toThrow();
  });
  it('كلمة بلا مفتاح confidence تُرفض', () => {
    const t = transcript() as unknown as { words: Array<Record<string, unknown>> };
    delete t.words[0]!['confidence'];
    expectContractError(() => validateTranscript(t), 'schema', 'confidence');
  });
  it('confidence خارج 0..1 يُرفض', () => {
    const t = transcript();
    t.words[1]!.confidence = 1.5;
    expectContractError(() => validateTranscript(t), 'schema');
  });
  it('أكثر من 100000 كلمة يُرفض (maxItems، مراجعة US1 #4)', () => {
    const t = transcript();
    const w = t.words[0]!;
    t.words = Array.from({ length: 100_001 }, (_, i) => ({ ...w, id: `w${i}` }));
    expectContractError(() => validateTranscript(t), 'schema', 'words');
    t.words.length = 100_000;
    expect(() => validateTranscript(t)).not.toThrow();
  });
  it('نص كلمة أطول من 256 حرفاً يُرفض (maxLength)', () => {
    const t = transcript();
    t.words[0]!.text = 'ا'.repeat(257);
    expectContractError(() => validateTranscript(t), 'schema', 'text');
  });
});

describe('commands.schema', () => {
  it('20 أمراً بأسماء فريدة', () => {
    expect(commandSpecs).toHaveLength(20);
    expect(new Set(commandSpecs.map((c) => c.name)).size).toBe(20);
  });
  it('getCommandSpec يعيد الوصف', () => {
    expect(getCommandSpec('proposal.apply')).toMatchObject({ undoable: true, confirm: true, actors: ['user'] });
  });
  it('معاملات صالحة تمر', () => {
    expect(() => validateCommandParams('clip.split', { clipId: 'c1', atFrame: 10 })).not.toThrow();
    expect(() => validateCommandParams('proposal.exclude', { proposalId: 'p', itemIds: ['i'] })).not.toThrow();
    expect(() => validateCommandParams('project.import', { path: '/x.mp4', styleRef: { styleId: 'default', version: 1 } })).not.toThrow();
    expect(() => validateCommandParams('history.undo', {})).not.toThrow();
  });
  it('atFrame سالب يُرفض', () => {
    expectContractError(() => validateCommandParams('clip.split', { clipId: 'c1', atFrame: -1 }), 'schema', 'atFrame');
  });
  it('itemIds فارغة تُرفض (minItems 1)', () => {
    expectContractError(() => validateCommandParams('proposal.exclude', { proposalId: 'p', itemIds: [] }), 'schema');
  });
  it('خاصية غير معروفة تُرفض', () => {
    expectContractError(() => validateCommandParams('clip.delete', { clipId: 'c1', extra: true }), 'schema');
  });
  it('معرّف المشروع بفاصل مسار يُرفض (مراجعة phase-2 #1)', () => {
    const doc = structuredClone(projectFixture) as Record<string, unknown>;
    doc['id'] = '../../x';
    expectContractError(() => validateProject(doc), 'schema', 'id');
  });
  it('اسم أمر غير معروف يُرفض', () => {
    expect(() => getCommandSpec('nope.nope' as never)).toThrow(ContractError);
  });
});

// مراجعة us2 #3: نص التصحيح بسقف الكلمة نفسه في عقد التفريغ (256) — يُرفض عند معاملات الأمر لا بعد الاشتقاق والقياس
describe('transcript.fixWord params', () => {
  it('نص أطول من 256 حرفاً يُرفض (maxLength)، و256 يمرّ', () => {
    expectContractError(() => validateCommandParams('transcript.fixWord', { wordId: 'w1', text: 'ا'.repeat(257) }), 'schema', 'text');
    expect(() => validateCommandParams('transcript.fixWord', { wordId: 'w1', text: 'ا'.repeat(256) })).not.toThrow();
  });
});
