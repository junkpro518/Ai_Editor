# مهارات الحركة للوكلاء: LottieFiles Motion Design، GSAP skills، Genjutsu، Three.js skills، Emil Kowalski (+ Design DNA)

**المصادر في خام:** `مستندات/‎محمد mabuzant تقنية و AI ابداعي‎ on Instagram‎ ليش مواقع ناس تحس فيها حياة، وموقعك ثابت مثل البوستر؟.txt`, `مستندات/jaimin (@jaimintf) on X.txt`  
**الرابط الأصلي:** https://github.com/LottieFiles/motion-design-skill · https://github.com/greensock/gsap-skills · https://github.com/AThevon/genjutsu · https://github.com/CloudAI-X/threejs-skills · https://github.com/emilkowalski/skills · https://github.com/zanwei/design-dna  
**النوع:** مهارة Claude Code (مجموعة)  
**الترخيص:** كلها MIT (Genjutsu: README يقول MIT وGitHub يعرضه NOASSERTION) · **النجوم:** emilkowalski 49.9k، gsap-skills 17.2k، threejs-skills 3.8k، LottieFiles 2.5k، design-dna 2.0k، genjutsu 685 · **آخر تحديث:** من 2026-05 إلى 2026-10 · **اللغة/الحزمة:** Markdown (SKILL.md) عبر `npx skills add`  
**تحقق من المصدر الأصلي:** نعم (README + ملفات مفتاحية لـ LottieFiles وGSAP وemilkowalski وGenjutsu وdesign-dna وقائمة threejs-skills؛ ترخيص GSAP نفسه لم أتحقق منه، صفحة الرخصة أرجعت CSS فقط)

## ما هو
منشور إنستغرام عربي يعدّد خمس مهارات تجعل ما يبنيه Claude Code يتحرك: Three.js، GSAP الرسمية، Design DNA، Motion Design من LottieFiles، وGenjutsu. وتغريدة jaimin تذكر مهارة animations لـ Emil Kowalski. الكل ملفات Markdown تعلّم الوكيل **ذوقاً وقواعد** (متى ease-out، كم مدة، كيف تُرتّب)، لا مكتبة تشغيل.

## الأفكار
- **اختيار شخصية حركة واحدة للمشروع** (Playful/Premium/Corporate/Energetic) وتطبيقها باتساق — مباشرة مفهوم "النمط".
- **هوية حركة = ثلاث ثوابت:** easing توقيع واحد لـ 80% من الحركات، لوحة من 3 مدد، نمط دخول موحّد.
- **ثلاث طبقات حركة:** أساسية، ثانوية، محيطية (ambient).
- **قاعدة الثلث والـ stagger الكلي أقل من 500ms.**
- **Genjutsu تقترح "أطروحة تفاعل" توافق عليها قبل كتابة أي كود** — حلقة موافقة قبل التنفيذ.
- **Design DNA:** تستخرج هوية تصميم أي واجهة كـ JSON (tokens + أسلوب نوعي + تأثيرات) من صور/روابط ثم تولّد منها — مطابق جداً لفكرة "استنتاج نمط من فيديوهات مرجعية".
- **Emil:** مفردات (`animation-vocabulary`) تحوّل وصف الشعور إلى اسم دقيق ("Origin-aware animation"، "Rubber-banding"، "Morph").

## المميزات
- LottieFiles `skills/motion-design/`: `SKILL.md` + `director/` (فلسفة، 12 مبدأ ديزني للواجهات، عاطفة→حركة، choreography) + `patterns/` (دخول/خروج، حالات نجاح/خطأ/تحميل، ambient، multi-element) + `reference/timing-easing-tables.md`.
- GSAP skills: `gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-plugins`, `gsap-react`, `gsap-frameworks`, `gsap-performance`, `gsap-utils` + `llms.txt`. تنص على أن GSAP مجانية بكل إضافاتها (SplitText وMorphSVG) بعد استحواذ Webflow.
- Genjutsu: `cast` (واجهة واحدة)، `paint` (هوية منتج + `MASTER.md`)، `bunshin` (موقع كامل بفريق وكلاء بتكلفة معلنة)، لويب وAndroid وSwiftUI.
- Emil Kowalski: 15+ مهارة (`animate`, `review-animations`, `improve-animations`, `find-animation-opportunities`, `animation-performance`, `animation-vocabulary`, `apple-design`…).
- threejs-skills: 10+ مهارة (animation، lighting، shaders، postprocessing، R3F…).

## التقنيات والبنية
- الحزم/المكتبات: `npx skills add <repo>` أو `/plugin marketplace add`.
- المعمارية: ملفات SKILL.md بوصف يُفعّل المهارة؛ لا تشغيل ولا تصدير. مفيدة لأنها **بيانات نصية قابلة للاقتباس** كأساس لجداول presets.
- أمثلة ملموسة (قيم فعلية من الملفات):
  - مدد LottieFiles: tooltip 80–120ms، زر 120–180، بطاقة 200–350، مودال 300–400، انتقال صفحة 400–600، كشف درامي 600–1200، ambient 2000–20000. الخروج = 65–75% من الدخول.
  - مقياس المسافة→المدة: 50px=0.8x … شاشة كاملة 1.8–2.0x.
  - Stagger: micro 20–40ms، قياسي 50–100، درامي 100–200، موجة 30–60.
  - أمثلة منحنيات: MD3 Standard `(0.2,0,0,1)`، Emphasized `(0.05,0.7,0.1,1)`، Bounce `(0.175,0.885,0.32,1.275)`، Elastic `(0.68,-0.55,0.265,1.55)`.
  - Springs: قياسي stiffness 250–350 / damping 18–24، bouncy 150–250 / 10–15.
  - تجاوز (overshoot): نجاح 5–10%، خطأ 0%، احتفال 15–25%، فاخر 0%.
  - Emil: `--ease-out: cubic-bezier(0.23,1,0.32,1)`، `--ease-in-out: cubic-bezier(0.77,0,0.175,1)`، `--ease-drawer: cubic-bezier(0.32,0.72,0,1)`؛ قاعدة "لا ease-in لواجهات"، حركات الواجهة أقل من 300ms.
  - GSAP: `gsap.timeline({defaults:{duration:0.5, ease:"power2.out"}})` مع `tl.time(2)` و`tl.progress(0.5)` للـ seek، وTimeline يمكن إنشاؤه `paused:true` — أي **GSAP قابلة للتحكم بالزمن (seekable)** وهي أنسب المحركات للتصدير الحتمي في المتصفح.
  - three.js: أنيميشن مبني على `AnimationMixer` + clips، وحركة على "الزمن المطلق" (`Math.sin(elapsed*2)`)، فيمكن تجميد `elapsed` وتصدير حتمي.

## أشياء نأخذها لمشروعنا
- **جداول المدد/المنحنيات/الـ stagger كبيانات أولية لـ "motion presets"** داخل style pack: `personality: premium|playful|corporate|energetic` يختار تلقائياً duration palette + signature easing + overshoot. المصدر جاهز بقيم صريحة. يخدم: نظام الأنماط. (انظر ملفات `claude-motion-design.md` و`aashish-pahwa-animation-skills.md` للتداخل.)
- **ثلاث طبقات حركة (أساسية/ثانوية/محيطية)** كبنية لأي مشهد نصي: عنوان (أساسي)، ظل/أيقونة (ثانوي)، خلفية (محيطي). يخدم: المحرر + التوليد.
- **قواعد الاتجاه:** دخول = ease-out، خروج = ease-in بـ 65–75% من المدة. اعتماد افتراضي في وكيل الرسوم.
- **حلقة "الأطروحة قبل الكود" من Genjutsu:** الوكيل يقترح "اتجاه حركة" بنص/معاينة قبل التطبيق على كل الخط الزمني. يخدم: الوكيل + تجربة المستخدم.
- **Design DNA ↔ استنتاج النمط:** مخطط JSON بثلاثة محاور (قياسي/نوعي/تأثيرات) يوازي ما نريده لنمط المونتاج المستنتج؛ نستعير `references/schema.md` كنقطة بداية لمخطط النمط (محور "motion" فيه موجود). يخدم: نظام الأنماط.
- **مفردات Emil (`animation-vocabulary`)** كطبقة تحويل من كلام المستخدم إلى preset ("خلها تطلع مثل الفقاعة" → pop-in). يخدم: الوكيل + MCP.
- **GSAP كمحرك حركة نصية داخل المحرر:** timeline مُنشأ paused ويُحرَّك بـ `tl.time(t)` من لعّاب المحرر → معاينة وتصدير بنفس المسار. يخدم: المحرر + التصدير.
- **قواعد الجودة كمدقّق** (review-animations/quality-checklist) يشغَّل على خرج الوكيل: stagger>500ms، ease-in على دخول، `transition: all`… يخدم: الوكيل.

## استلهامات
- التسويق: «تعلّم Claude Code مهارات جديدة بأمر واحد وتبقى كل جلسة» + ترتيب تنفيذ ("ابدأ بـ Design DNA").
- Emil: «الوكلاء ما عندهم ذوق» — وحل ذلك بقائمة أخطاء شائعة صغيرة؛ نبرة مصداقية الخبرة (Vercel وLinear).
- Genjutsu تنشر **إيصالات** (تكلفة، ما لم يُتحقق منه، ما أخطأ فيه) لكل مثال — شفافية تبني الثقة؛ تصلح لعرض نتائج وكيلنا.

## تحذيرات ومخاطر
- هذه **نصوص إرشاد** لا تنتج حركة بنفسها؛ القيمة مرهونة بنقلها إلى محرك عرضنا.
- ترخيص GSAP: الإعلان "مجانية بالكامل" من README المهارة نفسها (قد يكون غير حديث)؛ ترخيص GSAP القياسي تاريخياً كان فيه قيد على الأدوات المنافسة لمنشئي الرسوم المرئية — **يجب قراءة الرخصة الحالية** قبل تضمينها في منتج محرر تجاري. لم أتحقق.
- Genjutsu: تكلفة bunshin مرتفعة (مثال مسجَّل ≈ 5.93$ لصفحة واحدة) ومثال يعترف أنه لم يرَ صفحته؛ لا نعتمد على ادعاءات الجودة.
- Three.js skills من طرف ثالث غير رسمي (CloudAI-X).
- قيم الجداول توجيهية (من مؤلف واحد) وليست معياراً؛ بعضها يتعارض (Emil: أقل من 300ms للواجهات، LottieFiles: دقيقة لشخصية Premium 350–600ms).

## أسئلة مفتوحة
- هل نحوّل جداول LottieFiles إلى ملف JSON خاص بنا (`motion-tokens.json`) يرثه كل style pack؟
- هل مدد الواجهات (أقل من 300ms) تناسب الفيديو؟ في الفيديو غالباً أبطأ (عنوان 400–800ms)؛ نحتاج جدول خاص بالفيديو.

## الحكم: ⭐⭐⭐⭐ — أغنى مصدر جاهز لقيم المدد والمنحنيات والـ stagger كأساس لـ motion presets، وGSAP/Three يوفّران محركاً seekable، مع التحقق من ترخيص GSAP.
