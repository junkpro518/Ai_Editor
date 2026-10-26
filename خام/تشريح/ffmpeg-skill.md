# ffmpeg-skill (kajisho5)

**المصادر في خام:** `روابط/https:::x.com:kebura_p:status:2095736887034212809.md`  
**الرابط الأصلي:** https://github.com/kajisho5/ffmpeg-skill (npm: `ffmpeg-skill`)  
**النوع:** مهارة Claude Code + خادم MCP + مكتبة أدوات CLI  
**الترخيص:** MIT · **النجوم:** 3015 · **آخر تحديث:** 2026-10-26 · **اللغة/الحزمة:** Python (مكتبة قياسية فقط) + غلاف npm  
**تحقق من المصدر الأصلي:** نعم (README + `docs/contract.md` + `scripts/_common/timeline.py` + `examples/brand.json` + `templates/reels.json` + شجرة `scripts/`)

## ما هو (3–6 أسطر)
"محرر فيديو" بلا واجهة للوكلاء: 42 سكربت Python كل واحد يغلّف عملية FFmpeg/ffprobe محددة (قص، دمج، حذف صمت، قياس الأبعاد، ترجمات كاريوكي، رسوم، LUT، مزج صوت، مزامنة كاميرات، Loudness، فحص تسليم...). يفرض على الوكيل سير عمل ثابت: probe ← تعديل بلا إعادة ترميز إن أمكن ← check ← verify. كل أداة متاحة أيضاً كأداة MCP، والكل موصوف بعقد JSON قابل للقراءة آلياً (`contract --json`). محلي بالكامل، بلا مفاتيح API.

## الأفكار
- "اليدين لا الدماغ": المستودع ينفّذ ويقيس فقط، ولا يقرر ماذا يُقص ولا يعيد كتابة نص الترجمة. القرار لوكيل أعلى.
- العقد يُشتق من الكود: `input_schema` لكل أداة يُولَّد من `argparse` نفسه وقت التشغيل، وCI يفشل لو انحرف (سمّوه SPEC: Self-Producing Execution Contract).
- MCP مقتصد: `tools/list` يعرض 12 أداة أساسية فقط لتوفير سياق العميل، والـ42 كلها قابلة للاستدعاء بالاسم.
- مشروع تصريحي `project.json` يُرندر كاملاً بـ `render.py`، مع `--dry-run` و `--cache`/`--from STAGE`.
- تصدير التايم لاين لمحرر احترافي بدل الرندر: `render.py --export-timeline edit.fcpxml|.edl|.otio`.
- رفض صادق بدل التخمين: مثلاً `cut.py --snap beats` يرفض لو ثقة الإيقاع منخفضة.

## المميزات
- 42 أداة: `probe, cut, join, silence, fit, caption, graphics, overlay, color, loudness, sync, multicam, scenes, render, batch, check, look, verify...`
- `scenes.py`: تغيّر المشاهد، قمم الصوت، شبكة الإيقاع (`--beats`)، تصنيف اللقطات ثابت/Pan/حركة بالـ optical flow.
- `caption.py --transcribe` بتفريغ محلي اختياري (whisper.cpp / faster-whisper / parakeet) و `--animate pop --karaoke`، واختيار خط تلقائي حسب نظام الكتابة (يشمل العربية) مع فحص `doctor` للخطوط.
- قوالب تسليم جاهزة: `reels, shorts, tiktok, youtube, x, linkedin, podcast, audiogram...` (ملفات JSON في `templates/`).
- `brand.json`: خط، ألوان، شعار وموضعه، هامش آمن، نمط الترجمة (حجم/موضع/حركة/كاريوكي)، هدف Loudness.
- `look.py` يصنع contact sheet للتحقق البصري، و `check.py` يتحقق من مواصفات المنصة.
- `doctor --json` يفحص قدرات بناء FFmpeg على الجهاز ويقول لكل أداة هل هي قابلة للاستخدام.
- Evals منشورة (100 برومبت، توجيه 95%) مع نتائج صريحة عن الإخفاقات.

## التقنيات والبنية
- الحزم/المكتبات: Python stdlib فقط، FFmpeg 5.1–9 مختبر في CI، تفريغ محلي اختياري، VideoToolbox اختياري على Apple Silicon.
- المعمارية: سكربتات مستقلة بمخرجات `--json` موحدة ← `_contract.py` يجمعها في عقد ← `mcp/server.py` يعرضها. المشروع الكامل = `project.json` (clips, frame{aspect,fit}, captions, graphics, overlays, music, loudness, export, check, brand). التصدير إلى المحررات في `scripts/_common/timeline.py`:
  - EDL (CMX)، FCPXML 1.10 (`<fcpxml version="1.10">` مع `adjust-conform` لطريقة ملء الإطار)، OTIO (JSON بـ `OTIO_SCHEMA: Timeline.1 / Track.1 / Clip.2 / Transition.1 / LinearTimeWarp.1 / Marker.2`).
  - ما ينتقل: المقاطع (in/out وسرعة)، الـ dissolve (مقسوم d/2 على جانبي القطع ليطابق طول الرندر)، الموسيقى كمسار صوت مستقل، الفصول كـ markers، معدلات NTSC ككسور دقيقة (30000/1001).
  - ما لا ينتقل يُذكر صراحة في `not_exported`: الترجمات (استوردها كـ .srt)، الرسوم، الطبقات، قص الصمت، الـ reframe، معالجة الصوت، Loudness، البراند.
- أمثلة ملموسة: `render.py project.json --export-timeline edit.otio`، `multicam.py --switch energy --write-project`، `cut.py --snap beats --snap-tolerance`، `FFMPEG_SKILL_MCP_FULL=1`.

## أشياء نأخذها لمشروعنا
- **العقد المشتق من الكود** (schema واحد يولّد CLI وMCP والتوثيق) — يحقق نقطة الرؤية "سجل أوامر موحد لكل الواجهات" — الوكيل/MCP.
- **مبدأ `not_exported`**: أي تصدير لمحرر خارجي يذكر ما سقط بدل الحذف الصامت — التصدير.
- **OTIO كصيغة وسيطة** للتصدير إلى Premiere/Resolve/FCP، وFCPXML حين نحتاج conform — التصدير.
- **`brand.json` + قوالب المنصات** كنواة أولى لحقول "النمط" (ترجمة، ألوان، Loudness، هوامش) — نظام الأنماط.
- **سير probe ← edit ← verify + contact sheet** كخطوة إلزامية قبل إعلان "تم" — الوكيل/المراجعة الذكية.
- **رفض صادق عند الشك** (beats بثقة منخفضة) — يخدم "إظهار حدود الثقة" في تحليل الأنماط.
- **عرض 12 أداة فقط في `tools/list`** لتقليل استهلاك سياق العميل — MCP.
- يمكن استخدامه كمحرك FFmpeg خلفي فعلي (MIT) بدل كتابة أغلفة من الصفر — التشغيل.

## استلهامات
- README يعرض كل ميزة بصورة GIF قبل/بعد مع الأمر الحرفي تحتها، وكل الديمو يُعاد بناؤه من لقطات اصطناعية.
- الصراحة في جداول الـ evals ("7/8 routed" مع سبب الفشل) تبني ثقة أكثر من الادعاءات.
- التويت باليابانية سوّق بأمثلة لغة طبيعية ("خلّه 9:16"، "قص الصمت") — نفس الطريقة تنفع لعرض منتجنا.

## تحذيرات ومخاطر
- لا "دماغ": لا يختار ماذا يقص ولا يكتشف وجوهاً — يحتاج طبقة تخطيط فوقه.
- التصدير للمحررات يحمل القص والانتقالات والموسيقى فقط؛ الترجمات والرسوم والبراند لا تنتقل.
- الريبو يتغيّر بسرعة (إصدارات يومية تقريباً)؛ يجب تثبيت نسخة بالـ tag.
- تراخيص FFmpeg نفسها (GPL/LGPL حسب البناء) تبقى مسؤوليتنا.

## أسئلة مفتوحة
- هل `project.json` الخاص بهم قريب كفاية من Project Document الذي نحتاجه، أم نستعمله صيغة تصدير فقط؟
- كيف يتعامل مع ترجمات عربية RTL داخل `drawtext`/ASS فعلياً؟ (يذكر دعم الخط لا جودة التشكيل).
- هل OTIO المصدَّر يُفتح فعلاً في Premiere دون محوّل وسيط؟ (Premiere يحتاج plugin لـ OTIO؛ FCPXML/EDL أسلم).

## الحكم: ⭐⭐⭐⭐⭐ — أنضج مثال رأيناه لمحرك FFmpeg موجّه للوكلاء بعقد آلي وMCP وتصدير EDL/FCPXML/OTIO، وMIT.
