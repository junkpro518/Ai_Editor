import { describe, expect, it } from 'vitest';
import { validateTranscript } from '../../src/core/contracts';
import { fromDeepgram } from '../../src/core/transcript/providers/deepgram';
import { fromElevenLabs } from '../../src/core/transcript/providers/elevenlabs';
import { ConvertError } from '../../src/core/transcript/providers/types';
import type { ConvertMeta } from '../../src/core/transcript/providers/types';
import deepgramArSa from '../fixtures/providers/deepgram-ar-sa.json';
import deepgramMulti from '../fixtures/providers/deepgram-multi.json';
import elevenlabsScribe from '../fixtures/providers/elevenlabs-scribe-v2.json';

const SHA = 'ab'.repeat(32);
const CREATED = '2026-10-28T07:00:00.000Z';

function meta(overrides: Partial<ConvertMeta> = {}): ConvertMeta {
  let n = 0;
  return {
    model: 'nova-3',
    modelParams: { model: 'nova-3', language: 'ar-SA', punctuate: true, smart_format: false, mip_opt_out: true },
    audioSha256: SHA,
    createdAt: CREATED,
    durationUs: 5_021_000,
    newId: () => `w${String(++n).padStart(6, '0')}`,
    ...overrides,
  };
}

describe('fromDeepgram', () => {
  it('ar-SA: كلمات بالميكروثانية، ثقة كما هي، ويمرّ validateTranscript', () => {
    const t = fromDeepgram(structuredClone(deepgramArSa), meta());
    expect(() => validateTranscript(t)).not.toThrow();
    expect(t.schemaVersion).toBe(1);
    expect(t.provider).toBe('deepgram');
    expect(t.model).toBe('nova-3');
    expect(t.language).toBe('ar-SA');
    expect(t.audioSha256).toBe(SHA);
    expect(t.createdAt).toBe(CREATED);
    expect(t.durationUs).toBe(5_021_000);
    expect(t.modelParams).toMatchObject({ mip_opt_out: true });

    expect(t.words).toHaveLength(7);
    expect(t.words[0]).toEqual({ id: 'w000001', text: 'السلام', startUs: 80_000, endUs: 560_000, confidence: 0.9982 });
    // النص المرقّم يُحفظ كما أرجعه المزود
    expect(t.words[1]?.text).toBe('عليكم.');
    expect(t.words[3]?.text).toBe('نبدأ،');
    for (const w of t.words) {
      expect(Number.isInteger(w.startUs)).toBe(true);
      expect(Number.isInteger(w.endUs)).toBe(true);
      expect(w.endUs).toBeGreaterThan(w.startUs);
      expect(w.lang).toBeUndefined(); // لا لغة لكل كلمة خارج وضع multi
    }
    for (let i = 1; i < t.words.length; i++) expect(t.words[i]!.startUs).toBeGreaterThanOrEqual(t.words[i - 1]!.endUs);
  });

  it('ar-SA: الجُمل بالترقيم أو بفجوة ≥ 700 ms', () => {
    const t = fromDeepgram(structuredClone(deepgramArSa), meta());
    expect(t.segments).toEqual([
      { startUs: 80_000, endUs: 1_040_000, wordIds: ['w000001', 'w000002'], text: 'السلام عليكم.' },
      // الفاصلة ليست نهاية جملة؛ القطع هنا بسبب الفجوة 2.0 → 2.88 ث
      { startUs: 1_200_000, endUs: 2_000_000, wordIds: ['w000003', 'w000004'], text: 'اليوم نبدأ،' },
      { startUs: 2_880_000, endUs: 4_080_000, wordIds: ['w000005', 'w000006', 'w000007'], text: 'يعني نبدأ الشرح.' },
    ]);
  });

  it('multi: لغة كل كلمة من المزود', () => {
    const t = fromDeepgram(
      structuredClone(deepgramMulti),
      meta({ modelParams: { model: 'nova-3', language: 'multi', punctuate: true, smart_format: false, mip_opt_out: true } }),
    );
    expect(() => validateTranscript(t)).not.toThrow();
    expect(t.language).toBe('multi');
    expect(t.words.map((w) => w.lang)).toEqual(['ar', 'ar', 'ar', 'en', 'en', 'ar']);
    expect(t.words[3]).toMatchObject({ text: 'cloud', startUs: 1_240_000, endUs: 1_600_000, confidence: 0.8732 });
    expect(t.segments).toHaveLength(1);
  });

  it('يرفض modelParams بلا mip_opt_out=true (المبدأ V)', () => {
    const bad = meta({ modelParams: { model: 'nova-3', language: 'ar-SA' } });
    expect(() => fromDeepgram(structuredClone(deepgramArSa), bad)).toThrow(ConvertError);
    expect(() => fromDeepgram(structuredClone(deepgramArSa), bad)).toThrow(expect.objectContaining({ code: 'mip_opt_out_missing' }));
    const falsy = meta({ modelParams: { model: 'nova-3', language: 'ar-SA', mip_opt_out: false } });
    expect(() => fromDeepgram(structuredClone(deepgramArSa), falsy)).toThrow(expect.objectContaining({ code: 'mip_opt_out_missing' }));
  });

  it('استجابة بلا كلمات أو بشكل غريب → bad_response', () => {
    expect(() => fromDeepgram({}, meta())).toThrow(expect.objectContaining({ code: 'bad_response' }));
    expect(() => fromDeepgram({ results: { channels: [] } }, meta())).toThrow(expect.objectContaining({ code: 'bad_response' }));
    expect(() => fromDeepgram({ results: { channels: [{ alternatives: [{ words: [{ word: 'x' }] }] }] } }, meta())).toThrow(
      expect.objectContaining({ code: 'bad_response' }),
    );
  });

  it('لا يغيّر الاستجابة الخام', () => {
    const raw = structuredClone(deepgramArSa);
    const before = JSON.stringify(raw);
    fromDeepgram(raw, meta());
    expect(JSON.stringify(raw)).toBe(before);
  });
});

describe('fromElevenLabs', () => {
  const elMeta = (): ConvertMeta =>
    meta({ model: 'scribe_v2', modelParams: { model_id: 'scribe_v2', timestamps_granularity: 'word', language_code: 'ar' } });

  it('يحذف spacing وaudio_event، exp(logprob) مقيّدة 0..1، null عند الغياب', () => {
    const t = fromElevenLabs(structuredClone(elevenlabsScribe), elMeta());
    expect(() => validateTranscript(t)).not.toThrow();
    expect(t.provider).toBe('elevenlabs');
    expect(t.model).toBe('scribe_v2');
    expect(t.language).toBe('ar');
    expect(t.words.map((w) => w.text)).toEqual(['السلام', 'عليكم.', 'اليوم', 'نبدأ', 'الشرح']);
    expect(t.words.map((w) => w.id)).toEqual(['w000001', 'w000002', 'w000003', 'w000004', 'w000005']);
    expect(t.words[0]).toMatchObject({ startUs: 80_000, endUs: 560_000 });
    expect(t.words[0]!.confidence).toBeCloseTo(Math.exp(-0.0021), 6);
    expect(t.words[2]!.confidence).toBeCloseTo(Math.exp(-1.2039), 6);
    expect(t.words[3]!.confidence).toBeNull();
    expect(t.words[4]!.confidence).toBe(1); // logprob موجب → مقيّد عند 1
    expect(t.segments).toEqual([
      { startUs: 80_000, endUs: 1_040_000, wordIds: ['w000001', 'w000002'], text: 'السلام عليكم.' },
      { startUs: 2_000_000, endUs: 3_360_000, wordIds: ['w000003', 'w000004', 'w000005'], text: 'اليوم نبدأ الشرح' },
    ]);
  });

  it('يتجاهل كلمة نصّها فارغ ويرفض الشكل الغريب', () => {
    const raw = structuredClone(elevenlabsScribe) as { words: Array<Record<string, unknown>> };
    raw.words.push({ text: '  ', start: 3.4, end: 3.5, type: 'word', logprob: -0.1 });
    expect(fromElevenLabs(raw, elMeta()).words).toHaveLength(5);
    expect(() => fromElevenLabs({ text: 'x' }, elMeta())).toThrow(expect.objectContaining({ code: 'bad_response' }));
  });
});
