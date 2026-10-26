# OpenMontage

**المصادر في خام:** `روابط/https:::x.com:huoshan007:status:2092463295194104276.md`, `روابط/https:::x.com:nftcps:status:2101633446087213537.md`, `روابط/https:::x.com:roundtablespace:status:2092609257338200469.md` (قائمة أدوات تذكره تحت «Motion Designer»)  
**الرابط الأصلي:** https://github.com/calesthio/OpenMontage · https://openmontage.video  
**النوع:** مستودع (نظام إنتاج وكيلي يعمل داخل Claude Code/Cursor/Codex… عبر مهارات وأدوات Python)  
**الترخيص:** AGPL-3.0 · **النجوم:** 72,119 · **آخر تحديث:** 2026-10-24 · **اللغة/الحزمة:** Python + Node (Remotion / HyperFrames) + FFmpeg  
**تحقق من المصدر الأصلي:** نعم (README + استنساخ وقراءة: `skills/meta/video-reference-analyst.md`, `tools/analysis/video_analyzer.py`, `schemas/artifacts/video_analysis_brief.schema.json`, `schemas/artifacts/edit_decisions.schema.json`, `schemas/styles/playbook.schema.json`, `styles/clean-professional.yaml`, `pipeline_defs/clip-factory.yaml`, `skills/pipelines/clip-factory/script-director.md`, `tools/subtitle/subtitle_gen.py`, `docs/PROVIDERS.md`)

## ما هو (3–6 أسطر)
ليس برنامجاً بواجهة؛ هو «مستودع يحوّل وكيل البرمجة إلى استوديو إنتاج». تفتح المجلد في Claude Code وتكتب طلبك، فيقرأ الوكيل ملفات المهارات (`skills/`) وتعريفات خطوط الإنتاج (`pipeline_defs/*.yaml`) ويستدعي أدوات Python (`tools/`) مرحلة بمرحلة: بحث → مقترح → سكربت → خطة مشاهد → أصول → مونتاج → تركيب → نشر. فيه 12 خط إنتاج (explainer، documentary-montage، clip-factory، podcast-repurpose، talking-head، localization-dub…) ولوحة محلية اسمها Backlot تعرض التقدّم وبوابات الموافقة. الميزة التي يتداولها التويتر: «الصق فيديو يعجبك» فيحلّله ويقترح 2–3 نسخ مختلفة بتكلفة تقديرية.

## الأفكار (قائمة)
- **الوكيل هو المنسّق، والمستودع هو «الدليل»:** المنطق الإبداعي مكتوب كمهارات Markdown، والكود أدوات صغيرة حتمية.
- **تحليل الفيديو المرجعي ← موجز منظم (VideoAnalysisBrief) ← مقترحات مختلفة لا نسخة كربونية.**
- **«Playbook» = نمط بصري/صوتي محفوظ كـ YAML** (هوية، ألوان، خطوط، حركة، صوت، توليد أصول، قواعد جودة) — وهذا أقرب شيء رأيناه لفكرة «النمط» عندنا.
- **عيّنة أولاً (Sample-First):** 10–15 ثانية قبل الإنتاج الكامل، إلزامية في المهارة.
- **شفافية التكلفة قبل الصرف:** جدول مقارنة مزودين لكل مقترح، وسجل قرارات `decision_log` وسجل تكلفة `cost_log`.
- **بوابات موافقة بشرية لكل مرحلة** (`checkpoint_required` / `human_approval_default` في كل مرحلة من الـ YAML).

## المميزات (قائمة، ما يفعله فعلاً لا ما يدّعيه التويت)
**كيف «يفكّك» الفيديو المرجعي فعلاً (قلب سؤالنا عن استنتاج النمط):** الجزء الحتمي في الكود رفيع، والباقي يتركه للنموذج متعدد الوسائط:
1. التنزيل عبر yt-dlp بدقة 720p (`video_downloader.py`) أو ملف محلي.
2. التفريغ: `youtube-transcript-api` أولاً (لو يوتيوب)، وإلا Whisper حجم `base` محلياً مع كشف اللغة تلقائياً.
3. كشف المشاهد: PySceneDetect بطريقة `content` وأقل مدة مشهد 0.5 ث.
4. **مقياس الإيقاع (pacing):** متوسط/أقصر/أطول مدة مشهد + `cuts_per_minute`، ثم تصنيف بعتبات ثابتة: متوسط >10ث = `slow_contemplative`، >5 = `steady_educational`، >2 = `dynamic_social`، غير ذلك `rapid_fire`.
5. **تصنيف الحركة لكل مشهد:** Optical flow بطريقة Farneback (OpenCV) على 2–3 أزواج إطارات لكل مشهد بدقة 360p وفاصل 0.4ث: متوسط الحركة <0.5 = `static_image`، تباين <2.0 = `animated_still` (Ken Burns على صورة)، غير ذلك `motion_clip`.
6. لقطات مفتاحية (حتى 20) عند حدود المشاهد ومنتصفاتها.
7. طاقة الصوت (`audio_energy.py`) وسرعة الكلام بالكلمات/الدقيقة من التفريغ.
8. **كل الحقول الأسلوبية** (`color_palette`, `typography_observed`, `transition_types`, `music_style`, `subtitle_style`, `closest_playbook`, `playbook_delta`, `key_elements_to_replicate`, `creative_differentiation_seeds`) تُنشأ **فارغة** في الكود، والمهارة تأمر الوكيل أن ينظر في اللقطات بنفسه ويملأها.
9. المهارة تفرض تفكيكاً بخمسة جوانب لكل لقطة (Subject / Subject Motion / Scene مع فصل الطبقات النصية / Spatial Framing / Camera) مع كتابة N/A صراحةً بدل الإغفال.
10. `_analysis_meta.steps_completed / steps_failed` يسجّل ما نجح وما فشل في التحليل.
- **اختيار المقاطع في clip-factory:** تفريغ أولاً (المهارة تقول: «النص هو سطح البحث عن الخطافات»)، ثم الوكيل يقيّم كل لحظة على `hook / coherence / value / energy / platform_fit`، و«اختبار الاستقلال» (يُرفض المقطع لو فيه ضمائر بلا مرجع أو يبدأ بمقدمة طويلة)، وكشف المشاهد للتحقق من الحدود فقط. أي: **LLM فوق النص، وكشف المشاهد مساعد.**
- **الترجمة النصية (captions):** `subtitle_gen.py` يجمع الكلمات في cues (افتراضياً ≤8 كلمات و≤42 حرفاً للسطر)، يصدّر SRT/VTT/JSON، مع تمييز الكلمة النشطة، وحرق عبر `remotion_caption_burn.py`. التفريغ عبر WhisperX/faster-whisper بطوابع زمنية للكلمات.
- **قائمة مزودين ضخمة:** ~35 أداة صوت/TTS (Google Chirp3-HD، ElevenLabs، OpenAI، Piper محلي، Azure، Cartesia، Fish Audio، Gemini، Kling، Mistral…)، عشرات مزودي فيديو (Kling، Veo، Seedance، Runway، WAN/LTX/Hunyuan محلياً على GPU)، مخزون مجاني Pexels/Pixabay/Unsplash، موسيقى Suno/Pixabay/MusicGen.
- `auto_reframe.py`, `face_tracker.py`, `visual_qa.py`, `composition_validator.py` — مراجعة ذاتية قبل التسليم (ffprobe، عيّنات إطارات، مستويات الصوت).

## التقنيات والبنية
- الحزم/المكتبات: Python 3.10+، FFmpeg، Node 18+ مع Remotion أو HyperFrames للتركيب، PySceneDetect، OpenCV، faster-whisper/WhisperX، yt-dlp، youtube-transcript-api، piper-tts.
- المعمارية: لا يوجد «محرر» ولا تايملاين تفاعلي؛ المشروع مجموعة **Artifacts JSON** موثّقة بـ JSON Schema لكل مرحلة (`brief`, `script`, `scene_plan`, `asset_manifest`, `edit_decisions`, `render_report`, `decision_log`, `cost_log`…). الوكيل يكتب ملفات المرحلة ويستدعي الأدوات عبر `tools.tool_registry` (يكشف ما هو متاح بحسب المفاتيح: `support_envelope()`, `provider_menu()`). محلي في التنفيذ، سحابي في التوليد حسب المفاتيح. التصدير عبر Remotion أو HyperFrames (المهارة تمنع اختيار أحدهما بصمت).
- أمثلة ملموسة:
  - `edit_decisions.schema.json` → `cuts[]` كل عنصر: `id, source, in_seconds, out_seconds, speed, layer(primary|overlay|background), transform{scale, position, animation, crop}, transition_in/out, transition_duration, reason` + `overlays, audio, subtitles, music, transitions, render_runtime`. حقل `reason` لكل قصّة مفيد جداً لنا.
  - `playbook.schema.json` المفاتيح: `identity, visual_language, typography, motion(pacing_rules: min/max_scene_hold_seconds…), audio(music_volume, ducking_threshold_db), asset_generation(image_prompt_prefix, consistency_anchors), overlays, quality_rules, taste_profile, chart_palette, color_rules, overrides`.
  - `pipeline_defs/clip-factory.yaml`: مراحل بـ `required_artifacts_in / produces / tools_available / review_focus / success_criteria` وميزانية افتراضية `budget_default_usd: 1.00`.
  - التكاليف من `docs/PROVIDERS.md`: Google TTS مجاني حتى 1M حرف/شهر، ElevenLabs 10K حرف/شهر مجاناً، Piper مجاني محلي، FLUX Dev ‎$0.03/صورة، Kling 2.5 Turbo ‎$0.07/ث، Veo 3 ‎$0.40/ث، Seedance 2.0 ‎$0.112/ث. أمثلة README: فيلم 60ث = ‎$1.33، وآخر 50ث ≈ ‎$4.

## أشياء نأخذها لمشروعنا (قائمة، كل بند: ماذا + لماذا + أين يخدم الرؤية)
- **بنية `VideoAnalysisBrief` كقالب لـ«تقرير استنتاج النمط»** — يفصل بين ما قِيس حتمياً (إيقاع، حركة، WPM) وما استنتجه النموذج (ألوان، خطوط، انتقالات). ← نظام الأنماط (إنشاء نمط من مراجع §4.2).
- **`steps_completed/steps_failed` + خانات فارغة صريحة** = تحقيق مباشر لمتطلب «إظهار حدود الثقة والخصائص التي لم تُستنتج» (§3). ← نظام الأنماط/الوكيل.
- **`closest_playbook` + `playbook_delta`:** النمط المستنتج يُعبَّر عنه كـ«أقرب نمط جاهز + فروقات» بدل وصف من الصفر — يسهّل المراجعة والمقارنة. ← نظام الأنماط (Style Pack).
- **مقاييس الإيقاع الحتمية (cuts/min، توزيع مدد المشاهد) وتصنيف الحركة بـ optical flow** — رخيصة ومحلية، تصلح كأول طبقة «بصمة نمط» قبل أي نموذج مدفوع. ← نظام الأنماط/التشغيل المحلي.
- **حقل `reason` لكل قصّة في `edit_decisions`** — يحقق «توضيح مصدر كل قرار» (§4.2) ويسهّل تعلّم النمط من تصحيحات المستخدم. ← المحرر/الوكيل.
- **مخطط Playbook YAML** كنقطة بداية لمخطط النمط (نضيف عليه قواعد القص والسلامة والإلزامي/التفضيلي). ← نظام الأنماط.
- **Sample-First + تقدير التكلفة قبل التنفيذ** — يناسب «مختبر الأنماط A/B/C على مقطع قصير». ← نظام الأنماط/التوليد.
- **بوابات الموافقة المعرّفة في ملف الخط (`human_approval_default`)** — مطابقة لـ«مستويات الصلاحية» (§6). ← الوكيل.
- **فرض تفكيك بخمسة جوانب مع N/A صريح** — قاعدة برومبت جيدة لأي محلّل مراجع عندنا. ← الوكيل.

## استلهامات (تجربة المستخدم، التسويق، التسعير، الطريقة التي شرحوا بها المنتج، ما يعجب الجمهور في الردود)
- رسالة التسويق التي انتشرت: «ارمِ فيديو ناجحاً فيفكّك سكربته وإيقاع لقطاته وأسلوبه ويعطيك عدة نسخ» — هذا بالضبط ما يجذب الجمهور، وهو قريب من فكرتنا. يعني أن «استنتاج النمط من مرجع» له طلب واضح.
- كل فيديو عرض في README مذكور معه **التكلفة الدقيقة** ($1.33، ~$4) — يبني ثقة.
- Backlot: لوحة «تمتلئ وحدها» من ملفات المشروع، مع إعادة تشغيل الإنتاج كاملاً (Replay) — فكرة جميلة لسجل العمليات عندنا.
- الأرقام الضخمة (12 خطاً، 100+ أداة، 700+ ملف مهارة) هي ما يتكرر في التغريدات.

## تحذيرات ومخاطر (ترخيص، نضج، اعتماد على API مدفوع، ادعاءات غير مثبتة)
- **AGPL-3.0:** لا يُنسخ كوده لمنتج مغلق أو خدمة شبكية بلا فتح المصدر. نأخذ الأفكار والمخططات فقط ونعيد كتابتها.
- «يفكّك الأسلوب» معظمه **برومبت للنموذج** لا خوارزمية؛ جودة الألوان/الخطوط/الانتقالات تعتمد كلياً على النموذج الذي ينظر للقطات، ولا قياس دقة.
- العتبات (0.5 / 2.0 للحركة، 2/5/10ث للإيقاع) ثابتة ومضبوطة على 360p — غير معايَرة لمحتوى عربي أو أنواع متنوعة.
- تنزيل روابط يوتيوب/تيك توك عبر yt-dlp — مخاطر شروط المنصات وحقوق المحتوى (§12 في الرؤية).
- لا يوجد محرر قابل للتعديل يدوياً؛ الناتج فيديو مُصيَّر + ملفات JSON. التعديل = محادثة جديدة مع الوكيل.
- التكلفة الفعلية تعتمد على مزودين مدفوعين كثيرين؛ أرقام README لأمثلة مختارة.

## أسئلة مفتوحة
- هل نعتمد مخطط Playbook كما هو أساساً لمخطط النمط أم نبدأ من مخططنا ونستعير منه؟
- ما دقة تصنيف الإيقاع/الحركة على فيديوهات عربية حقيقية (بودكاست، دروس، دينية)؟ يحتاج اختبار.
- هل يكفي النموذج متعدد الوسائط لاستنتاج «قواعد القص» (حذف الصمت، حدود القص) أم نحتاج قياساً حتمياً من الصوت؟
- كيف نحوّل `playbook_delta` النصي إلى حقول منظمة قابلة للمقارنة والإصدارات؟

## الحكم: ⭐⭐⭐⭐⭐ (5) — أقرب مرجع لفكرة «استنتاج النمط من فيديو مرجعي + نمط محفوظ YAML + بوابات موافقة»، ومخططاته تستحق الدراسة سطراً سطراً (الكود نفسه AGPL فلا يُدمج).
