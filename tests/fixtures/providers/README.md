# استجابات المزوّدين (T037)

ملفات JSON **مكتوبة يدوياً** على هيئة واقعية تتبع الشكل الموثَّق في مراجع API لكل مزوّد (البحث A §1) — ليست استجابات حقيقية ولا تحوي مفاتيح أو صوتاً.

| الملف | المزوّد / النموذج | الغرض |
|---|---|---|
| `deepgram-ar-sa.json` | Deepgram `nova-3`، `language=ar-SA` | `results.channels[0].alternatives[0].words[]` بثوانٍ عشرية و`confidence` و`punctuated_word`؛ جملتان بترقيم وفجوة ≥ 700 ms |
| `deepgram-multi.json` | Deepgram `nova-3`، `language=multi` | نفس الشكل مع `language` لكل كلمة (عربي/إنجليزي مخلوط) |
| `deepgram-tiny-5s.json` | Deepgram `nova-3`، `language=ar-SA` | مشتق يدوياً لـ`tiny-5s.mp4` (5 ثوانٍ، 30fps): 12 كلمة، فجوة صمت 900 ms بعد «الدرس.» (بند صمت [2.12s, 2.78s]) وحشو «يعني» (بند [2.90s, 3.10s]) — يستهلكه `tests/e2e/us1-import-propose-apply-export.spec.ts` عبر خادم محلي بدل المزود |
| `deepgram-tiny-5s-fillers.json` | Deepgram `nova-3`، `language=ar-SA` | مشتق يدوياً لـ`tiny-5s.mp4` أيضاً: 11 كلمة، ثلاث كلمات حشو «يعني» منفصلة (بنود [0.75s, 0.95s]، [2.85s, 3.05s]، [3.80s, 4.00s]) وفجوة صمت 900 ms بعد «الدرس.» (بند [1.52s, 2.18s])، والكلام بين كل بندَين ≥ 500 ms حتى لا يحظرها `cut.minClipUs` — يستهلكه `tests/e2e/us3-style.spec.ts` (التعلّم من 3 استثناءات بالسبب نفسه، FR-011) |
| `elevenlabs-scribe-v2.json` | ElevenLabs `scribe_v2`، `timestamps_granularity=word` | `words[]` بأنواع `word`/`spacing`/`audio_event` (تُحذف غير الكلمات)، `logprob` → `exp` مقيّد 0..1، كلمة بلا `logprob` → `null` |

تُستهلك في `tests/contract/providers.test.ts` عبر المحوّلات في `src/core/transcript/providers/`.
