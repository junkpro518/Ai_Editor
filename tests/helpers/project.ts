import { readFileSync } from 'node:fs';
import type { ProjectDocument, StyleVersion } from '../../src/core/contracts/types';
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
