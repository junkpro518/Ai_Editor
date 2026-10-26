# Cutaway

**المصادر في خام:** `مستودعات-الوثيقة/Cutaway.md`  
**الرابط الأصلي:** https://github.com/S07K/cutaway — تجربة حيّة: https://cutaway-one.vercel.app  
**النوع:** مستودع  
**الترخيص:** MIT (ملف LICENSE فعلي: "Copyright (c) 2026 Cutaway Contributors") · **النجوم:** 9 · **آخر تحديث:** 2026-08-25 · **اللغة/الحزمة:** TypeScript — monorepo (pnpm + Turborepo)، Next.js 16 / React 19 / PixiJS 8 / WebCodecs  
**تحقق من المصدر الأصلي:** نعم (README + docs/ARCHITECTURE.md + ~12 ملف: types/{project,timeline,objects,effects,caption,animation}.ts، timeline-engine/operations.ts، history-engine/stack.ts، render-engine/scene.ts، export-engine/{plan,providers,run}.ts، caption-engine/presets.ts، apps/web/package.json)

## ما هو (3–6 أسطر)
محرر فيديو يعمل بالكامل في المتصفح بدون حساب أو خادم. فيه تايم لاين متعدد المسارات مرسوم على canvas، ومعاينة WebGL عبر PixiJS، وkeyframes لكل خاصية، وأقنعة وتدريج ألوان وانتقالات، وترجمة نصية (captions) بأنماط جاهزة، وتفريغ صوتي محلي بـ Whisper (transformers.js)، وتصدير دقيق للإطار إلى MP4/WebM عبر WebCodecs. المستودع صغير (~16 ألف سطر) لكن تصميمه منضبط جداً وموثّق في ARCHITECTURE.md. **لا يوجد فيه أي طبقة وكيل أو MCP أو شات.** كلمة "AI-ready" معناها أن نموذج البيانات مصمم ليستقبل هذا لاحقاً، وليس أن الطبقة موجودة.

## الأفكار (قائمة)
- **المحرر دالة نقية لمستند JSON:** `ProjectDocument → resolveScene(project, frame) → Renderer`. المعاينة والتصدير يمشيان على نفس الـ scene graph، فما تراه هو ما يُصدَّر.
- **طبقات اعتماد باتجاه واحد:** Domain (types/utils بلا أي تبعيات) ← Engines (منطق نقي بدون React/DOM ويشتغل في Node) ← Adapters (واجهات المتصفح) ← Presentation (React بلا منطق أعمال).
- **الزمن بإطارات صحيحة (integer frames) لا بثوانٍ عشرية:** هذا يمنع تراكم أخطاء الفاصلة مع القص والتقسيم المتكرر. والنطاقات نصف مفتوحة `[start, end)`.
- **كل خاصية `Animatable<T>`:** يا قيمة ثابتة يا مسار keyframes. فلا يوجد مكان في المستند لقيمة لا تصل إليها الحركة.
- **مؤثرات "مفتوحة العالم":** `EffectInstance = { effectId: "core.blur.gaussian" | "com.acme.glitch", params }` بدون union لأسماء ثابتة. مؤثر الإضافة ومؤثر النواة متطابقان في نظر المستند.
- **أنماط الترجمة النصية بيانات JSON:** (`CaptionPreset`: الخط واللون ولون الكلمة النشطة وwordsPerBlock وanimationId وpositionY…). الكلمات مخزنة كبيانات منظمة لكل كلمة مع `confidence`، والعرض يُشتق وقت الرسم.
- **التراجع بلقطات للمستند (snapshots) لا بأوامر عكسية:** لأن الدالة العكسية المكتوبة يدوياً قد تُفسد المشروع بصمت. والمستند منظَّم (normalized) فالمشاركة البنيوية تجعل اللقطة رخيصة. ودمج الإيماءات "مختوم" عند رفع المؤشر لا بمهلة زمنية.
- **ساعة الصوت هي الساعة الرئيسية:** `AudioContext.currentTime`. رأس التشغيل يُشتق ولا يُراكم.
- **`PluginContent` + `requiredPlugins`:** المشروع يفتح دائماً حتى لو غابت الإضافة، ويظهر مكانها عنصر بديل.

## المميزات (قائمة، ما يفعله فعلاً لا ما يدّعيه التويت)
- تايم لاين canvas متعدد المسارات (video/audio/caption/overlay) فيه snapping وripple delete وsplit وtrim (`timeline-engine/operations.ts`: splitClip, trimClipStart/End, moveClip, rippleDelete, rippleInsert).
- معاينة PixiJS، وأقنعة (مستطيل/بيضاوي/حر مع feather)، وتدريج ألوان مع presets، وchroma key.
- انتقالان فقط (crossfade وdip-to-black) مخزنان على المقطع الداخل `Clip.transitionIn`.
- ترجمة نصية بأنماط (TikTok/Hormozi/MrBeast…) مع إبراز كلمة بكلمة. التفريغ بـ Whisper عبر `@huggingface/transformers` (WebGPU أو WASM) خلف واجهة مزوّد قابلة للتبديل.
- تصدير بـ WebCodecs + `mp4-muxer`/`webm-muxer`، مع خلط صوت عبر OfflineAudioContext، وفك ترميز دقيق للإطار عبر `mediabunny` بدل البحث داخل عنصر `<video>`.
- حفظ في IndexedDB وملفات `.cutaway` (JSON قابل لـ diff في git)، مع `schemaVersion` وسلسلة migrations.
- اختبارات Vitest لكل محرك.
- **غير موجود:** وكيل، MCP، CLI، Plugin SDK (في خارطة الطريق فقط)، تصدير headless فعلي في Node (ممكن معمارياً لكنه غير مبني).

## التقنيات والبنية
- الحزم/المكتبات: Next.js 16، React 19، Zustand 5، pixi.js 8، mediabunny، mp4-muxer، webm-muxer، @huggingface/transformers 4، Tailwind 4، Vitest، Turborepo.
- المعمارية: 15 حزمة (`types`، `utils`، `timeline-engine`، `animation-engine`، `render-engine`، `mask-engine`، `color-engine`، `effects-engine`، `history-engine`، `caption-engine`، `media-engine`، `export-engine`، `project-io`، `playback-engine`، `ui`) + `apps/web`. المستند منظَّم في جداول مسطحة: `entities: { clips, tracks, media, markers, captionTracks }` + `trackOrder`. المعالجة محلية 100%. التصدير يمر عبر واجهتين عامتين `FrameSource<TFrame>` و`VideoWriter<TFrame>`، فيمكن لاحقاً إضافة Node/FFmpeg backend خلف نفس الواجهة.
- أمثلة ملموسة:
  - `ProjectDocument { schemaVersion, settings{resolution,aspectRatio,frameRate}, entities, trackOrder, durationFrames, exportSettings, requiredPlugins }`
  - `Clip = ClipBase (timing + Transform + Appearance + masks + effects + grade) + content: Video|Audio|Image|Gif|Text|Shape|Svg|Sticker|Emoji|Plugin`
  - `Keyframe<T> { frame, value, easing: linear|bezier{p1,p2}|spring{stiffness,damping,mass}|hold… }`
  - `EffectParamSchema { key, label, type: number|range|color|boolean|select|point, min,max,step }`: لوحة الخصائص تبني نفسها منه تلقائياً.
  - `planExport()`، `runVideoExport()`، `planVideoDecodeSchedule()`، `resolveScene()`، `transitionOpacity()`.
  - سجل "قواعد Pixi" في ARCHITECTURE.md: canvas واحد لكل Application، و`filters = null` لا `[]` (لأن الفلتر الفارغ يجعل المقنّع أسود)، ومعالجة فقدان سياق WebGL.

## أشياء نأخذها لمشروعنا (قائمة، كل بند: ماذا + لماذا + أين يخدم الرؤية)
- **نموذج `Animatable<T>` + `EffectInstance` مفتوح العالم + `CaptionPreset` كبيانات:** لأن "حزمة النمط" (Style Pack) في رؤيتنا لا بد أن تُسلسَل إلى بيانات بحتة: خطوط وألوان وحركات وتأثيرات بمفاتيح registry. هذه أنظف بدائيات (primitives) رأيتها لهذا الغرض. ← **نظام الأنماط / المحرر**.
- **الزمن بإطارات صحيحة + نطاقات نصف مفتوحة:** لأن الوكيل سيطبق عشرات عمليات القص المتتالية، والثواني العشرية تولّد فجوات إطار واحد. ← **المحرر / الوكيل**.
- **مسار واحد للمعاينة والتصدير (`resolveScene`):** يحقق معيار نجاح "الإثبات التقني" في §9 (تطابق المعاينة والتصدير). ← **التصدير**.
- **فصل المحركات النقية عن React:** يسمح بتشغيل نفس المنطق في خادم MCP أو CLI بلا متصفح. ← **الوكيل / MCP**.
- **`requiredPlugins` + `PluginContent` بديل عند الغياب:** لما يستورد أحد Style Pack يعتمد على مؤثر غير مثبت، يفتح المشروع بحالة متدهورة بدل ما يفشل. ← **نظام الأنماط (المشاركة/البيع)**.
- **`confidence` لكل كلمة في الترجمة النصية:** يغذي مباشرة واجهة "إظهار حدود الثقة" في §3 والمراجعة البشرية للمحتوى الديني. ← **التوليد / الترجمة**.
- **قرار snapshot-undo مقابل inverse-ops:** نقاش جاهز نحتاج نحسمه. Cutaway يختار اللقطات للأمان، وMakeMyClip يختار العكس للتوثيق. ← **سجل العمليات**.

## استلهامات (تجربة المستخدم، التسويق، التسعير، الطريقة التي شرحوا بها المنتج)
- الشعار: «بساطة CapCut، وحركة After Effects، وتجربة Figma، وانفتاح Blender». جملة تموضع قوية وواضحة.
- «Your footage never leaves your machine; the page is static and there is no backend to send it to». حجة الخصوصية مثبتة بالبنية وليست وعداً.
- ARCHITECTURE.md مكتوب بأسلوب «كل قاعدة كانت خطأً قبل أن تصبح قاعدة»، و«قرارات مسجلة حتى لا يُعاد فتحها بصمت». أسلوب ممتاز لوثائقنا ولملف constitution في Spec Kit.
- أسماء الأنماط الجاهزة بأسماء صناع محتوى معروفين (Hormozi/MrBeast/Ali Abdaal) تجعل "النمط" مفهوماً للمستخدم فوراً.

## تحذيرات ومخاطر (ترخيص، نضج، اعتماد على API مدفوع، ادعاءات غير مثبتة)
- النضج منخفض: 9 نجوم، مطوّر واحد على الأرجح، وآخر دفع في 2026-08-25 (أي شهرين بلا نشاط حتى تاريخ الفحص).
- "AI-ready" ادعاء معماري فقط: لا يوجد وكيل ولا MCP ولا واجهة أوامر خارجية. البحث عن mcp/agent/AIProvider في الكود لم يُرجع أي تطبيق.
- يعتمد على WebCodecs (مدعوم جيداً في Chromium، وأضعف في Safari/Firefox). ولا يوجد تصدير FFmpeg بديل.
- مجموعة المؤثرات والانتقالات محدودة (blur/noise + انتقالان).
- لم نشغّله ولم نتحقق من الأداء على ملفات طويلة.

## أسئلة مفتوحة
- هل نتبنى مستند Cutaway (types) كأساس ونبني فوقه طبقة أوامر للوكيل، أم نكتفي باستلهام التصميم؟ (MIT يسمح بالنسخ.)
- هل يكفي مسار WebCodecs داخل Electron/Tauri لسطح المكتب، أم نحتاج FFmpeg أصلياً للتصدير الثقيل؟
- كيف نمثّل "قواعد القص" (الإيقاع، حذف الصمت، الاستثناءات) في نمط مبني على هذه البدائيات، وهي غير بصرية؟

## الحكم: ⭐⭐⭐⭐ (4/5) — أفضل تصميم نموذج بيانات بترخيص MIT في الدفعة، ومرجع ممتاز لطبقة المستند والمعاينة والتصدير. لكن لا وكيل فيه والنضج ضعيف.
