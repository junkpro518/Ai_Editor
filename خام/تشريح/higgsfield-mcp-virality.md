# Higgsfield MCP + Virality Predictor

**المصادر في خام:** `مستندات/0xMarioNawfal (@RoundtableSpace) on X (16).txt`, `مستندات-Raw/moujtabakhalifa — ⁨	كلود الان يقدر يتوقع احتمالية الانتشار الفيروسي لمحتواك قبل ما تنشرة_النص_الكامل.md`  
**الرابط الأصلي:** https://github.com/Hikhakk/higgsfield-mcp-unified · https://higgsfield.ai (المنصة) · مقال ثانوي: https://pasqualepillitteri.it/pt/news/2280/higgsfield-virality-predictor-hook-score-hold-rate-2026  
**النوع:** مستودع (MCP مجتمعي) + ميزة SaaS مغلقة  
**الترخيص:** MIT (مستودع المجتمع) · **النجوم:** 98 · **آخر تحديث:** 2026-10-17 · **اللغة/الحزمة:** Python (`higgsfield-mcp-unified` على PyPI، alpha)  
**تحقق من المصدر الأصلي:** جزئي — README المستودع نعم؛ الـVirality Predictor من مصدر ثانوي واحد (مقال) + ريلز، لا وثائق رسمية من Higgsfield وصلتني.

## ما هو
شيئان مختلفان جمعتهما المصادر:
1. **MCP مجتمعي غير رسمي** (`Hikhakk/higgsfield-mcp-unified`) يعرّض واجهة Higgsfield API: 85 نموذج صور وفيديو مُنمَّطة (Seedance 2.5، Kling 3.0، Wan 3، Soul، Cinema Studio…) مع تقدير تكلفة وWebhooks وتدريب شخصيات Soul ID. تغريدة «43+ نموذج / score / refine shot by shot» مبالغة أو قديمة نسبياً: README يقول 85 نموذجاً ولا توجد أداة «score» صريحة؛ الأقرب أدوات `recommend_model` و`validate_params` و`estimate_cost`.
2. **Virality Predictor**: ميزة داخل منصة Higgsfield (مغلقة)، تُستدعى من Claude عبر MCP الرسمي المستضاف (`mcp.higgsfield.ai` بـOAuth) أو CLI.

## الأفكار
- **التقدير قبل الإنفاق**: `estimate_cost`/`validate_params`/`preflight_check` مجاناً قبل أي توليد مكلف.
- مفتاح idempotency لكل طلب لمنع الدفع المزدوج عند إعادة المحاولة، مع backoff وcircuit breaker وأخطاء مصنّفة (auth/رصيد/تزامن/شبكة).
- مخرجات منظّمة (`outputSchema` + `structuredContent`) بدل blob.
- Resources للكتالوج (`higgsfield://models`) وPrompts جاهزة (`cinematic_shot`, `product_360`, `b_roll`…).
- الوكيل يفحص الفيديو **قبل النشر** ويعدّل بناءً على نتيجة تنبؤية.

## المميزات (فعلياً)
- MCP: `list_models, recommend_model, validate_params, estimate_cost, generate_image, generate_video, generate_batch, get_status/subscribe, cancel_job, upload_image, list_model_presets, create_character…`؛ المخرجات تُحفظ 7 أيام على الأقل.
- **ما يقيّمه Virality Predictor** (حسب المقال الثانوي، غير مؤكد رسمياً): درجة إمكانية انتشار 0-100، **Hook Score** (قوة الثانية الأولى ومطابقة أول إطار للعنوان)، **Hold Rate** (نسبة تقديرية لمن يكمل للنهاية)، **Brain Heatmap** (تنبؤ بنشاط مناطق الانتباه والعاطفة والذاكرة). المهمة تُسمى `brain_activity`. يقبل مقاطع حتى **15 ثانية** أفقية/عمودية. المقال نفسه يقول: إحصائي لا فحص دماغ حقيقي، والنموذج صندوق أسود بلا ورقة ولا أرقام دقة، ويعمل بنظام الرصيد المشترك. ريلز moujtabakhalifa يقول «مدرّب على آلاف الساعات من المسح الدماغي» و«ثانية بثانية» — ادعاء تسويقي غير موثق بالمصدر.

## التقنيات والبنية
- الحزم: Python + uv، stdio MCP؛ إعداد: `claude mcp add higgsfield -e HIGGSFIELD_API_KEY=… -e HIGGSFIELD_SECRET=… -- uvx --from higgsfield-mcp-unified higgsfield-mcp`.
- المعمارية: خادم محلي بمفتاح API رسمي (طلبات إلى سحابة Higgsfield)، `generate_*` تعيد `job_handle` ثم `subscribe`؛ Webhooks عبر `hf_webhook`؛ backend تجريبي اختياري لنماذج Sora/Veo/Nano Banana عبر واجهة ويب غير رسمية (مخاطرة).
- الـPredictor: CLI `@higgsfield/cli` (`higgsfield auth login` ثم مهمة `brain_activity`) أو MCP الرسمي؛ يعيد JSON بأربع درجات ورابط تقرير.

## أشياء نأخذها لمشروعنا
- **تصميم MCP «تقدير ← تحقق ← تنفيذ ← استعلام»** لأي عملية مكلفة في محررنا (توليد، ترجمة سحابية). يخدم: الوكيل/MCP.
- **تصنيف أخطاء منظّم وidempotency** لعمليات الوكيل. يخدم: التشغيل.
- **مفهوم «فحص جودة قبل النشر» (hook/retention)** كخطوة في الوكيل: نستطيع بناء نسخة محلية بسيطة (كثافة القص في أول 3 ثوانٍ، وجود نص على الشاشة، تغيّر المشهد) دون ادعاء علمي. يخدم: الوكيل/نظام الأنماط (قياس أثر النمط).
- **Prompts مُعلَّمة كقوالب MCP** (`cinematic_shot`): فكرة لحزم الأنماط. يخدم: الأنماط.

## استلهامات
- عنوان «كلود الآن يقدر يتوقع الانتشار قبل النشر» + دعوة «علّق بكلمة انتشار» لإرسال الرابط (استقطاب بالتعليقات).
- تغريدة Roundtable: «Someone turned Claude into a full AI video studio» — تأطير «استوديو كامل بأداة واحدة».

## تحذيرات ومخاطر
- Predictor مغلق ومدفوع بالرصيد، سقف 15 ثانية، دقته غير منشورة؛ لا نعتمده كمرجع علمي.
- MCP المجتمعي alpha بـ98 نجمة؛ المسار «web backend» ينتهك غالباً شروط الاستخدام.
- توليد الفيديو (Seedance/Kling) سحابي مدفوع وخارج رؤية المعالجة المحلية.

## أسئلة مفتوحة
- هل للـPredictor أداة MCP رسمية باسم محدد؟ (المقال لا يذكرها.)
- ما الكلفة بالرصيد لكل تحليل؟ وهل يقبل العربية في الكلام/النص على الشاشة؟

## الحكم: ⭐⭐⭐ — نمط تصميم MCP ممتاز يستحق النسخ، أما الـPredictor فصندوق أسود مغلق نكتفي بفكرته.
