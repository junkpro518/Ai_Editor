import type { ProjectDocument, StyleRef } from '../contracts/types';
import type { ProbeLike } from '../commands/types';

/** FNV-1a 32-bit — بذرة حتمية من بصمة الملف (الدستور IV: لا عشوائية غير مبذورة). */
export function fnv1a32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface CreateProjectOptions {
  id: string;
  now: string;
  newId: () => string;
  styleRef: StyleRef;
  name: string;
  captionsEnabled: boolean;
}

/** مستند مشروع جديد من ناتج probe: لقطة واحدة [0, frameCount) وتثبيت النمط (T030). */
export function createProject(probe: ProbeLike, opts: CreateProjectOptions): ProjectDocument {
  const sourceId = opts.newId();
  return {
    schemaVersion: 1,
    id: opts.id,
    name: opts.name,
    createdAt: opts.now,
    updatedAt: opts.now,
    seed: fnv1a32(probe.hash),
    source: { id: sourceId, ...probe },
    style: { ...opts.styleRef },
    transcript: null,
    transcriptJob: { state: 'idle' },
    timeline: {
      clips: [{ id: opts.newId(), sourceId, inFrame: 0, outFrame: probe.frameCount, timelineStartFrame: 0 }],
    },
    captions: { enabled: opts.captionsEnabled, cues: [] },
    proposals: [],
    corrections: [],
    styleUpdateProposals: [],
  };
}
