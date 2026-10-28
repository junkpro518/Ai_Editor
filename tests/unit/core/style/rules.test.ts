import { describe, expect, it } from 'vitest';
import { execute } from '../../../../src/core/commands/registry';
import { generateProposal } from '../../../../src/core/proposal/generate';
import { getRule, isMandatory, ruleMode } from '../../../../src/core/style/rules';
import type { StyleVersion } from '../../../../src/core/contracts/types';
import { History } from '../../../../src/core/history/snapshots';
import { makeCtx, makeProject, makeStyle, makeTranscript, FIXED_NOW } from '../../../helpers/project';

// T068 — وضع القاعدة يحسم (data-model §1.7): الإلزامي يمنع بند المقترح (blocked + blockedBy) والتفضيل يرجّح فقط؛
// التعديل اليدوي المخالف يُسمح مع تصحيح manual_edit وحقل violates (FR-009).

const codeOf = (fn: () => unknown): string => {
  try {
    fn();
  } catch (e) {
    return (e as { code: string }).code;
  }
  return 'no_error';
};

function withMode(style: StyleVersion, mode: 'mandatory' | 'preference'): StyleVersion {
  return { ...style, cut: { ...style.cut, minClipUs: { ...style.cut.minClipUs, mode } } };
}

describe('قراءة الوضع', () => {
  it('getRule/ruleMode/isMandatory بمسار الحقل؛ حقل غير معروف → unknown_style_field', () => {
    const style = makeStyle();
    expect(getRule(style, 'cut.minClipUs')).toBe(style.cut.minClipUs);
    expect(ruleMode(style, 'cut.minClipUs')).toBe('mandatory');
    expect(isMandatory(style, 'cut.minClipUs')).toBe(true);
    expect(ruleMode(style, 'cut.silenceMaxUs')).toBe('preference');
    expect(isMandatory(style, 'captions.fontSizePx')).toBe(false);
    expect(codeOf(() => getRule(style, 'cut.nope'))).toBe('unknown_style_field');
    expect(codeOf(() => getRule(style, 'other.minClipUs'))).toBe('unknown_style_field');
    expect(codeOf(() => getRule(style, 'cut.constructor'))).toBe('unknown_style_field');
  });
});

describe('المقترح', () => {
  // صمت 1.7s بعد كلمة قصيرة (0.3s): حذفه يترك لقطة كلام 0.42s < minClipUs 0.5s
  const transcript = makeTranscript(
    [
      ['ا', 0, 300_000],
      ['ب', 2_000_000, 5_000_000],
    ],
    { durationUs: 5_000_000 },
  );

  it('minClipUs إلزامي → البند blocked مع blockedBy؛ تفضيل → البند proposed (يرجّح فقط)', () => {
    const style = makeStyle();
    expect(isMandatory(style, 'cut.minClipUs')).toBe(true);
    const blocked = generateProposal(transcript, style, { durationUs: 5_000_000 }, makeCtx());
    const silence = blocked.items.filter((i) => i.reason === 'silence');
    expect(silence).toHaveLength(1);
    expect(silence[0]).toMatchObject({ state: 'blocked', blockedBy: 'cut.minClipUs' });

    const pref = withMode(style, 'preference');
    expect(isMandatory(pref, 'cut.minClipUs')).toBe(false);
    const ranked = generateProposal(transcript, pref, { durationUs: 5_000_000 }, makeCtx());
    expect(ranked.items.filter((i) => i.reason === 'silence')[0]?.state).toBe('proposed');
  });
});

describe('التعديل اليدوي', () => {
  const project = () => makeProject({ source: { ...makeProject().source, fps: { num: 30, den: 1 }, frameCount: 150, durationUs: 5_000_000 }, timeline: { clips: [{ id: 'clip-1', sourceId: 'src-1', inFrame: 0, outFrame: 150, timelineStartFrame: 0 }] } });

  it('إلزامي: القصّ تحت الحد يُسمح مع تحذير violates_mandatory_rule وتصحيح manual_edit يحمل violates=ruleId', () => {
    const r = execute(project(), 'clip.trim', { clipId: 'clip-1', outFrame: 5 }, makeCtx(), { actor: 'user', history: new History() });
    expect(r.project.timeline.clips[0]?.outFrame).toBe(5);
    expect(r.warnings).toEqual(['below_min_clip', 'violates_mandatory_rule']);
    expect(r.project.corrections).toEqual([
      expect.objectContaining({ kind: 'manual_edit', ruleId: 'cut.minClipUs', violates: 'cut.minClipUs', actor: 'user', at: FIXED_NOW }),
    ]);
  });

  it('تفضيل: تحذير below_min_clip فقط بلا تصحيح', () => {
    const ctx = { ...makeCtx(), style: withMode(makeStyle(), 'preference') };
    const r = execute(project(), 'clip.trim', { clipId: 'clip-1', outFrame: 5 }, ctx, { actor: 'user', history: new History() });
    expect(r.warnings).toEqual(['below_min_clip']);
    expect(r.project.corrections).toEqual([]);
  });
});
