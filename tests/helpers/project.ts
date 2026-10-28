import { readFileSync } from 'node:fs';
import type { ProjectDocument, StyleVersion, Transcript } from '../../src/core/contracts/types';
import type { CommandContext } from '../../src/core/commands/types';

export const FIXED_NOW = '2026-10-28T00:00:00.000Z';

/** مشروع صالح أدنى: 30000/1001، 300 إطار، لقطة واحدة 0..300، بلا نص. */
export function makeProject(overrides: Partial<ProjectDocument> = {}): ProjectDocument {
  return {
    schemaVersion: 1,
    id: 'proj-1',
    name: 'اختبار',
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    seed: 42,
    source: {
      id: 'src-1',
      path: '/fixtures/tiny-5s.mp4',
      fileName: 'tiny-5s.mp4',
      hash: 'a'.repeat(64),
      durationUs: 10_010_000,
      fps: { num: 30000, den: 1001 },
      frameCount: 300,
      width: 1920,
      height: 1080,
      hasAudio: true,
    },
    style: { styleId: 'default', version: 1 },
    transcript: null,
    transcriptJob: { state: 'idle' },
    timeline: { clips: [{ id: 'clip-1', sourceId: 'src-1', inFrame: 0, outFrame: 300, timelineStartFrame: 0 }] },
    captions: { enabled: false, cues: [] },
    proposals: [],
    corrections: [],
    styleUpdateProposals: [],
    ...overrides,
  };
}

export function makeStyle(): StyleVersion {
  const url = new URL('../../resources/styles/default-v1.json', import.meta.url);
  return JSON.parse(readFileSync(url, 'utf8')) as StyleVersion;
}

/** سياق حتمي: ساعة ثابتة ومعرّفات متسلسلة (عدّاد جديد لكل استدعاء). */
export function makeCtx(): CommandContext {
  let n = 0;
  return { style: makeStyle(), now: () => FIXED_NOW, newId: () => `id-${++n}` };
}

/**
 * تفريغ حتمي من مصفوفة [نص، بدايةUs، نهايةUs، ثقة؟]؛ `segments` اختيارية كمجموعات فهارس كلمات
 * (بلا segments يشتق المولّد الجمل من الفجوات/علامات الترقيم).
 */
export function makeTranscript(
  words: Array<[string, number, number, number?]>,
  opts: { durationUs?: number; segments?: number[][] } = {},
): Transcript {
  const ws = words.map(([text, startUs, endUs, confidence], i) => ({
    id: `w${i + 1}`,
    text,
    startUs,
    endUs,
    confidence: confidence ?? 0.95,
  }));
  const last = ws[ws.length - 1];
  const t: Transcript = {
    schemaVersion: 1,
    provider: 'test',
    model: 'fixture',
    modelParams: {},
    audioSha256: 'b'.repeat(64),
    language: 'ar',
    durationUs: opts.durationUs ?? (last ? last.endUs : 0),
    createdAt: FIXED_NOW,
    words: ws,
  };
  if (opts.segments) {
    t.segments = opts.segments.map((idx) => {
      const seg = idx.map((i) => ws[i]!);
      return {
        startUs: seg[0]!.startUs,
        endUs: seg[seg.length - 1]!.endUs,
        wordIds: seg.map((w) => w.id),
        text: seg.map((w) => w.text).join(' '),
      };
    });
  }
  return t;
}
