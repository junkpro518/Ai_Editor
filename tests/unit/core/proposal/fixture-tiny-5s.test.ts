import { describe, it, expect } from 'vitest';
import { fromDeepgram } from '../../../../src/core/transcript/providers/deepgram';
import { generateProposal } from '../../../../src/core/proposal/generate';
import { execute } from '../../../../src/core/commands/registry';
import { History } from '../../../../src/core/history/snapshots';
import { makeCtx, makeProject, FIXED_NOW } from '../../../helpers/project';
import raw from '../../../fixtures/providers/deepgram-tiny-5s.json';

// حارس للمثبّتة المشتقة deepgram-tiny-5s.json التي تعتمد عليها e2e (T041): بندان (صمت + حشو) وقصّات معلومة.
describe('deepgram-tiny-5s.json → مقترح قص على tiny-5s (30fps، 150 إطاراً)', () => {
  const ctx = makeCtx();
  const transcript = fromDeepgram(raw, { model: 'nova-3', modelParams: { mip_opt_out: true, language: 'ar-SA' }, audioSha256: 'a'.repeat(64), createdAt: FIXED_NOW, durationUs: 5_000_000, newId: ctx.newId });
  const base = makeProject();
  const project = makeProject({
    source: { ...base.source, fps: { num: 30, den: 1 }, frameCount: 150, durationUs: 5_000_000 },
    timeline: { clips: [{ id: 'clip-1', sourceId: 'src-1', inFrame: 0, outFrame: 150, timelineStartFrame: 0 }] },
    transcript,
    transcriptJob: { state: 'done' },
  });

  it('12 كلمة، بند صمت [2.12s, 2.78s] وبند حشو «يعني» [2.90s, 3.10s]، لا محظور', () => {
    expect(transcript.words).toHaveLength(12);
    const proposal = generateProposal(transcript, ctx.style, project.source, ctx);
    expect(proposal.items.map((i) => [i.reason, i.state, i.startUs, i.endUs, i.text])).toEqual([
      ['silence', 'proposed', 2_120_000, 2_780_000, ''],
      ['filler', 'proposed', 2_900_000, 3_100_000, 'يعني'],
    ]);
    expect(proposal.totals).toEqual({ byReason: { silence: 1, repeat: 0, abandoned: 0, filler: 1 }, savedUs: 860_000 });
  });

  it('تطبيق الاثنين → [0,63)+[93,150)؛ استثناء الحشو ثم التطبيق → [0,63)+[83,150) مع تصحيح exclude_item', () => {
    const h = new History();
    const requested = execute(project, 'proposal.request', {}, ctx, { actor: 'user', history: h });
    const proposalId = requested.project.proposals[0]!.id;
    const both = execute(requested.project, 'proposal.apply', { proposalId }, ctx, { actor: 'user', history: h, confirmed: true });
    expect(both.project.timeline.clips.map((c) => [c.inFrame, c.outFrame, c.timelineStartFrame])).toEqual([
      [0, 63, 0],
      [93, 150, 63],
    ]);

    const filler = requested.project.proposals[0]!.items.find((i) => i.reason === 'filler')!;
    const excluded = execute(requested.project, 'proposal.exclude', { proposalId, itemIds: [filler.id] }, ctx, { actor: 'user', history: h });
    const one = execute(excluded.project, 'proposal.apply', { proposalId }, ctx, { actor: 'user', history: h, confirmed: true });
    expect(one.project.timeline.clips.map((c) => [c.inFrame, c.outFrame, c.timelineStartFrame])).toEqual([
      [0, 63, 0],
      [83, 150, 63],
    ]);
    expect(one.project.corrections.map((c) => c.kind)).toEqual(['exclude_item']);
  });
});
