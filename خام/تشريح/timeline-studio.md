# Timeline Studio (ai-video-editor)

**المصادر في خام:** `مستودعات-الوثيقة/Timeline-Studio.md`  
**الرابط الأصلي:** https://github.com/MartinDelophy/ai-video-editor — المحرر الحي: https://video-editor.ai-creator.top/ — دليل الأمثلة: https://github.com/MartinDelophy/timeline-studio-handbook  
**النوع:** مستودع + مهارة Agent (`edit-timeline-studio`) + خادم MCP محلي + WebMCP في المتصفح  
**الترخيص:** MIT للكود الأصلي فقط. والنماذج بتراخيص مختلطة (`MODEL_LICENSES.md`): أوزان MobileFaceSwap/ArcFace بحثية بلا حق تجاري، والبقية MIT/Apache غالباً. وFFmpeg/LibAV مبنيان LGPL-2.1+ · **النجوم:** 900 · **آخر تحديث:** 2026-10-25 · **اللغة/الحزمة:** JavaScript (React + Vite، PWA)، Node للأوامر، Python لتحليل المراجع  
**تحقق من المصدر الأصلي:** نعم (README + ~8 ملفات: skills/edit-timeline-studio/SKILL.md، references/{command-contract,replication-workflow}.md، scripts/analyze_replication.py، docs/{webmcp,generation-plugin-development}.md، src/lib/projectCommandEngine.js (inspectProject)، scripts/timeline-command.mjs، MODEL_LICENSES.md)

## ما هو (3–6 أسطر)
محرر فيديو في المتصفح (PWA) بتايم لاين بأسلوب CapCut، مع حزمة ضخمة من نماذج AI تعمل **محلياً** عبر WebGPU/ONNX: Whisper للترجمة النصية، وTTS متعدد اللغات، وموسيقى Stable Audio، وتقسيم YOLOS/MODNet، وإزالة علامات مائية MI-GAN، وأفاتار LivePortrait، وعزل الصوت. الأهم لنا أن **المستخدم والوكيل يعدّلان نفس التايم لاين** عبر ثلاثة مسارات تمر كلها بنفس محرك الأوامر: CLI (`npm run agent`)، وخادم MCP عبر stdio، و21 أداة WebMCP مسجلة في الصفحة الحية. ومعها مهارة Agent طويلة جداً فيها سير عمل مفصل، منها **"استنساخ أسلوب مونتاج من فيديو مرجعي"**.

## الأفكار (قائمة)
- **محرك أوامر واحد، وثلاث وسائل نقل:** «Do not implement CLI and MCP editing separately». خادم MCP غلاف رفيع فوق registry الأوامر والـ reducers النقية.
- **غلاف خطة (plan envelope) إعلاني:** `{ schemaVersion, project, baseRevision, dryRun, operations:[{id, type, …}] }`. كل عملية لها `id` لضمان idempotency (إعادة نفس الـ id تُرجع النتيجة السابقة بلا تطبيق مكرر)، و`baseRevision` كشرط مسبق.
- **`project.diff` قبل `project.run` إلزامياً:** diff دلالي باستخدام نفس الـ registry والـ reducers، يرفض العمليات غير المدعومة ولا يكتب شيئاً.
- **في المتصفح:** `stateToken` ← `timeline_edit_preview` (يُرجع تغييرات دلالية و`previewId` بدون تعديل) ← `timeline_edit_apply(previewId)` كمعاملة واحدة قابلة للتراجع ← `timeline_edit_undo(transactionId)` (فقط إن لم يتغير المشروع بعدها).
- **مهام AI بثلاث مراحل:** `prepare` (تحقق بلا تنزيل) ← `start` (يتطلب `allowModelDownload: true` صراحة) ← `inspect/cancel`. ونفس النمط للتصدير. أي لا يحدث تنزيل أو حساب ثقيل بدون موافقة.
- **ثابت "ترجمة نصية ↔ كلام":** كل ترجمة نصية مرئية لا بد أن تقابل كلاماً مسموعاً (`caption.add` يتطلب `audioClipId`)، والنص الذي يكتبه الوكيل يحتاج تعليقاً صوتياً مولّداً أولاً.
- **استنساخ الأسلوب من مرجع (`replication-workflow.md`):** يصنّف الطلب (`editing-style replication` / `AI-generation replication` / `hybrid`)، ثم "بوابة اكتمال التحليل" بسبع طبقات أدلة متزامنة زمنياً: ساعة الصوت (beats/onsets)، وحدود اللقطات واللقطات الفرعية، و**رسم إعادة استخدام المصدر** (repeatOf)، وخريطة العمليات الزمنية (سرعات وتجميد وعكس)، و**خط زمني لحالات المظهر** (look-state)، و**تشريح الانتقالات**، ومسار هندسة الموضوع. بدقة لا تقل عن 0.25 ثانية. ثم "جدول لقطات قابل للتحرير" (blueprint) قبل البناء.
- **تطابق المظهر بدالة خطأ إدراكية موزونة:** `lookError = w1*luma + w2*contrast + w3*LabColor + … + penalties`، بدل نسخ قيم المنزلقات من المرجع لأنها طُبقت على بكسلات مختلفة.
- **brief قابل للتحرير:** يحفظ طلب المستخدم حرفياً، ويفصل القرارات المستنتجة والمؤكدة والافتراضية وغير المحسومة، ويسجل لكل جزء من المصدر قرار keep/remove/shorten/reorder مع السبب والثقة.

## المميزات (قائمة، ما يفعله فعلاً لا ما يدّعيه التويت)
- مستند `.timeline` = ملف zip فيه `project.json` (`format: "timeline-studio-archive"`) + الوسائط. المسارات **ثابتة بالاسم**: `visualSegments` (رئيسي متصل)، `visualOverlaySegments`، `captionSegments`، `audioSegments` (التعليق الصوتي)، `musicSegments`، `stickerSegments`، `timelineMarkers`. الزمن بالثواني.
- عمليات الكتابة المنفذة: `asset.import`، `visual.append|insert|trim|split|reorder`، `overlay.add`، `timed.move|resize`، `clip.delete|set_property|set_speed|set_muted|set_relight`، `caption.add|update|link_audio|unlink_audio`، `marker.*`، `transition.set`، `track.set_visibility|set_locked`، `project.set_ratio`.
- **`project.render` المحلي (CLI) يغطي جزءاً فقط** (Visuals + Voiceover + Music إلى H.264/AAC). الترجمة النصية والملصقات والـ overlays والمؤثرات تتطلب مسار المتصفح.
- تصدير المتصفح: WebCodecs MP4/WebM مع هندسة مشتركة بين المعاينة والتصدير، مع fallback إلى MediaRecorder. والمعاينة تستخدم تشغيل الوسائط الأصلي، والتصدير مسار حتمي منفصل.
- `analyze_replication.py` (OpenCV + numpy): أدلة أولية لحدود اللقطات (dhash، عتبات MAD قوية) وتكرارات المصدر. **وهو تشخيصي وليس قرار مونتاج.**
- إضافات التوليد: `src/plugins/generation/{registry,host,contract,adapters}.js` مع مزودات Puter.js وComfyUI وSD WebUI. **لا يوجد runtime لتثبيت إضافات خارجية بعد.** القاعدة: "الوسائط المولدة تذهب إلى My assets ولا تُدرَج في التايم لاين تلقائياً".
- تصدير مسودة Jianying Pro (CapCut الصيني) قابلة للتحرير. ونسخة "Anna" سحابية تخطط من metadata فقط بدون تحليل إطارات.
- 13 لغة واجهة. والنماذج تأتي من HF أو ModelScope مع fallback تلقائي وcache مشترك.

## التقنيات والبنية
- الحزم/المكتبات: React + Vite، WebCodecs، WebGPU، onnxruntime-web/transformers.js، libav.js، fflate، MediaPipe، Python (cv2، numpy) لمهارة التحليل، Node لـ CLI وMCP.
- المعمارية: `src/lib/projectCommandEngine.js` (`validateCommandPlan`، `applyCommandPlan`، `diffProjects`، `inspectProject|Track|Clip|Transcript|Markers`) هو القلب المشترك. `scripts/timeline-command.mjs` (CLI)، و`skills/edit-timeline-studio/mcp/server.mjs` (MCP stdio)، و`src/lib/webMcpEditor.js` (يسجّل الأدوات عبر `document.modelContext.registerTool` أو `navigator.modelContext`). تشغيل محلي في المتصفح، مع مضيف macOS اختياري للحفظ الدائم.
- أمثلة ملموسة:
  - غلاف النتيجة: `{ ok, revision, appliedOperationIds, warnings, artifacts }`، وعند الفشل `{ ok:false, code, message, operationId }` بلا حالة جزئية.
  - أدوات WebMCP: `timeline_project_inspect`، `timeline_track_inspect`، `timeline_edit_preview`، `timeline_edit_apply`، `timeline_media_sample` (إطارات JPEG + WAV للوكيل)، `timeline_ai_prepare|start|inspect|cancel`، `timeline_export_prepare|start|inspect|cancel`، `timeline_semantic_plan`، `timeline_visual_search_query`…
  - `scripts/validate_edit_plan.mjs` للتحقق من الشكل فقط، ثم `npm run agent -- project.diff plan.json`.

## أشياء نأخذها لمشروعنا (قائمة، كل بند: ماذا + لماذا + أين يخدم الرؤية)
- **`replication-workflow.md` كمسودة لمواصفة "استنتاج النمط من مراجع":** السبع طبقات + look-state + blueprint جدولي هي أنضج تفكير رأيته في الجانب الاستنتاجي من §4.2. نحوّلها إلى **نموذج بيانات** (حقول نمط) بدل نص مهارة. ← **نظام الأنماط**.
- **plan envelope + `baseRevision` + معرّف idempotent لكل عملية + diff إلزامي قبل التطبيق:** يحقق "الوكيل يقترح أوامر ويُظهر أثرها" (§5) بشكل قابل للتحقق. ← **الوكيل / المحرر**.
- **`stateToken` → `previewId` → `apply` → `transactionId`:** تصميم أدوات MCP جاهز للنسخ المفاهيمي (MIT). ← **MCP**.
- **نمط prepare/start للمهام الثقيلة مع `allowModelDownload` صريح:** يحقق "حدود استهلاك وتكلفة واضحة" (§7) و"الموافقة قبل أي عمل مدفوع". ← **التوليد / التشغيل**.
- **ثابت caption↔speech + "المولّد يذهب للأصول لا للتايم لاين":** قواعد سلامة يمكن أن تصبح قواعد إلزامية افتراضية في النمط الديني (§4.3: تمييز النص المقتبس، وعدم إضافة كلام غير موجود). ← **نظام الأنماط**.
- **`timeline_media_sample`:** إعطاء الوكيل "عيوناً" (إطارات مرسومة + صوت مخلوط) للتحقق بعد التعديل. ← **الوكيل (المراجعة الذكية قبل التصدير)**.
- **brief بقرارات مصنفة (مستنتج/مؤكد/افتراضي/غير محسوم) مع الثقة:** هو بالضبط "إظهار حدود الثقة والخصائص التي لم تُستنتج بدقة" في §3. ← **نظام الأنماط / الوكيل**.
- **مرآة HF/ModelScope مع fallback:** مهمة لو وزعنا نماذج محلية في مناطق مختلفة. ← **التشغيل**.

## استلهامات (تجربة المستخدم، التسويق، التسعير، الطريقة التي شرحوا بها المنتج)
- README بـ 11 لغة، وشارات Trendshift وskills.sh وToolIndex، ومجتمع WeChat وlinux.do. توزيع قوي للسوق الصيني.
- عروض "قبل/بعد" قابلة لإعادة الإنتاج في Handbook منفصل («ماذا يمكن أن ينتج؟»).
- قسم "Responsible use of deep synthesis" صريح، ومطلوب لأي ميزة وجه أو صوت.
- مسارات توزيع متعددة: موقع مستضاف، وHugging Face Space، ونسخة Anna سحابية مدفوعة، وPWA قابلة للتثبيت.

## تحذيرات ومخاطر (ترخيص، نضج، اعتماد على API مدفوع، ادعاءات غير مثبتة)
- **نماذج بحثية بلا حق تجاري** (تبديل الوجه)، وتراخيص أصوات مختلطة. MIT لا يغطي الأوزان.
- **الفجوة بين المسارين:** CLI/MCP المحلي لا يرسم إلا جزءاً، وكثير من القدرات متاح فقط في المتصفح. فـ"حتمية" الوكيل محدودة.
- المهارة ضخمة جداً (SKILL.md نحو 42KB + 22 مرجعاً)، وتعليمات مثل "حلل كل 0.25 ثانية" مكلفة جداً بالرموز والوقت. ولم يتضح كم منها منفَّذ آلياً مقابل كونه تعليمات للنموذج.
- نسخة Anna تخطط "من metadata فقط بدون تحليل الإطارات أو الصوت". الادعاءات التسويقية عن "Auto Edit" يجب اختبارها.
- نموذج المسارات ثابت (6 مسارات بالاسم) ومسار رئيسي "متصل" (contiguous). أقل مرونة من تايم لاين حر متعدد المسارات.
- JavaScript بلا أنواع في معظم الكود.

## أسئلة مفتوحة
- هل نستطيع تحويل طبقات الأدلة السبع إلى ميزات تُستخرج آلياً (scene detect، beat tracking، color stats) بتكلفة معقولة لـ 3–5 مراجع؟
- ما الحد الأدنى من "look-state" الذي يكفي لنمط مفيد؟ (هل الإحصاءات العامة للون تكفي بدون masks الموضوع؟)
- هل WebMCP ناضج بما يكفي لنعتمد عليه، أم نكتفي بـ MCP عبر stdio/HTTP؟

## الحكم: ⭐⭐⭐⭐⭐ (5/5) — أنضج تصميم لعقد أوامر الوكيل (diff/preview/apply/idempotent) وأعمق تفكير في استنساخ الأسلوب من المراجع، وكل ذلك بترخيص MIT. مع الحذر من تراخيص النماذج ومن فجوة المسار المحلي.
