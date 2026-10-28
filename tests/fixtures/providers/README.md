# استجابات المزوّدين (T037)

ملفات JSON **مكتوبة يدوياً** على هيئة واقعية تتبع الشكل الموثَّق في مراجع API لكل مزوّد (البحث A §1) — ليست استجابات حقيقية ولا تحوي مفاتيح أو صوتاً.

| الملف | المزوّد / النموذج | الغرض |
|---|---|---|
| `deepgram-ar-sa.json` | Deepgram `nova-3`، `language=ar-SA` | `results.channels[0].alternatives[0].words[]` بثوانٍ عشرية و`confidence` و`punctuated_word`؛ جملتان بترقيم وفجوة ≥ 700 ms |
| `deepgram-multi.json` | Deepgram `nova-3`، `language=multi` | نفس الشكل مع `language` لكل كلمة (عربي/إنجليزي مخلوط) |
| `elevenlabs-scribe-v2.json` | ElevenLabs `scribe_v2`، `timestamps_granularity=word` | `words[]` بأنواع `word`/`spacing`/`audio_event` (تُحذف غير الكلمات)، `logprob` → `exp` مقيّد 0..1، كلمة بلا `logprob` → `null` |

تُستهلك في `tests/contract/providers.test.ts` عبر المحوّلات في `src/core/transcript/providers/`.
