import { describe, it, expect } from 'vitest';
import { createProject, fnv1a32 } from '../../../../src/core/project/create';
import { execute } from '../../../../src/core/commands/registry';
import { validateProject } from '../../../../src/core/contracts/validate';
import { History } from '../../../../src/core/history/snapshots';
import type { ProbeLike } from '../../../../src/core/commands/types';
import { makeProject, makeCtx, makeStyle, FIXED_NOW } from '../../../helpers/project';

function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o as object)) deepFreeze(v);
  }
  return o;
}

const probe: ProbeLike = {
  path: '/videos/clip-01.mp4',
  fileName: 'clip-01.mp4',
  hash: 'b'.repeat(64),
  durationUs: 5_005_000,
  fps: { num: 30000, den: 1001 },
  sourceIsVfr: false,
  frameCount: 150,
  rotation: 0,
  width: 1280,
  height: 720,
  hasAudio: true,
  fileSize: 1234,
  mtime: FIXED_NOW,
  container: 'mov,mp4,m4a,3gp,3g2,mj2',
  videoCodec: 'h264',
  audioCodec: 'aac',
};

const opts = () => {
  let n = 0;
  return {
    id: 'proj-x',
    now: FIXED_NOW,
    newId: () => `id-${++n}`,
    styleRef: { styleId: 'default', version: 1 },
    name: 'clip-01',
    captionsEnabled: true,
  };
};

describe('createProject', () => {
  it('ينتج مستنداً صالحاً بلقطة واحدة تغطي كل الإطارات', () => {
    const doc = createProject(probe, opts());
    expect(() => validateProject(doc)).not.toThrow();
    expect(doc.timeline.clips).toHaveLength(1);
    expect(doc.timeline.clips[0]).toMatchObject({
      inFrame: 0,
      outFrame: 150,
      timelineStartFrame: 0,
      sourceId: doc.source.id,
    });
    expect(doc.source).toMatchObject({ ...probe });
    expect(doc.style).toEqual({ styleId: 'default', version: 1 });
    expect(doc.transcript).toBeNull();
    expect(doc.transcriptJob).toEqual({ state: 'idle' });
    expect(doc.captions).toEqual({ enabled: true, cues: [] });
    expect(doc.createdAt).toBe(FIXED_NOW);
    expect(doc.name).toBe('clip-01');
  });

  it('البذرة حتمية من بصمة الملف (FNV-1a 32-bit)', () => {
    const a = createProject(probe, opts());
    const b = createProject(probe, opts());
    expect(a.seed).toBe(b.seed);
    expect(a.seed).toBe(fnv1a32(probe.hash));
    expect(Number.isInteger(a.seed) && a.seed >= 0 && a.seed <= 0xffffffff).toBe(true);
    expect(createProject({ ...probe, hash: 'c'.repeat(64) }, opts()).seed).not.toBe(a.seed);
    // قيمة مرجعية معروفة لـFNV-1a
    expect(fnv1a32('')).toBe(0x811c9dc5);
    expect(fnv1a32('a')).toBe(0xe40c292c);
  });
});

describe('project.import عبر execute', () => {
  it('يرفض بلا ctx.probe', () => {
    const history = new History();
    let code = 'no_error';
    try {
      execute(makeProject(), 'project.import', { path: probe.path }, makeCtx(), { actor: 'user', history });
    } catch (e) {
      code = (e as { code: string }).code;
    }
    expect(code).toBe('probe_required');
    expect(history.entries()).toHaveLength(0);
  });

  it('ينشئ مشروعاً جديداً ويتجاهل المدخل ولا يُسجَّل في التاريخ', () => {
    const history = new History();
    const input = deepFreeze(makeProject({ name: 'قديم', seed: 7 }));
    const ctx = { ...makeCtx(), probe };
    const r = execute(input, 'project.import', { path: probe.path }, ctx, { actor: 'user', history });
    expect(r.entry).toBeUndefined();
    expect(history.entries()).toHaveLength(0);
    expect(r.project.id).not.toBe(input.id);
    expect(r.project.name).toBe('clip-01');
    expect(r.project.source.path).toBe(probe.path);
    expect(r.project.timeline.clips[0]?.outFrame).toBe(150);
    expect(r.project.style).toEqual({ styleId: makeStyle().styleId, version: makeStyle().version });
    expect(r.project.captions.enabled).toBe(makeStyle().captions.enabled.value);
    expect(r.project.updatedAt).toBe(FIXED_NOW);
  });

  it('يثبّت styleRef الممرَّر إن وُجد', () => {
    const ctx = { ...makeCtx(), probe };
    const r = execute(
      makeProject(),
      'project.import',
      { path: probe.path, styleRef: { styleId: 'default', version: 3 } },
      ctx,
      {
        actor: 'user',
        history: new History(),
      },
    );
    expect(r.project.style).toEqual({ styleId: 'default', version: 3 });
  });
});
