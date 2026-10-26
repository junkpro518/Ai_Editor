# OpenVideo Editor (react-video-editor)

**المصادر في خام:** `مستودعات-الوثيقة/OpenVideo-react-video-editor.md`  
**الرابط الأصلي:** https://github.com/openvideodev/react-video-editor — https://openvideo.dev — https://docs.openvideo.dev  
**النوع:** مستودع (واجهة Next.js فوق SDK خارجي)  
**الترخيص:** ترخيص مخصص "OpenVideo License" (ليس SPDX؛ وGitHub يعرضه NOASSERTION): مجاني للأفراد والمنظمات غير الربحية والشركات حتى 3 موظفين، و**ممنوع نسخ أو تعديل الكود لبيع أو ترخيص مشتق منه**، وCompany License مدفوع لمن تجاوز ذلك. أما حزم المحرك على npm (`@openvideo/core|engine-pixi|timeline` 1.3.1) فتعلن `MIT` وتشير لمستودع `scenify/scenify` الذي يعطي 404 · **النجوم:** 1822 · **آخر تحديث:** 2026-06-30 · **اللغة/الحزمة:** TypeScript، Next.js 16، React 19، PixiJS 8  
**تحقق من المصدر الأصلي:** نعم (README + LICENSE + package.json + CHANGELOG + ~5 ملفات: types/{timeline,project}.ts، utils/schema-converter.ts، components/editor/export-modal.tsx، components/ui/model-selector.tsx، و`npm view` للحزم، وفحص المستودعين openvideodev/openvideo وscenify/scenify: كلاهما 404)

## ما هو (3–6 أسطر)
محرر فيديو ويب بأسلوب CapCut/Canva، يعرض محرك OpenVideo ويُقدَّم كـ"starter kit لبناء SaaS تحرير فيديو". المستودع نفسه طبقة واجهة: لوحات، وتايم لاين، وcanvas تفاعلي، ورفع إلى R2/S3، وتفريغ عبر Deepgram، ومكتبة Pexels. **كل المنطق الثقيل (نموذج المشروع والعرض والتصدير) موجود في حزم npm مغلقة المصدر عملياً**: 7 ملفات dist بحجم ~1MB، والمستودع المصدر غير متاح. وصف المستودع على GitHub ("using remotion") قديم، والتطبيق الحالي يستخدم PixiJS + WebCodecs.

## الأفكار (قائمة)
- **محرك عرض منفصل كحزمة (`Compositor`) يأخذ JSON المشروع ويُخرج stream:** `new Compositor(opts) → initPixiApp() → loadFromJSON(json) → output()` ← ReadableStream ← Blob MP4. التصدير يتم كله في المتصفح بدون تكلفة خادم.
- **مخطط "Studio" مسطّح (normalized):** المسارات تحمل `clipIds[]`، والمقاطع تحمل `display {from,to}` و`trim {from,to}` بـ**الميكروثانية**.
- **أنواع مسارات تشمل Effect وTransition كمسارات مستقلة.**
- **تجميع كلمات الترجمة النصية حسب العرض الفعلي بالبكسل** (`groupWordsByWidth` بقياس canvas) بدل عدد ثابت من الكلمات.
- **انتقالات مخصصة بالـ shaders** (`registerCustomTransition`).

## المميزات (قائمة، ما يفعله فعلاً لا ما يدّعيه التويت)
- تايم لاين متعدد المسارات (Video/Audio/Image/Text/Caption/Effect/Transition)، فيه سحب وتقسيم وقص وsnapping.
- canvas تفاعلي: سحب وتحجيم وتدوير وترتيب الطبقات.
- تصدير MP4 محلي عبر `Compositor` (PixiJS + WebCodecs)، مع تقدّم `export:progress`.
- تفريغ عبر **Deepgram API** (مفتاح مدفوع)، ومكتبة **Pexels**، ورفع إلى **R2/S3**.
- `project.export()/import()` لحفظ واستيراد JSON.
- يوجد `model-selector.tsx` بقائمة نماذج (deepseek/llama/gpt-4o) **لكن لا توجد طبقة وكيل مستخدمة فعلياً**، ولا MCP ولا شات تعديل.

## التقنيات والبنية
- الحزم/المكتبات: `@openvideo/core`، `@openvideo/engine-pixi`، `@openvideo/timeline` (1.3.1)، pixi.js 8، mediabunny، opfs-tools، Zustand، Radix/shadcn، Framer Motion، Tailwind 4، `@deepgram/sdk`، `@aws-sdk/client-s3`، TanStack Query.
- المعمارية: Next.js App Router + API routes (`app/api/{audio,pexels,transcribe,uploads}`)، ومتاجر Zustand (`studio-store`، `project-store`، `assets-store`)، والمحرك يُستورد كصندوق أسود (`Studio`، `Compositor`، `jsonToClip/clipToJSON`، `Transition`، `fontManager`). المعالجة والتصدير محليان، والأصول والتفريغ سحابيان.
- أمثلة ملموسة:
  - `IClip { id, type, src, display:{from,to}, trim, duration, playbackRate, left, top, width, height, angle, zIndex, opacity, style, caption, effects[] }`
  - `ITimelineTrack { id, name, type: TrackType, clipIds[], muted }`
  - `TProject { canvasSize, canvasMode: preset|original|custom, fps, backgroundType: color|blur, scenes[] }`
  - `export-modal.tsx`: `new Compositor(...)` ← `com.loadFromJSON(json)` ← `com.output()`

## أشياء نأخذها لمشروعنا (قائمة، كل بند: ماذا + لماذا + أين يخدم الرؤية)
- **واجهة `Compositor.loadFromJSON → output()` كعقد:** فصل "المستند" عن "المُصيِّر" بعقد بسيط، فنستطيع استبدال المُصيِّر (WebCodecs/FFmpeg/سحابي) لاحقاً. ← **التصدير**.
- **`canvasMode: preset | original | custom` و`backgroundType: blur`:** تفاصيل UX مفيدة لـ"تصدير مقاسات متعددة من نفس المشروع" (§7) والقص العمودي. ← **المحرر / التصدير**.
- **تجميع الترجمة النصية بالعرض الفعلي:** ضروري للعربية لأن عرض الكلمات متفاوت والاتجاه RTL. ← **نظام الأنماط (النصوص)**.
- **مرجع UI فقط:** ترتيب اللوحات (media/right-panel/floating-controls) وقائمة السياق في الـ canvas كمرجع تصميم لا كود. ← **المحرر**.

## استلهامات (تجربة المستخدم، التسويق، التسعير، الطريقة التي شرحوا بها المنتج)
- التموضع كـ"starter kit لمن يبني SaaS فيديو" مع "zero server rendering costs". رسالة تكلفة جذابة للمطورين.
- نموذج ترخيص Remotion-style (مجاني حتى 3 موظفين، ثم Company License) لتمويل المشروع مع إبقاء المصدر "متاحاً".
- 1822 نجمة و418 fork تدل على طلب كبير على "CapCut clone بالـ React".

## تحذيرات ومخاطر (ترخيص، نضج، اعتماد على API مدفوع، ادعاءات غير مثبتة)
- **الترخيص غير مفتوح فعلياً:** ممنوع بيع مشتق، والشركات فوق 3 موظفين تدفع. ولا تفترض حرية استخدام تجاري (كما نبهت وثيقة الرؤية).
- **تناقض ترخيصي:** حزم npm تعلن MIT، لكن ترخيص المستودع يقول إنه يشمل "all packages… within the OpenVideo monorepo"، ومصدر المحرك غير منشور (404). **لا يمكن تدقيق المحرك** ولا الاعتماد عليه بأمان.
- المستودع واجهة لـ SDK شخص آخر. القيمة الحقيقية في المحرك المغلق.
- التفريغ والأصول يعتمدان على APIs مدفوعة (Deepgram، Pexels، R2).
- لا وكيل ولا أوامر منظمة ولا undo/redo موثق في الطبقة التي رأيناها.
- وصف GitHub قديم ومضلل (Remotion).

## أسئلة مفتوحة
- هل محرك `@openvideo/engine-pixi` على npm (MIT حسب البيانات الوصفية) قابل للاستخدام قانونياً بمعزل عن ترخيص المستودع؟ يحتاج سؤال cloud@openvideo.dev.
- هل يستحق المحرك الاختبار أداءً مقارنةً بـ Cutaway (مفتوح بالكامل بنفس التقنيات)؟

## الحكم: ⭐⭐ (2/5) — مرجع واجهة جيد وشعبي، لكنه غلاف لمحرك مغلق بترخيص مقيِّد ومتناقض، وبلا أي طبقة وكيل. Cutaway يغطي نفس التقنية بشكل مفتوح.
