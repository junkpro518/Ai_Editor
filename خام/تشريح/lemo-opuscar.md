# Lemo-Opuscar — مكتبة «ستايلات أفلام بالكود» لـClaude Code

**المصادر في خام:** `ريلز-المالك/09-malik.ai.tech-DewJI_DjKLc.md` (الشريحة 02 «كتالوج ستايلات»)  
**الرابط الأصلي:** https://github.com/lemomo-ai/lemo-opuscar · المعرض: https://lemomo-ai.github.io/lemo-opuscar/  
**النوع:** مستودع = مكتبة ستايلات (برومبت + فيلم تجريبي بالكود) + أدوات تصيير/صوت مشتركة (`core/`) + Plugin لـClaude Code (`lemo-opuscar@lemolab`)  
**الترخيص:** الكود والتوثيق MIT · الأفلام التجريبية وصورها CC BY 4.0 (ما عدا ثلاث تسجيلات صوتية مستثناة) · **النجوم:** 8,279 · **آخر تحديث:** 2026-10-24 · **اللغة/الحزمة:** JavaScript (Canvas2D/WebGL/three.js) + `playwright-core` للتصيير فريم فريم + Python (numpy/scipy للصوت، Kokoro/edge-tts/faster-whisper) + ffmpeg؛ Node ≥20، Python ≥3.11  
**تحقق من المصدر الأصلي:** نعم — استنساخ عميق 1؛ قرأت `README.md` و`LICENSE` و`AGENTS.md` و`CLAUDE.md` و`MY-STYLES.md` (كامل) و`MAINTAINING.md` و`styles/README.md` و`styles/_template/{STYLE.md,DEMO.md,style.json}` و`plugin/skills/lemo-opuscar/SKILL.md` و`scripts/setup.sh` و`core/README.md` وأجزاء من `TECHNIQUE.md` (§2، §3، §7) و`DIRECTOR.md` (§11، §12)؛ وستايلات: `caption-news` (STYLE.md كامل + `demo/timeline.json`)، `watercolor` (STYLE.md + DEMO.md + style.json)، `kino-montage` (style.json)، و`styleboard/catalog.json`.

## ما هو (3–6 أسطر)
مكتبة فيها 59 «ستايل فيلم» (حسب العدّاد في README؛ الريل قال 43، والفيلم الدعائي يذكر 98). كل ستايل مجلد فيه `STYLE.md` (برومبت طويل ~120 سطر يصف «ثوابت» الستايل فقط) + `style.json` (بيانات وصفية) + `DEMO.md` (كيف انصنع فيلم المثال) + `demo/` (كود الفيلم كامل). الوكيل (Claude Opus 5.5 تحديداً) يقرأ الستايل ويكتب فيلماً جديداً من الصفر على موضوعك: رسم بـCanvas/WebGL، موسيقى من مكتبات عينات مجانية، صوت TTS، ومكساج — بلا أي نموذج توليد فيديو ولا لقطات جاهزة. وفيه مسار «اجعل الستايل حقّك» (`MY-STYLES.md`) يعدّل ستايلاً من المكتبة أو يبني واحداً من الصفر ويحفظه في `~/lemo-my-styles/`.

## الأفكار
- **فصل صارم بين «الثوابت» و«المثال»:** `STYLE.md` = ما يبقى صحيحاً لكل فيلم (المادة، منطق اللون، الخط، الحركة، الكاميرا، الصوت، الحركات المميزة، المزالق)؛ `DEMO.md` = قصة فيلم واحد فقط، ويبدأ دائماً بجملة: "One example among many. Don't reuse its story, arc, shots, props or timings."
- **«المعالجة أولاً ثم المثال»:** الوكيل ممنوع يفتح `DEMO.md` أو كود المثال قبل ما يكتب `TREATMENT.md` بثلاث بنى مرشّحة — عشان ما ينسخ القصة. وبعد التسليم يقارن: 4 من 6 عناصر (البنية، الافتتاح، اللقطة المميزة، مسار الكاميرا، شكل الموسيقى، الخاتمة) لازم تختلف عن المثال.
- **الصورة دالّة في الزمن:** كل فيلم صفحة HTML فيها `window.render(t)` حتمية، والتصيير فريم فريم عبر متصفح بلا واجهة.
- **خط زمني واحد يقود كل شيء:** نفس الملف يقرأه الرسم والكابشن (`.srt`) والمكساج والفحوصات.
- **«الستايل الخاص» نسخة من ستايل أساس + سجل تغييرات:** `based_on` + `borrows` + `CHANGES.md` (قبل/بعد/لماذا)، مع إطار مقارنة جنب بجنب (الأصل يسار، نسختك يمين).
- **تقسيم أقسام الستايل إلى ثلاث مجموعات:** «آمن للتغيير» / «يغيّر شخصية الستايل» / «ممنوع — هذا ستايل آخر».

## المميزات (ما يفعله فعلاً)
- تثبيت كـPlugin: `claude plugin marketplace add lemomo-ai/lemo-opuscar` ثم `claude plugin install lemo-opuscar@lemolab`؛ أول استخدام يستنسخ المكتبة (sparse، بدون كود الأمثلة والصور الكبيرة) إلى `~/lemo-opuscar`.
- تطلب الفيلم بجملة: «Make a 45-second film in the **watercolor** style about…»؛ الاسم بالإنجليزي أو الصيني أو اسم المجلد، يبحث في `styles/README.md`.
- جولة أسئلة واحدة فقط في البداية (موضوع، مواد خاصة: صوت/موسيقى/شعار، اللغة، هل تبي ستوري بورد)؛ بعدها لا يرجع بأسئلة. الستوري بورد اختياري وهو نقطة التوقف الوحيدة.
- المراحل: Brief → `TREATMENT.md` → إطارات ستايل بالكود الحقيقي → (ستوري بورد) → صوت → موسيقى → أنيميشن → مكساج → تصيير → فحص ذاتي وجولة إصلاح واحدة.
- أدوات `core/`: `still.mjs` (لقطات مراجعة)، `video.mjs` (تصيير بعدة عمّال)، `readcheck.mjs` (يتأكد كل نص يبقى على الشاشة وقتاً كافياً للقراءة: حروف CJK ÷ 4.5 + غيرها ÷ 15 + 1.5 ث)، `srt.py`، `mux.sh` (loudnorm −14 LUFS)، `tts.py` (Kokoro محلي)، `tts_zh.py` (edge-tts سحابي)، `asr_check.py` (Whisper يتأكد أن كل جملة صوت تُسمع صح).
- «اجعل الستايل حقك»: 5 خطوات (تخطيط سؤال سؤال بحد ~10 أسئلة → ملخص قبل/بعد/التكلفة وانتظار الموافقة → إطار ستايل واحد ومقارنة بالأصل → فيلم تجريبي 15–30 ث → «احفظه كستايلي / جولة أخرى / ليس الآن»).
- التسليم: `<name>.mp4` + `poster.jpg` + `.srt` + `TREATMENT.md` + `CREDITS` + المصدر مع `build.sh` بأمر واحد.
- الفيلم الواحد ياخذ 30–60 دقيقة من الوكيل وتوكنز كثيرة (بنصّ README).

## التقنيات والبنية
**تخطيط المستودع (الحقيقي):**
```
styles/<slug>/
  style.json      ← البيانات الوصفية (المصدر الوحيد للمعرض والفهارس)
  STYLE.md        ← برومبت الستايل: الثوابت فقط، أقسام مرقّمة ثابتة
  DEMO.md         ← قصة فيلم المثال ولقطاته وموسيقاه وملاحظات البناء
  demo/           ← كود المثال: index.html, main.js, timeline.json, build.sh, CREDITS, tools/, audio/
  <slug>.srt, poster.jpg   (الفيديو نفسه في GitHub Releases)
styles/_template/ ← قوالب الثلاثة ملفات
core/             ← render/, tts/, audio/, fonts/, three/, lib.js
AGENTS.md, DIRECTOR.md, TECHNIQUE.md, MY-STYLES.md, MAINTAINING.md
```

**`style.json` لستايل في المكتبة** (مثال `watercolor`، مختصر):
```json
{ "slug": "watercolor", "num": "02", "en": "Watercolor Brush", "cn": "水彩笔刷",
  "category_en": "Hand-drawn & Painting", "film": "Follow the Rain",
  "line": "Follow the rain from Australia's red desert heart…",
  "uses": ["Nature documentary","Travel","Science explainers"],
  "frame_sec": 68.16, "dur": 113.6 }
```
ملاحظة: `style.json` وصفي للمعرض فقط — **ما فيه ولا قاعدة**. كل القواعد نص حر في `STYLE.md`.

**`STYLE.md` — الأقسام الثابتة (من `_template`):** مقدمة (سطر وصف + "References (grammar only)") ثم: §1 Essence, and what it is not · §2 Materials & rendering · §3 Colour logic · §4 Type & subtitles · §5 Motion quality · §6 Camera grammar · §7 Sound palette · §8 Native moves · §9 Pitfalls · §10 Engine · §11 Variation space. القالب يقول: "Section numbers are fixed: other guides refer to them" و"A number measured in the demo becomes a rule here". حجم مستهدف 6–11 KB. ستايلات «المونتاج والوثائقي» ترقيمها مختلف (مثلاً `caption-news` فيها 12 قسماً: Frame and layout، Editing grammar، Caption card…).

**مثال حقيقي — قواعد الكابشن في `caption-news/STYLE.md` §4** (أقرب شيء لنظام الكابشن عندنا):
> "Split into 2–3 chunks with `|` in the timeline; each chunk slams 0.12 s after the previous: scale 1.3 → 1 in 0.13 s… **Keyword**: `{…}` inside a chunk; a honey-yellow block `#FFC21A` wipes left → right in 0.12 s… One keyword per caption, at most."
> "A caption is on screen ≥ 1.8 s and ideally ≥ the spoken line + 0.6 s; the Chinese is a paraphrase short enough to read in that time (≤ ~14 characters)."

وقواعد المونتاج §3: "Cuts on a 120 BPM half-beat grid (every cut at a multiple of 0.5 s). Footage shots 1.5–3 s"، "Captions change at most every ~2.5 s even when shots change every 1.5 s".

**`demo/timeline.json` (caption-news)** — صيغة الكابشن كبيانات:
```json
{ "fps": 30, "dur": 59.5, "bpm": 120,
  "vo": { "L01": 0.15, "L02": 7.8, … },
  "caps": [ { "t0": 7.6, "t1": 10.5, "zh": "接近|年初总数的|{一半}",
              "en": "Nearly half of what they started with." } ] }
```
`|` = حدود المقاطع، `{}` = الكلمة المفتاحية المظلّلة. نفس الملف يغذي الصفحة و`tools/cues.py` (→ `.srt`) و`audio/mix.py`.

**عقد الصفحة (`core/README.md`):** `window.READY`، `window.render(t)` حتمية، `window.DUR`، `window.EV=[{t,type,…}]` لأحداث الصوت، `window.TEXTS(t)=[{id,text,x0,y0,x1,y1}]` لفحص القراءة.

**الستايل الخاص بالمستخدم — `~/lemo-my-styles/<slug>/`** (من `MY-STYLES.md`):
| ملف | المحتوى |
|---|---|
| `style.json` | `slug`, `en`, `cn`, `based_on`, `borrows`, `size` (إن لم يكن 1920×1080), `library_version` (`git rev-parse --short HEAD` للمكتبة), `created`, `line`, `line_cn` |
| `STYLE.md` | نسخة **كاملة** من `STYLE.md` الأساس والتعديلات مكتوبة داخل أقسامها ("no 'see the base' gaps")، وتحت العنوان: `Based on <base name> (<base slug>) from Lemo-Opuscar.` |
| `CHANGES.md` | صف لكل قرار: section, base, now, why — "This is what the user approves and what you check the demo film against" |
| `DEMO.md` + `demo/` | الفيلم التجريبي ومصدره مع `build.sh` و`CREDITS` |
| `styleframe.jpg`, `styleframe-vs-base.jpg` | الإطار المعتمد + المقارنة جنب بجنب |
| `test.mp4`, `test.jpg` | الفيلم التجريبي وبوستره |
وفهرس `~/lemo-my-styles/README.md`: صف لكل ستايل (اسمين، slug، الأساس، سطر وصف، المسار إن كان خارج المجلد) — "it's how a later session finds a style by name".

**كيف يختار الوكيل الستايل ويطبّقه:** `AGENTS.md` → «Start»: يقرأ `~/lemo-my-styles/README.md` أولاً (ستايلات المستخدم تُبحث قبل المكتبة) → يطابق الاسم في `styles/README.md` → يقرأ `STYLE.md` كاملاً ("**`STYLE.md` is fixed** … Keep all of it") وكل الباقي (قصة، شخصيات، لقطات، توقيتات) حرّ للوكيل. لا يوجد كود يفسّر الستايل — **التطبيق كله عبر قراءة النموذج للنص** + نسخ تقنيات من `demo/` (`setup.sh demo <slug>` بعد كتابة المعالجة).

**التركيب (composition):** أساس واحد فقط. "If they want to mix two, take the one whose §1 Essence is closest as the base and take only what they want from the other, as changes (list it in `borrows`)". من صفحة بيضاء: أساس تقني واحد + "at most two to borrow moves from". حد 5 تغييرات لكل جولة، وتبديل «حركة مميزة» واحدة كحد أقصى.

**الإصدارات:** بدائية — `library_version` يثبّت نسخة المكتبة وقت الإنشاء؛ لو تغيّر `STYLE.md` الأساس بعدها: "mention it once and offer to bring the useful fixes into their copy. Don't change their style without asking." لا رقم إصدار للستايل الخاص نفسه، والمراجعة (§7) **تستبدل** الملفات (`replace demo/ and DEMO.md`) بلا تاريخ. ستايلات المكتبة: "Back up first (old versions move out of the repository, not into git)".

**هل يتعلّم من المستخدم؟** لا. ما فيه أي آلية تلتقط تصحيحات المستخدم أثناء فيلم وتحوّلها لقواعد. «التعلّم» الوحيد: حوار صريح منظّم ينتج `CHANGES.md` يوافق عليه المستخدم. ملاحظات المستخدم بعد التسليم = "new rounds: change only what they ask" على الفيلم فقط، ولا تُرفع للستايل.

**مسار «اجعل الستايل حقك» خطوة بخطوة (`MY-STYLES.md` §1–§7):**
1. **نقطة البداية:** تعديل ستايل من المكتبة (المستخدم يكتب الاسم من القائمة الكاملة) أو صفحة بيضاء (وصف/صورة/فيلم مرجعي → الوكيل يختار «أساساً تقنياً» ويشرح السبب في سطر).
2. **التخطيط:** سؤال واحد لكل رسالة عبر `AskUserQuestion`، 2–3 خيارات، الموصى به أولاً ومعلّم (Recommended)، و**Free conversation** آخر خيار. الترتيب: الاستخدام والمقاس والهوية → ما الذي يتغيّر (بالمجموعات الثلاث) → قسم قسم → الاسم.
3. **الكتابة في مسودة** داخل مجلد المشروع (`<slug>-test/style/`) — لا شيء يُحفظ في `~/lemo-my-styles/` قبل الموافقة.
4. **إثبات الشكل:** إطار واحد بالكود الحقيقي + نفس الإطار بإعدادات الأصل جنب بجنب؛ لو بعد جولتين ملاحظات ما ضبط: "say so and suggest a closer base".
5. **فيلم تجريبي 15–30 ث:** "Every row of `CHANGES.md` is clearly on screen at least once" — أي أن سجل التغييرات هو معيار القبول.
6. **الحفظ:** ثلاثة خيارات (احفظه / جولة أخرى / ليس الآن)، والاسم والـslug لازم ما يتعارض مع المكتبة أو الفهرس.
7. **الاستخدام لاحقاً:** يُقرأ `STYLE.md` الخاص بدل ستايل المكتبة، والتقنيات من `demo/` الخاص ثم من `$LIB/styles/<based_on>/`.

**بوابات الجودة في المكتبة (`MAINTAINING.md` «Gates»):** بشرية (اعتماد إطار الستايل قبل الإنتاج، واعتماد الفيلم النهائي) + آلية (`asr_check.py`، ‏`mux.sh` ≈ −14 LUFS، ‏`readcheck.mjs`، ‏`release.py check --strict`) + للأحداث الحقيقية: كل رقم في `demo/FACTS.md` (الادعاء، الرابط، النص المقتبس).

**محلي أم سحابي:** التصيير والموسيقى والمكساج و Kokoro و Whisper محلية بالكامل؛ edge-tts (للصيني) سحابي؛ الوكيل نفسه Claude (سحابي ويُفوتر على المستخدم). المواد الحقيقية (ستايلات الوثائقي) تُجلب من Wikimedia/NASA/Internet Archive مع سجل تراخيص `SOURCES.jsonl`.

## أشياء نأخذها لمشروعنا
- **قالب أقسام ثابتة مرقّمة للنمط** (Essence/Materials/Colour/Type/Motion/Camera/Sound/Native moves/Pitfalls/Engine/Variation): هيكل جاهز لملف النمط عندنا، بعد تحويل الأقسام النصية لحقول منظمة حيث يمكن — **نظام الأنماط**.
- **فصل «الثوابت» عن «المثال»** (`STYLE.md` مقابل `DEMO.md` مع تحذير صريح ضد نسخ المثال): نطبّقه بفصل قواعد النمط عن «أمثلة/سوابق» التصحيحات — **نظام الأنماط**.
- **«CHANGES.md» كمعيار قبول**: كل صف تغيير لازم يظهر في المعاينة — عندنا: كل قاعدة جديدة يقترحها التعلّم تُعرض في معاينة تُظهر أثرها بالذات قبل الاعتماد — **التعلّم**.
- **المسودة قبل الحفظ** (لا شيء يدخل مكتبة المستخدم قبل «احفظه»): تحديثات النمط المقترحة تبقى مسودة في المشروع حتى يوافق المستخدم — **نظام الأنماط**.
- **«Essence, and what it is not»**: كل نمط يعرّف نفسه بالنفي أيضاً (ليس كذا، ليس كذا) — يساعد الوكيل يفرّق بين أنماط متقاربة — **نظام الأنماط**.
- **ثلاث مجموعات للتعديل** (آمن / يغيّر الشخصية / ممنوع): نستخدمها لما «التعلّم» يقترح تحديثاً للنمط: تغيير «آمن» يُقترح بثقة، و«يغيّر الشخصية» يتطلّب تأكيداً صريحاً، و«الأساس» يُقترح كنمط جديد مشتقّ — **التعلّم**.
- **`based_on` + `borrows` + `library_version` + `CHANGES.md` (section/base/now/why)**: نموذج بيانات بسيط للاشتقاق والإصدار؛ `CHANGES.md` بالذات يطابق «اقتراح تحديث النمط مع السبب» عندنا — **نظام الأنماط**.
- **مقارنة جنب بجنب قبل الحفظ** (`styleframe-vs-base.jpg`: الأصل يسار والجديد يمين، كل شيء ثابت إلا التغيير): نفس فكرة المعاينة قبل التطبيق عندنا، تُطبّق على تحديث النمط نفسه — **المحرر/الوكيل**.
- **جدول «يقول ← يعني فعلاً»** ("more premium" = ألوان أقل، تباين أعلى، حركة أبطأ…): قاموس لترجمة طلبات المستخدم الغامضة لتغييرات ملموسة في النمط — **المحرر/الوكيل**.
- **صيغة الكابشن `|` للمقاطع و`{}` للكلمة المفتاحية في timeline واحد** + قاعدة وقت القراءة (≥ max(1.8ث، مدة الكلام + 0.6ث)): صيغة مضغوطة لحفظ قرار التقطيع والتمييز — نختبرها مع العربية — **الكابشن**.
- **`readcheck` بمعدّل قراءة لكل نظام كتابة** (CJK 4.5 حرف/ث، لاتيني 15): نحتاج معدلاً معايراً للعربية كفحص آلي بعد التوليد — **الكابشن**.
- **حلقة «سؤال واحد بخيارات + توصية أولاً + خيار محادثة حرّة» بحد ~10 أسئلة**: أسلوب جيد لإنشاء نمط من الصفر (onboarding) — **نظام الأنماط**.
- **`asr_check` على مخرجات TTS** وفحص ذاتي بجولة إصلاح واحدة قبل التسليم: نمط «تحقق آلي ثم سلّم» — **التصدير/التوليد**.
- **فهرس ستايلات المستخدم في ملف واحد يُقرأ أول كل جلسة** (`~/lemo-my-styles/README.md`)، ومكتبة المستخدم خارج مجلد المكتبة فلا تمسّها التحديثات: يطابق قرار «النمط على مستوى المستخدم والمشروع يثبّت نسخة» — **نظام الأنماط**.

## استلهامات
- كل ستايل يُسوَّق بفيلم حقيقي (معرض مع بوستر لكل ستايل) — «شوف قبل ما تختار» أقوى من أي وصف.
- سطر `line` لكل ستايل بجملة واحدة تحكي قصة المثال ("America lost 1.3 million bee colonies, yet the count rose 6 %…") — أفضل من وصف تقني.
- `uses` لكل ستايل (3 استخدامات) يساعد المستخدم يختار حسب الغرض.
- التدرّج: «ستايل المكتبة» → «عدّله» → «ابنِ من الصفر» → «استخدم ستايلي بالاسم» — رحلة واضحة من مستهلك لصانع.
- ثنائي اللغة من الأساس (إنجليزي/صيني) في الأسماء والـREADME — قدوة لنا مع العربي/الإنجليزي.
- «أفلام شكر» عند كل محطة نجوم — تسويق مجتمعي ذكي بنفس المنتج.
- شفافية التكلفة: "A film takes an agent about 30–60 minutes and a fair amount of tokens".
- "Built for Claude… other models may not reproduce them well" — صراحة عن حدود الأداة.

## تحذيرات ومخاطر
- **ليس محرر فيديو:** توليد من الصفر بالكود؛ الـSKILL نفسها تقول "Not for plain editing, trimming or converting the user's existing video files". حتى ستايلات «Edit & Documentary» تقصّ لقطات أرشيفية عامة لا لقطات المستخدم الخام.
- **لا عربي ولا RTL:** بحثت في كل ملفات `.md` — صفر ذكر للعربية؛ الخطوط مقسّمة (subsets) بحسب الحروف المستخدمة؛ قواعد الكابشن مضبوطة للصيني (≤14 حرف، 4.5 حرف/ث).
- **مقيّد بنموذج واحد:** "tuned for Claude Opus 5.5" — النتائج تعتمد على قدرة النموذج على قراءة 120 سطر نص حر وتطبيقها؛ لا يوجد مفسّر/مدقق يضمن تطبيق القواعد (عدا readcheck/asr/loudness).
- **الستايل نص حر لا بيانات:** `style.json` وصفي فقط؛ القواعد (ألوان hex، توقيتات، أحجام) مدفونة في Markdown — صعب التحقق منها آلياً أو دمجها أو عمل diff دلالي لها.
- **التكلفة والوقت:** 30–60 دقيقة لفيلم وتوكنز كثيرة؛ غير مناسب لتجربة «اقتراح ← معاينة سريعة».
- **الترخيص:** الكود MIT ✓، لكن أفلام المثال CC BY 4.0 (تتطلب نسبة)، وثلاث تسجيلات صوتية مستثناة؛ لو أخذنا نصوص `STYLE.md` كمرجع فهي MIT (توثيق).
- **لا Remotion:** صفحات HTML + Playwright، بلا اعتماد على Remotion (ميزة ترخيصية).
- **الصيانة:** مشروع شخص واحد (Lemomo) سريع النمو، أعداد الستايلات متضاربة (43/59/98)، و`package.json` إصداره 0.1.0.

## أسئلة مفتوحة
- هل جودة الأفلام فعلاً تتكرر مع موضوع جديد، أم الأمثلة منتقاة؟ (لم نشغّل شيئاً — ممنوع تنفيذ كود المستنسخ.)
- كيف سيتصرف `readcheck` وقواعد المقاطع مع العربية المتصلة والمختلطة باتجاهين (أرقام/إنجليزي داخل جملة عربية)؟
- هل يمكن استخراج قواعد `STYLE.md` آلياً لحقول منظمة (ألوان، توقيتات، أحجام كابشن) كأمثلة أولى لمكتبة الأنماط عندنا؟
- لماذا لم يضيفوا تاريخ نسخ للستايل الخاص (استبدال مباشر)؟ وهل التحديث من الأساس يدوي دائماً؟
- هل نسخة `directory` (الفرع اليتيم في دليل إضافات Claude) تختلف سلوكياً عن `main`؟ (`MAINTAINING.md` يقول إنها مستقلة ولا تستنسخ شيئاً.)
- ما الفرق الفعلي بين 59 ستايل في المكتبة و«98» في فيلم OPUSCAR 98؟

## الحكم ⭐⭐⭐⭐ (4)
أنضج مثال رأيناه لـ«الستايل كملف»: قالب أقسام ثابتة، فصل الثوابت عن المثال، اشتقاق بـ`based_on`/`borrows`/`CHANGES.md` ومقارنة جنب بجنب — بترخيص MIT؛ لكنه توليد من الصفر بلا تعلّم من التصحيحات ولا عربي، فهو مرجع لصيغة النمط لا منافس لفكرتنا.
