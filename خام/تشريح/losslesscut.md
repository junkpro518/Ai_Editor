# LosslessCut

**المصادر في خام:** `مستودعات-الوثيقة/LosslessCut.md`  
**الرابط الأصلي:** https://github.com/mifi/lossless-cut — https://losslesscut.app  
**النوع:** مستودع (تطبيق Electron لسطح المكتب)  
**الترخيص:** GPL-2.0 (ملف LICENSE فعلي) · **النجوم:** 45261 · **آخر تحديث:** 2026-10-25 (الإصدار 3.70.1) · **اللغة/الحزمة:** TypeScript، Electron 42، React، FFmpeg مضمَّن  
**تحقق من المصدر الأصلي:** نعم (README + ~7 ملفات: docs/{api,cli,expressions}.md، AGENTS.md، src/renderer/src/{types,smartcut,edlFormats}.ts، src/main/ffmpeg.ts (مرشحات الكشف)، package.json)

## ما هو (3–6 أسطر)
"سكين الجيش السويسري" لتحرير الفيديو والصوت **بدون إعادة ترميز**. واجهة رسومية فوق FFmpeg لقص ودمج المقاطع عبر نسخ البيانات مباشرة (stream copy)، فالعمل سريع جداً وبلا فقد جودة. فيه إدارة مسارات (إضافة/حذف/استخراج)، وremux بين الحاويات، وكشف المشاهد والإطارات السوداء والصمت، واستيراد وتصدير قوائم القص بصيغ كثيرة. **ليس محرراً متعدد المسارات ولا مركّباً**، بل أداة قص على ملف واحد. مشروع ناضج جداً (45 ألف نجمة، ومتاجر Mac/MS/Snap).

## الأفكار (قائمة)
- **Smart cut:** إذا لم تقع نقطة القص على keyframe، يُعاد ترميز الجزء من نقطة القص حتى أول keyframe لاحق فقط، والباقي stream-copy (`smartcut.ts`: `needsSmartCut`، `readKeyframesAroundTime`، `findNextKeyframe`).
- **مشروع `.llc` بسيط جداً:** `{ version: 2, mediaFileName, cutSegments: [{ start, end?, name, tags?, selected? }] }`. القائمة هي المشروع كله.
- **حديقة صيغ EDL:** استيراد وتصدير CSV (ثوانٍ/إطارات/بشري)، TSV، CMX3600 EDL، MPlayer EDL، XMEML، **FCPXML**، **OTIO** (OpenTimelineIO)، CUE، PBF، SRT، فصول YouTube، DJI GPS…
- **تعبيرات JavaScript لاختيار وتعديل المقاطع:** مثل `segment.duration < 5`. برمجة خفيفة للمستخدم المتقدم.
- **الكشف عبر مرشحات FFmpeg المباشرة:** `select='gt(scene,X)',metadata=print`، `blackdetect=…`، `silencedetect=…`، والمقاطع تُنشأ منها.
- **HTTP API + CLI:** `POST /api/action/:action` يشغّل "اختصار لوحة مفاتيح" بالاسم، و`/api/await-event/export-complete` ينتظر الحدث. يستمع على 127.0.0.1 ويرفض طلبات المتصفح (حماية من DNS rebinding).

## المميزات (قائمة، ما يفعله فعلاً لا ما يدّعيه التويت)
- قص ودمج بلا فقد، وremux، وتعديل metadata والدوران، وفصول، وsnapshots وتصدير إطارات.
- كشف المشاهد والسواد والصمت والتقسيم حسبها.
- يفتح تقريباً أي صيغة (حتى ما لا يشغّله المتصفح، عبر مشغّل توافقي).
- أتمتة: CLI (`--keyboard-action`، `--settings-json`)، وHTTP API تجريبي، وعمليات دفعية.
- 30+ لغة، وملف AGENTS.md يوجّه الوكلاء في الـ commits والتوثيق.

## التقنيات والبنية
- الحزم/المكتبات: Electron 42، electron-vite، React، Zod (مخططات المشروع)، i18next، FFmpeg/FFprobe المضمَّن (إصدار وحيد مدعوم يُنزَّل بـ `script/downloadFfmpeg.ts`).
- المعمارية: main process (`src/main/ffmpeg.ts`، `httpServer.ts`، `configStore.ts`) + renderer (`segments.ts`، `edlFormats.ts`، `smartcut.ts`، `Timeline.tsx`). كله محلي.
- أمثلة ملموسة:
  - `llcProjectV2Schema` (Zod)، `StateSegment { segId, start, end, name, tags, selected }`
  - `curl -X POST http://localhost:8080/api/action/export`
  - `-filter:a silencedetect=…` و`-filter:v blackdetect=…` في `src/main/ffmpeg.ts`
  - `parseFcpXml`، `parseEdlCmx3600`، `parseYouTube`، `formatSrt`، `otioSchema`

## أشياء نأخذها لمشروعنا (قائمة، كل بند: ماذا + لماذا + أين يخدم الرؤية)
- **منطق smart cut:** لتصدير سريع جداً عندما يكون النمط "قصاً فقط" (حذف صمت أو أخطاء بلا مؤثرات)، فلا نعيد ترميز ساعة بودكاست كاملة. نعيد كتابة المنطق بأنفسنا لأن GPL يمنع النسخ. ← **التصدير**.
- **وصفات مرشحات `silencedetect`/`blackdetect`/`scene`:** بداية عملية لقواعد "حذف الصمت" وتقسيم المشاهد في النمط، وتعمل محلياً وبلا نماذج. ← **نظام الأنماط (قواعد القص) / التحليل**.
- **دعم FCPXML/OTIO/EDL استيراداً وتصديراً:** يتيح استيراد قص المستخدم السابق من Premiere/Resolve كـ"مرجع نمط"، وتصدير عملنا إليها. ← **التصدير / نظام الأنماط (المراجع)**.
- **حماية API المحلي:** ربط على 127.0.0.1، ورفض Origin المتصفح، وفحص Host. نموذج أمان جاهز لخادم MCP المحلي. ← **MCP / الأمان**.
- **ضد-نمط نتعلم منه:** API يشغّل "اختصارات لوحة مفاتيح" وليس أوامر على مستند. يصلح للأتمتة البسيطة لكنه لا يعطي الوكيل قراءة منظمة للحالة ولا diff. هذا بالضبط ما تحذر منه §6 (لا منطق منفصل لكل واجهة). ← **الوكيل**.

## استلهامات (تجربة المستخدم، التسويق، التسعير، الطريقة التي شرحوا بها المنتج)
- نموذج دخل: مجاني على GitHub، ومدفوع في المتاجر مقابل "تثبيت آمن وتحديثات تلقائية". المصدر نفسه، والراحة هي ما يُباع.
- رسالة بسيطة جداً: «extract the good parts… discard many gigabytes… without slow re-encode».
- كتاب وصفات (Recipe cookbook)، وصفحة features كاملة، و9 ميزات فقط في الـ README.
- AGENTS.md يطلب من الوكيل تذكير المالك بنشر منشور عند دمج ميزة مرئية. دمج التسويق في سير التطوير.

## تحذيرات ومخاطر (ترخيص، نضج، اعتماد على API مدفوع، ادعاءات غير مثبتة)
- **GPL-2.0:** أي نسخ للكود يُلزم منتجنا بـ GPL. للاستلهام وإعادة الكتابة فقط.
- ليس أساساً لمحرر أنماط: لا مسارات متعددة، ولا نصوص، ولا مؤثرات، ولا keyframes.
- HTTP API تجريبي وبلا مصادقة.
- smart cut يعتمد على دعم الترميز للكوديك المصدر، وقد يعطي مشاكل توافق في بعض الصيغ.

## أسئلة مفتوحة
- هل نحتاج مسار "قص بلا فقد" منفصلاً في التصدير، أم يكفي ترميز سريع بالعتاد (NVENC/VideoToolbox)؟
- هل نقبل FCPXML/OTIO كمصدر لاستنتاج "قواعد القص" من أعمال المستخدم السابقة؟

## الحكم: ⭐⭐⭐ (3/5) — مرجع ممتاز وناضج لتقنيات FFmpeg (smart cut، الكشف، صيغ EDL)، لكنه ليس قاعدة لمحرر أنماط، وترخيصه GPL يمنع اقتباس الكود.
