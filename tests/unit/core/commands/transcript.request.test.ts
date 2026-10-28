import { describe, it, expect } from 'vitest';
import { execute } from '../../../../src/core/commands/registry';
import { validateProject } from '../../../../src/core/contracts/validate';
import { History } from '../../../../src/core/history/snapshots';
import { makeProject, makeCtx, FIXED_NOW } from '../../../helpers/project';

// T046: transcript.request أمر نقي — لا I/O؛ يضبط حالة المهمة ويطلق أثر request-transcript للطبقة الخارجية.

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

// الأمر موسوم confirm في العقد: التأكيد يسبق أي فحص داخل الأمر
const confirmed = () => ({ actor: 'user' as const, history: new History(), confirmed: true });

describe('transcript.request', () => {
  it('بلا تأكيد → confirmation_required قبل أي شيء', () => {
    expect(codeOf(() => execute(makeProject(), 'transcript.request', {}, makeCtx(), { actor: 'user', history: new History() }))).toBe(
      'confirmation_required',
    );
  });

  it('مصدر بلا مسار صوت → no_audio', () => {
    const base = makeProject();
    const project = makeProject({ source: { ...base.source, hasAudio: false } });
    expect(codeOf(() => execute(project, 'transcript.request', {}, makeCtx(), confirmed()))).toBe('no_audio');
  });

  it('الوضع المحلي خارج هذه الميزة (القرار 23) → local_mode_unavailable', () => {
    expect(codeOf(() => execute(makeProject(), 'transcript.request', { mode: 'local' }, makeCtx(), confirmed()))).toBe('local_mode_unavailable');
  });

  it('ينجح: transcriptJob = extracting_audio بتقدم 0 وبداية الآن، أثر request-transcript، غير قابل للتراجع، المدخل لا يُمسّ', () => {
    const project = deepFreeze(makeProject());
    const history = new History();
    const r = execute(project, 'transcript.request', {}, makeCtx(), { actor: 'user', history, confirmed: true });

    expect(r.description).toBe('طلب التفريغ');
    expect(r.project.transcriptJob).toEqual({ state: 'extracting_audio', progress: 0, startedAt: FIXED_NOW });
    expect(r.effects).toEqual([{ kind: 'request-transcript', mode: 'cloud' }]);
    expect(r.entry).toBeUndefined();
    expect(history.canUndo()).toBe(false);
    expect(() => validateProject(r.project)).not.toThrow();
    // النص السابق (إن وُجد) واللقطات لا تتغير بالطلب نفسه
    expect(r.project.timeline).toEqual(project.timeline);
    expect(project.transcriptJob).toEqual({ state: 'idle' });
  });

  it('إعادة الطلب بعد فشل سابق تمسح الخطأ وتبدأ من جديد (FR-016)', () => {
    const project = makeProject({ transcriptJob: { state: 'failed', provider: 'deepgram', model: 'nova-3', error: 'offline' } });
    const r = execute(project, 'transcript.request', { mode: 'cloud' }, makeCtx(), confirmed());
    expect(r.project.transcriptJob).toEqual({ state: 'extracting_audio', progress: 0, startedAt: FIXED_NOW });
  });
});
