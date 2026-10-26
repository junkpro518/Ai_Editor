# MoneyPrinterTurbo

**المصادر في خام:** `روابط/https:::x.com:cnemalek:status:2093230528782532685.md`, `روابط/https:::x.com:khaledhammadi32:status:2098856012597915946.md`, `روابط/https:::x.com:nozelcode:status:2089389291067544039.md`, `روابط/https:::x.com:remix_ksa:status:2093357381241446604.md`, `روابط/https:::x.com:samibizconsult:status:2088731203075801189.md`  
**الرابط الأصلي:** https://github.com/harry0703/MoneyPrinterTurbo  
**النوع:** مستودع (WebUI بـ Streamlit + API بـ FastAPI + CLI + مهارة وكيل)  
**الترخيص:** MIT · **النجوم:** 135,395 · **آخر تحديث:** 2026-10-26 · **اللغة/الحزمة:** Python 3.11 (uv)، MoviePy + FFmpeg  
**تحقق من المصدر الأصلي:** نعم (README-en + استنساخ وقراءة: `app/models/schema.py`, `app/services/llm.py`, `app/services/task.py`, `app/services/subtitle.py`, `app/services/voice.py`, `app/services/video.py`, `app/services/video_project.py`, `app/services/twelvelabs.py`, `config.example.toml`, `docs/skill/SKILL.md`)

## ما هو (3–6 أسطر)
مولّد فيديو قصير «من موضوع إلى MP4»: تكتب موضوعاً، فيكتب LLM السكربت، ثم يستخرج كلمات بحث إنجليزية، ويجلب مقاطع مخزون من Pexels/Pixabay/Coverr (أو يولّدها بمزودي فيديو AI)، ويضيف تعليقاً صوتياً وترجمة نصية وموسيقى، ويصدّر 9:16 أو 16:9 أو 1:1، مع نشر اختياري لـ TikTok/Instagram/YouTube Shorts. هو **توليد من الصفر لا مونتاج لمادة المستخدم** (يقبل رفع صور/فيديوهات محلية كمواد، لكن لا يحلّلها).

## الأفكار (قائمة)
- خط إنتاج خطي ثابت: سكربت ← كلمات بحث ← مواد ← صوت ← ترجمة ← تجميع.
- كل إعدادات الفيديو في كائن واحد `VideoParams` (Pydantic) — يُحفظ ويُستورد ويُصدَّر كإعداد مسبق.
- دفعات: `video_count` لإنتاج عدة نسخ واختيار الأفضل.
- «أعطِ المهارة لوكيلك»: ملف `SKILL.md` يثبّت ويضبط ويولّد بلا أسئلة.

## المميزات (قائمة، ما يفعله فعلاً لا ما يدّعيه التويت)
- **اختيار المواد ليس «اختيار لقطات» بالمعنى التحريري:** `llm.generate_terms()` يطلب من النموذج مصفوفة JSON من كلمات بحث إنجليزية (1–3 كلمات، 5 افتراضياً أو 8 عند `match_materials_to_script`) ← بحث في Pexels/Pixabay/Coverr ← تقطيع كل مادة إلى مقاطع بطول `video_clip_duration` (افتراضي 5ث) ← دمج **عشوائي** (`video_concat_mode=random`) أو بترتيب السكربت. لا كشف مشاهد ولا تحليل محتوى للمواد.
- **اختياري:** TwelveLabs Marengo (embeddings) لإعادة ترتيب كلمات البحث حسب صلتها بالموضوع، وPegasus لفحص أن المقطع يطابق السكربت.
- **الترجمة النصية:** الوضع الافتراضي `subtitle_provider = "edge"` يأخذ توقيت الكلمات من Edge TTS نفسه (WordBoundary) فلا يحتاج GPU؛ البديل `whisper` عبر faster-whisper (افتراضي `large-v3` على CPU بـ int8) لصوت مرفوع أو دقة أعلى. لا يرجع لـ Whisper تلقائياً عند الفشل (قرار مقصود لتجنب تنزيل عدة GB بلا علم المستخدم). تصحيح النص بمسافة Levenshtein مقابل السكربت (`subtitle.correct`).
- أنماط عرض الترجمة: `sentence` أو `word_by_word`، وحركة `subtitle_animation` (spring scale)، الموضع top/bottom/center/custom، لون/حدّ/خلفية مستديرة، فحص أن الخط يدعم الحروف.
- **TTS:** Edge TTS مجاني بلا مفتاح (افتراضي)، Azure، SiliconFlow، Gemini، MiMo، MiniMax، ElevenLabs، Chatterbox، Kokoro، Fish Audio، VoxCPM، أو بلا صوت، أو ملف صوت مرفوع.
- **LLM:** OpenAI، Claude (حتى عبر اشتراك Claude Code)، Gemini، DeepSeek، Qwen، Kimi، Ollama، OpenRouter، LiteLLM… كثير.
- **فيديو AI بدل المخزون:** Seedance (Volcengine)، MiniMax H3، OFox، MuAPI، WaveSpeed، وتحويل صور مولّدة إلى مقاطع بحركة zoom.
- انتقالات محدودة: Shuffle/FadeIn/FadeOut/SlideIn/SlideOut/ZoomIn/ZoomOut.
- نشر عبر خدمة Upload-Post (`upload_post.py`).
- **`video_project.py` (اكتشاف مهم):** وضع اختياري «مراجعات محلية» — manifest JSON بإصدار مخطط، وإعدادات تصيير (`RenderSettings`: width/height/fps/narration_volume/bgm_volume)، وكل مرحلة لها `fingerprint` (SHA-256 للمدخلات) و`dependencies` لإعادة التصيير الجزئي فقط لما تغيّر، مع أوامر CLI: `revise`, `render --retry`, `compare before after`, `preset`. ويرفض صراحةً أي إعدادات مزود/مفاتيح داخل المشروع.

## التقنيات والبنية
- الحزم/المكتبات: MoviePy، FFmpeg (مع fallback لترميز العتاد)، edge-tts، faster-whisper، Pydantic، FastAPI، Streamlit، pydub.
- المعمارية: مهمة (task) لكل فيديو في مجلد خاص؛ `task.py` ينسّق المراحل؛ لا تمثيل تايملاين متعدد المسارات — الناتج يُبنى مباشرة بـ MoviePy ثم concat بـ FFmpeg. محلي التنفيذ، وكل الذكاء عبر APIs. التصدير MP4 بمقاسات ثلاثة.
- أمثلة ملموسة:
  - `VideoParams`: `video_subject, video_script, video_terms, video_aspect, video_concat_mode, video_transition_mode, video_clip_duration, match_materials_to_script, video_count, video_source, voice_name, voice_rate, bgm_volume(0.2), subtitle_position, subtitle_display_mode, subtitle_animation, font_name, text_fore_color, stroke_width…`.
  - برومبت كلمات البحث في `llm.py` (`# Role: Video Search Terms Generator` … «reply with english search terms only»).
  - `config.toml`: `video_source = "pexels"`, `pexels_api_keys = []`, `subtitle_provider`, `[whisper] model_size/device/compute_type`.
  - التكلفة: المسار الافتراضي (Pexels مجاني + Edge TTS مجاني) لا يكلّف إلا استدعاءات LLM للسكربت والكلمات؛ مزودو الفيديو AI مدفوعون بالثانية.

## أشياء نأخذها لمشروعنا (قائمة، كل بند: ماذا + لماذا + أين يخدم الرؤية)
- **ترجمة نصية من توقيت TTS (WordBoundary) بدل التفريغ** عندما يكون الصوت مولَّداً — مجانية وفورية وبلا GPU. ← التوليد/الترجمة.
- **عدم الرجوع الصامت لنموذج ثقيل** (Whisper) — مبدأ «لا تكلفة/تنزيل مخفي» يتوافق مع شفافية التكلفة. ← التشغيل.
- **تصحيح الترجمة بمقارنة Levenshtein مع النص المعروف** — مفيد للنصوص الدينية حيث النص الأصلي معروف (آية/حديث). ← الترجمة/النمط الديني.
- **`video_project.py`: بصمات المراحل والتصيير التزايدي + `compare`** — نموذج جيد لـ«معاينة مطابقة للتصدير» وإعادة التصيير بعد تعديل صغير بدل الكل. ← المحرر/التصدير.
- **فصل الإعدادات المسبقة (preset) عن المفاتيح والمزودين** داخل ملف المشروع — مهم لمشاركة Style Packs بلا تسريب مفاتيح. ← نظام الأنماط/الأمان.
- **حقول تنسيق الترجمة في `VideoParams`** قائمة جاهزة لحقول «النصوص والترجمة» في مخطط النمط (§4.1). ← نظام الأنماط.
- **فحص دعم الخط للحروف (`subtitle_font_supports_text`)** — ضروري للعربية. ← المحرر.

## استلهامات (تجربة المستخدم، التسويق، التسعير، الطريقة التي شرحوا بها المنتج، ما يعجب الجمهور في الردود)
- الاسم «طابعة الفلوس» نفسه تسويق؛ والتغريدات العربية والإسبانية تكرر: مجاني، 100K+ نجمة، «تكتب جملة وحدة والباقي عليها»، بلا GPU، الصوت مجاني بلا مفتاح.
- تعدد طرق الاستخدام (ويب/API/CLI/مهارة وكيل) يُذكر كميزة بحد ذاته.
- حزمة ويندوز «فك الضغط واضغط مرتين» — تقليل الاحتكاك مهم للجمهور غير التقني.
- سامي المحيميد لخّص القيمة الحقيقية: «شغل كان يحتاج 5–6 أدوات صار سير عمل واحد تشغّله محلياً».

## تحذيرات ومخاطر (ترخيص، نضج، اعتماد على API مدفوع، ادعاءات غير مثبتة)
- MIT — آمن للاستعارة مع حفظ الإشعار.
- النتيجة «فيديو مخزون عام» بلا هوية؛ الدمج العشوائي للمواد لا يضمن تطابقاً دلالياً مع كل جملة.
- لا يحرّر مادة المستخدم الخام — فهو منافس لجزء «التوليد» فقط لا لجوهر منتجنا.
- `SKILL.md` يأمر الوكيل بالتثبيت والتشغيل **بلا طلب تأكيد** — عكس فلسفة الموافقات عندنا؛ ومخاطر أمنية لو قُلِّد.
- النشر التلقائي يعتمد على خدمة طرف ثالث (Upload-Post) وشروط المنصات.
- Edge TTS خدمة غير رسمية من مايكروسوفت قد تُحجب (مشروع آخر في الدفعة ذكر رفض الإصدار 6.x بـ 403).

## أسئلة مفتوحة
- هل نحتاج مسار «توليد من موضوع» أصلاً في النسخة الأولى، أم نكتفي بمونتاج مادة المستخدم؟
- جودة Edge TTS العربية وتوقيت WordBoundary للعربية — هل تكفي للترجمة كلمة بكلمة؟
- هل نتبنى نموذج البصمات (fingerprints) نفسه لتايملاين متعدد المسارات أم يكفي على مستوى المشهد؟

## الحكم: ⭐⭐⭐ (3) — شهرة ضخمة لكنه مولّد قوالب لا محرر أنماط؛ أفيد ما فيه: ترجمة من توقيت TTS، وتصيير تزايدي بالبصمات في `video_project.py`.
