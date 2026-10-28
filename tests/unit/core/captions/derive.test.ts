import { describe, expect, it } from 'vitest';
import { deriveCues, withCaptions } from '../../../../src/core/captions/derive';
import { checkProjectInvariants, validateProject } from '../../../../src/core/contracts/validate';
import type { ProjectDocument } from '../../../../src/core/contracts/types';
import { makeCtx, makeProject, makeTranscript } from '../../../helpers/project';

// T055 — deriveCues: الأزمنة µs → إطارات على شبكة المشروع، حذف كلمات المناطق المقصوصة، قاعدة الإبطال.
// بلا دالة قياس محقونة يُستعمل القياس الاحتياطي (تقريبي) ويُعلَّم الناتج approximate=true — هذه الاختبارات كلها تقريبية.

type Clip = ProjectDocument['timeline']['clips'][number];
const clip = (id: string, inFrame: number, outFrame: number, timelineStartFrame: number): Clip => ({ id, sourceId: 'src-1', inFrame, outFrame, timelineStartFrame });

/** مشروع 30fps، 150 إطاراً (5 ثوانٍ)، كابشن مفعَّل */
function project30(clips: Clip[], extra: Partial<ProjectDocument> = {}): ProjectDocument {
  const base = makeProject();
  return makeProject({
    source: { ...base.source, fps: { num: 30, den: 1 }, frameCount: 150, durationUs: 5_000_000 },
    timeline: { clips },
    captions: { enabled: true, cues: [] },
    ...extra,
  });
}

// كلمات كل 500ms: w1 [0.1,0.4) w2 [0.6,0.9) w3 [1.1,1.4) w4 [1.6,1.9) w5 [2.1,2.4) w6 [2.6,2.9)
const transcript = makeTranscript([
  ['السلام', 100_000, 400_000],
  ['عليكم', 600_000, 900_000],
  ['اليوم', 1_100_000, 1_400_000],
  ['نشرح', 1_600_000, 1_900_000],
  ['الدرس', 2_100_000, 2_400_000],
  ['تمام', 2_600_000, 2_900_000],
]);
const style = makeCtx().style;

describe('deriveCues', () => {
  it('بلا تفريغ → لا كابشن', () => {
    expect(deriveCues(project30([clip('c', 0, 150, 0)]), style).cues).toEqual([]);
  });

  it('يحوّل µs إلى إطارات التايم لاين: كابشن لكل كلمة نشطة، وأسطر المجموعة مشتركة، ومعرّفات ثابتة', () => {
    const p = project30([clip('c', 0, 150, 0)], { transcript });
    const { cues, approximate } = deriveCues(p, style);
    expect(approximate).toBe(true); // قياس احتياطي (اختبار وحدة)
    // 6 كلمات بفجوات 200ms ≥ 150ms → كسر عند الحد الأدنى 3: مجموعتان من 3
    expect(cues).toHaveLength(6);
    expect(cues.map((c) => c.id)).toEqual(['cue:w1', 'cue:w2', 'cue:w3', 'cue:w4', 'cue:w5', 'cue:w6']);
    expect(cues.map((c) => [c.startFrame, c.endFrame])).toEqual([
      [3, 18], // w1 يبدأ 0.1s=3 وينتهي عند بداية w2 (0.6s=18)
      [18, 33],
      [33, 42], // آخر كلمة في المجموعة الأولى تنتهي عند نهايتها 1.4s=42 (الفجوة 200ms ≥ الوقفة فلا تمديد)
      [48, 63],
      [63, 78],
      [78, 87],
    ]);
    expect(cues[0]!.wordIds).toEqual(['w1', 'w2', 'w3']);
    expect(cues[0]!.lines).toEqual(['السلام عليكم اليوم']);
    expect(cues[3]!.lines).toEqual(['نشرح الدرس تمام']);
    expect(cues.every((c) => c.activeWordRects?.length === 1)).toBe(true);
    // المستطيل النشط يختلف بين كلمات المجموعة ويقع في ترتيب RTL
    expect(cues[0]!.activeWordRects![0]![0]).toBeGreaterThan(cues[1]!.activeWordRects![0]![0]!);
    expect(cues.every((c) => Number.isInteger(c.fontSizePx) && c.fontSizePx > 0)).toBe(true);
  });

  it('يمدّ آخر كابشن في المجموعة حتى بداية المجموعة التالية عند وقفة أقصر من breakAtPauseUs', () => {
    const dense = makeTranscript([
      ['١', 0, 200_000],
      ['٢', 250_000, 450_000],
      ['٣', 500_000, 700_000],
      ['٤', 750_000, 950_000],
      ['٥', 1_000_000, 1_200_000],
      ['٦', 1_250_000, 1_450_000], // المجموعة الثانية (حد 5 كلمات)؛ الفجوة 50ms < 150ms
    ]);
    const { cues } = deriveCues(project30([clip('c', 0, 150, 0)], { transcript: dense }), style);
    expect(cues[4]).toMatchObject({ startFrame: 30, endFrame: 37 }); // ٥: 1.0s → حتى بداية ٦ عند 1.25s = 37.5 → 37
    expect(cues[5]).toMatchObject({ startFrame: 37, endFrame: 43 });
  });

  it('يحذف الكلمات الواقعة كلياً في مقطع مقصوص ويقصّ الكلمة المستقيمة على حدّ القص', () => {
    // قصّ [0.5s, 1.7s) = الإطارات [15, 51): تختفي w2 وw3 كلياً؛ w4 [48,57) تُقصّ إلى [51,57) → تايم لاين [15,21)
    const p = project30([clip('a', 0, 15, 0), clip('b', 51, 150, 15)], { transcript });
    const { cues } = deriveCues(p, style);
    expect(cues.map((c) => c.id)).toEqual(['cue:w1', 'cue:w4', 'cue:w5', 'cue:w6']);
    expect(cues[0]).toMatchObject({ startFrame: 3, endFrame: 12, wordIds: ['w1'], lines: ['السلام'] });
    expect(cues[1]).toMatchObject({ startFrame: 15, wordIds: ['w4', 'w5', 'w6'] });
    expect(cues[1]!.endFrame).toBe(cues[2]!.startFrame);
    expect(checkProjectInvariants({ ...p, captions: { enabled: true, cues } })).toEqual([]);
  });

  it('لقطات مُعاد ترتيبها: التجميع لكل لقطة، والكابشن مرتب بإطار التايم لاين بلا تداخل', () => {
    const p = project30([clip('b', 75, 150, 0), clip('a', 0, 75, 75)], { transcript });
    const { cues } = deriveCues(p, style);
    expect(cues.map((c) => c.id)).toEqual(['cue:w6', 'cue:w1', 'cue:w2', 'cue:w3', 'cue:w4', 'cue:w5']);
    for (let i = 1; i < cues.length; i++) expect(cues[i]!.startFrame).toBeGreaterThanOrEqual(cues[i - 1]!.endFrame);
    expect(cues[0]!.wordIds).toEqual(['w6']); // لا مجموعة تعبر حدّ لقطة
    expect(cues[1]!.wordIds).toEqual(['w1', 'w2', 'w3']);
    expect(checkProjectInvariants({ ...p, captions: { enabled: true, cues } })).toEqual([]);
  });

  it('كلمة أقصر من إطار (نفس إطار بداية الكلمة التالية) لا تُنتج كابشن بلا مدة لكنها تبقى في أسطر المجموعة', () => {
    const t = makeTranscript([
      ['أ', 100_000, 110_000],
      ['ب', 115_000, 400_000], // نفس الإطار 3
      ['ج', 500_000, 800_000],
    ]);
    const { cues } = deriveCues(project30([clip('c', 0, 150, 0)], { transcript: t }), style);
    expect(cues.map((c) => c.id)).toEqual(['cue:w2', 'cue:w3']);
    expect(cues[0]!.lines).toEqual(['أ ب ج']);
    expect(cues[0]!.wordIds).toEqual(['w1', 'w2', 'w3']);
  });

  it('الكابشن لا يتجاوز نهاية التايم لاين؛ كلمة تمتد بعد آخر إطار تُقصّ', () => {
    const t = makeTranscript([
      ['أ', 4_000_000, 4_500_000],
      ['ب', 4_600_000, 5_900_000],
    ]);
    const { cues } = deriveCues(project30([clip('c', 0, 150, 0)], { transcript: t }), style);
    expect(cues.at(-1)!.endFrame).toBe(150);
    expect(cues.every((c) => c.endFrame > c.startFrame)).toBe(true);
  });

  it('مجموعة لا تتسع حتى بالحد الأدنى تُقسَّم (fallback) حتى تتسع أو تبقى كلمة واحدة', () => {
    const t = makeTranscript([
      ['ـ'.repeat(120), 0, 300_000],
      ['ـ'.repeat(120), 350_000, 650_000],
      ['ـ'.repeat(120), 700_000, 1_000_000],
    ]);
    const { cues } = deriveCues(project30([clip('c', 0, 150, 0)], { transcript: t }), style);
    expect(cues).toHaveLength(3);
    expect(cues.map((c) => c.wordIds)).toEqual([['w1'], ['w2'], ['w3']]);
  });

  it('حتمي: نفس المدخل = نفس المخرج (بلا معرّفات عشوائية ولا ساعة)', () => {
    const p = project30([clip('c', 0, 150, 0)], { transcript });
    expect(deriveCues(p, style)).toEqual(deriveCues(p, style));
  });
});

describe('withCaptions (قاعدة الإبطال data-model §1.10)', () => {
  it('captions.enabled=false أو transcript=null → cues=[] (ويُفرَّغ القديم)', () => {
    const stale = [{ id: 'old', startFrame: 0, endFrame: 10, wordIds: ['w1'], lines: ['قديم'], fontSizePx: 40 }];
    const off = withCaptions(project30([clip('c', 0, 150, 0)], { transcript, captions: { enabled: false, cues: stale } }), makeCtx());
    expect(off.captions).toEqual({ enabled: false, cues: [] });
    const none = withCaptions(project30([clip('c', 0, 150, 0)], { captions: { enabled: true, cues: stale } }), makeCtx());
    expect(none.captions.cues).toEqual([]);
  });

  it('مفعَّل مع تفريغ → يشتق الكابشن بدالة القياس من السياق ويعطي مستنداً صالحاً دون تغيير المدخل', () => {
    const p = project30([clip('c', 0, 150, 0)], { transcript });
    const frozen = structuredClone(p);
    const ctx = makeCtx();
    let calls = 0;
    ctx.measure = (text, font) => {
      calls++;
      const n = text.split(' ').length;
      const w = text.length * font.sizePx * 0.5;
      return { width: w, height: font.sizePx * 1.2, wordRects: Array.from({ length: n }, (_, i) => [i * 10, 0, 10, font.sizePx * 1.2] as [number, number, number, number]) };
    };
    const next = withCaptions(p, ctx);
    expect(calls).toBeGreaterThan(0);
    expect(next.captions.cues.length).toBe(6);
    expect(p).toEqual(frozen);
    expect(() => validateProject(next)).not.toThrow();
  });
});
