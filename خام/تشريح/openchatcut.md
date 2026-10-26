# OpenChatCut

**المصادر في خام:** `مستودعات-الوثيقة/OpenChatCut.md`  
**الرابط الأصلي:** https://github.com/0xsline/OpenChatCut (الأصل: 2689 نجمة، 414 fork، آخر دفع 2026-10-21، الإصدار 0.2.17+) — الرابط في وثيقة الرؤية https://github.com/jeongpiano/openchatcut **نسخة fork/مرآة** (5 نجوم، آخر commit 2026-08-25 بتوقيع 0xsline، الإصدار 0.2.11). الموقع: https://openchatcut.com  
**النوع:** مستودع (تطبيق ويب + Electron) + مهارة Agent + خادم MCP  
**الترخيص:** AGPL-3.0-or-later (ملف LICENSE فعلي)، **ومهارات الوكيل المضمَّنة مقتبسة من ChatCut-Inc/agent-plugin بترخيص GPL-3.0-only** (حسب `src/agent/skills/NOTICE.md`). والتصدير يعتمد على Remotion (له ترخيص شركات خاص) · **النجوم:** 2689 (الأصل) · **آخر تحديث:** 2026-10-21 · **اللغة/الحزمة:** TypeScript 6/7، React 19، Vite 8، Electron 43–45، Remotion 4، Vercel AI SDK 7  
**تحقق من المصدر الأصلي:** نعم (README + ~14 ملفاً من لقطة الـ fork بتاريخ أغسطس: editor/{projectTypes,timelineTypes,clipTypes,designTypes,design-presets,storeCommands}.ts، agent/{proposal,changeLog,external-edit-session,external-tool-policy}.ts، plugins/types.ts، remotion/render.mjs، skills/talking-head-guide/SKILL.md، NOTICE.md. وقارنت CHANGELOG الأصل حتى 0.2.17: التغييرات بعد أغسطس تدريجية وليست معمارية)

## ما هو (3–6 أسطر)
أكبر وأنضج محرر "وكيلي" في الدفعة: نحو 248 ألف سطر، و1292 ملف TS في `src`. يجمع تايم لاين احترافياً (ripple وslip وrate-stretch وmulticam وsequences متداخلة وkeyframes) مع وكيل مدمج (Vercel AI SDK، ومزودات متعددة BYOK، ويدعم اشتراك ChatGPT عبر Codex CLI) ومع وكلاء خارجيين عبر Streamable HTTP MCP. كل تعديل من الوكيل يُبنى كـ**مقترح (Proposal) على مسودة معزولة**، ثم يُطبَّق ذرياً كخطوة تراجع واحدة. يحتوي تفريغاً كلمةً بكلمة، والقص عبر النص، وترجمة نصية بأنماط، وMotion Graphics في sandbox، ومؤثرات WebGL/GLSL، وLUTs، وتوليد صور وفيديو وصوت وموسيقى، وتصديراً عبر Remotion + FFmpeg إلى MP4/FCPXML/SRT/مسودة Jianying.

## الأفكار (قائمة)
- **عقد propose → apply:** `Proposal { title, summary, totalImpact, options[], baseDoc, resultState }` ← `ProposalOption { label, recommended, operations[] }` ← `Operation { tool, args, actions[], action, target, impact, rationale }`. الوكيل لا يعدّل التايم لاين مباشرة أبداً. والمقترح يحمل **عدة خيارات** (A/B/C)، والتطبيق يُرفض إذا تغيّر `baseDoc` (أي صار المقترح قديماً stale).
- **جلسات تعديل خارجية:** `begin_edit_session(approvalMode: manual|auto)` ← أدوات تعمل على مسودة ← `review_edit_session` ← المستخدم يوافق داخل المحرر. **أدوات ذات أثر جانبي فوري (توليد، تصدير، حذف) لا تُعرض في الجلسات** لأن رفض المقترح لا يستطيع التراجع عنها (`external-tool-policy.ts`: READ_ONLY / DRAFT_EDIT / SERVER_DIRECT).
- **`DesignStyle` على مستوى المشروع:** `{ colors: [{role, value}], fonts: [{role, family}], styleGuide?: string }`. الأدوار نصوص حرة ("accent copper"، "Chinese heading")، و`styleGuide` نص يصف الحركة والإيقاع والانتقالات وقواعد "تجنّب". فيه 24 preset، وأداة `manage_design_style` (list/get/apply/custom)، والوكيل يستخدمه عند توليد MG والترجمة النصية.
- **`AgentChangeSession`:** سجل لآخر 20 تغييراً من الوكيل، فيه `beforeDoc` و`afterRevision` و`rollbackable`، فيمكن التراجع عن "جلسة وكيل" كاملة.
- **مهارات SKILL.md قابلة للتحرير من المستخدم:** في `~/.openchatcut/skills/<slug>/SKILL.md` (نفس تخطيط `~/.claude/skills`)، ومعها `skill-creator` مدمج و26 مهارة متخصصة (talking-head-guide، long-video-to-shorts، multi-clips-to-reels، news-rough-cut…) تُحمَّل عند الحاجة عبر router.
- **حزمة إضافات `openchatcut-plugin@1`:** JSON مستقل لـ MG/transition/effect/LUT/zoom، بحدود تحقق صارمة (`PLUGIN_LIMITS`) لأن المحتوى الخارجي يُعامل كمدخل غير موثوق، والكود يعمل في sandbox.
- **أسماء المسارات مستقرة + أسماء مستعارة (V1/A1/C1)** حتى يشير الوكيل للمسار بلغة المحرر.

## المميزات (قائمة، ما يفعله فعلاً لا ما يدّعيه التويت)
- مستند `ProjectDoc { version, assets[], mediaFolders[], timelines[], activeTimelineId, designStyle? }`. وكل `Timeline` فيه `fps/width/height/items/trackOrder/tracks/transitions/markers/linkGroups/multicamGroups/captions/watermark/fxDefs`.
- الزمن بإطارات (`startFrame`، `durationInFrames`). وkeyframes لكل خاصية (`x,y,scale,rotation,opacity,borderRadius,volume`) مع easing أو bezier، و`ReframeCurveV1` للتكبير والتتبع.
- `EditorCommands`: واجهة أوامر موحدة (addMediaItem، addSequence، …) يستخدمها المحرر والوكيل وMCP.
- وكيل مدمج: model loop على الخادم المحلي، مع ضغط السياق (context compaction)، وتفعيل أدوات حسب المهارة، وتعافٍ من الانقطاع، و"vision" (عرض إطارات التايم لاين للنموذج: `view_timeline_frames`).
- رؤية هندسية: تقسيم الشخص ومناطق آمنة للوجه، فالترجمة النصية تتجنب المتحدث تلقائياً (`apply_caption_avoidance`، `place_graphics_in_safe_zone`، `auto_reframe`).
- presets للترجمة النصية يحفظها المستخدم (`preset_save/apply/list`).
- تصدير: Remotion `bundle → selectComposition → renderMedia` في Chrome بلا واجهة، مع تسريع عتادي (VideoToolbox/NVENC) وطابور تصدير، بالإضافة إلى FCPXML وSRT ومسودة Jianying.
- محلي أولاً: المشاريع في `~/.openchatcut`، والمفاتيح على الخادم فقط، وMCP مربوط محلياً مع Bearer token اختياري.

## التقنيات والبنية
- الحزم/المكتبات: React 19، Vite 8، TypeScript 6→7، Electron 43→45، `remotion` و`@remotion/renderer` 4.0.5xx، `ai` 7 (Vercel AI SDK)، `@modelcontextprotocol/sdk` 1.29، WebGL/GLSL، IndexedDB، Cloudflare R2 اختياري، whisper.cpp (سطح المكتب)، DeepFilterNet3 (عزل الصوت)، E2B، Firecrawl.
- المعمارية: `src/editor/` (حالة غير قابلة للتغيير + reducer + أوامر، مستقلة عن UI وLLM)، `src/agent/` (الوكيل والأدوات والمهارات والمقترحات والجسر الخارجي)، `server/plugins/` (التوليد والتفريغ والتصدير والتخزين)، `remotion/` (العرض)، `desktop/` (Electron). المعاينة عبر Remotion Player، والتصدير عبر Remotion على الخادم المحلي.
- أمثلة ملموسة:
  - MCP: `http://localhost:5199/api/external-mcp/mcp`، `claude mcp add --transport http openchatcut …`
  - أدوات القراءة: `read_timeline`، `read_project`، `read_transcript`، `view_timeline_frames`، `search_media`…
  - أدوات تعديل المسودة: `update_item_props`، `move_item`، `set_item_timing`، `split_item`، `edit_captions`، `apply_script`، `manage_effects`، `manage_design_style`، `auto_reframe`…
  - `src/agent/proposal.ts`، `src/agent/external-edit-session.ts`، `src/editor/designTypes.ts`، `src/plugins/types.ts`.

## أشياء نأخذها لمشروعنا (قائمة، كل بند: ماذا + لماذا + أين يخدم الرؤية)
- **Proposal بخيارات متعددة + `baseDoc` للتحقق من التقادم:** هذا هو بالضبط "الوضع الموجّه" و"مختبر الأنماط A/B/C" في §4.2 و§6. ← **الوكيل / نظام الأنماط**.
- **تصنيف الأدوات: قراءة / مسودة / أثر جانبي فوري:** قاعدة ذهبية لمستويات الصلاحية (§6): ما لا يمكن التراجع عنه لا يدخل في وضع "تلقائي". ← **الوكيل / الأمان**.
- **`DesignStyle` (أدوار حرة + `styleGuide` نصي):** أقرب شيء مُطبَّق لـ"النمط"، لكنه هوية بصرية فقط. نأخذه نواةً ونوسّعه بقواعد القص والإيقاع والصوت والقواعد الإلزامية مقابل التفضيلات (§4.1). ← **نظام الأنماط**.
- **`AgentChangeSession` (التراجع عن جلسة وكيل كاملة):** مفيد لـ"التصحيح يطبق على المشروع أولاً ثم يُقترح تحديث النمط". ← **نظام الأنماط / المحرر**.
- **مهارات SKILL.md في مجلد يملكه المستخدم + skill-creator:** نموذج جاهز لجعل "النمط" قابلاً للتحرير يدوياً ومشاركته كملف. ← **نظام الأنماط (Style Pack)**.
- **ترتيب التنفيذ في talking-head-guide:** القص الصوتي أولاً لأنه يثبّت التوقيت، ثم MG وB-roll والموسيقى والترجمة، مع نقطة تأكيد بعد كل خطوة كبرى. قاعدة تشغيل للوكيل تنطبق على أي نمط. ← **الوكيل**.
- **تجنّب الترجمة النصية للوجه/المتحدث بالتقسيم الهندسي:** قاعدة "المشهد والتكوين" في §4.1 مطبقة فعلياً. ← **نظام الأنماط / المحرر**.
- **تصدير FCPXML:** يعطي المستخدم المحترف مخرجاً نحو Premiere/Resolve، وهذا يقلل الخوف من الحبس داخل منتجنا. ← **التصدير**.

## استلهامات (تجربة المستخدم، التسويق، التسعير، الطريقة التي شرحوا بها المنتج)
- التموضع: «Open-source ChatCut alternative». ركوب اسم منتج تجاري معروف، مع مدونة SEO (chatcut-vs-openchatcut). وهذا ساهم في الانتشار السريع (2.7 ألف نجمة).
- جدول "محرر تقليدي مقابل توليد AI لمرة واحدة مقابل OpenChatCut": الرسالة «لا يولّد فيديو لا يمكن تغييره»، وهي نفس فرضية رؤيتنا.
- مكتبة موارد مجتمعية (openchatcut.com/resources) يرفع فيها المساهمون MG وLUT وانتقالات بترخيص يختارونه، مع معاينة تُرسم تلقائياً. نموذج أولي لـ"متجر الأنماط".
- دعم اشتراك ChatGPT عبر Codex CLI الرسمي، وClaude عبر MCP فقط. هذا حل عملي لمعضلة "الاشتراك ليس رصيد API" في §8.
- صور حقيقية من المنتج بدل mockups، وتغيير بلغتين في كل إصدار.

## تحذيرات ومخاطر (ترخيص، نضج، اعتماد على API مدفوع، ادعاءات غير مثبتة)
- **طبقتان من copyleft:** النواة AGPL-3.0 (أي استخدام عبر الشبكة يُلزم بنشر المصدر)، والمهارات GPL-3.0-only مقتبسة من ChatCut. أي نسخ للكود أو المهارات يجعل منتجنا AGPL. **للاستلهام فقط، ويحتاج مراجعة قانونية قبل اقتباس أي ملف.**
- **Remotion:** ترخيصه يتطلب Company License للشركات التي يزيد عدد موظفيها عن حد معيّن، وهذا يجب فحصه لو اعتمدنا Remotion نفسه.
- رابط وثيقة الرؤية يشير إلى fork متأخر شهرين. يجب تصحيحه إلى `0xsline/OpenChatCut`.
- الحجم الضخم والتعقيد (248 ألف سطر، ومئات ملفات `.verify.ts`) يعنيان أن الـ fork أو الصيانة مكلفان جداً.
- التوليد والتفريغ السحابي يعتمدان على مفاتيح API مدفوعة (AssemblyAI، Doubao، MiniMax…). المحلي منها whisper.cpp فقط.
- نسخ macOS غير موقّعة، والمشروع في "تطوير نشط"، وصيغة المشروع قد تتغير.
- واجهات ومصطلحات صينية أولاً (التسميات في proposal.ts بالصينية)، ودعم العربية/RTL غير مُختبر.

## أسئلة مفتوحة
- هل نحتاج "Proposal بخيارات" لكل تعديل، أم فقط للتعديلات الحساسة حسب عتبات النمط؟
- كيف نوسّع `DesignStyle` إلى نمط كامل (قص، إيقاع، صوت، قواعد إلزامية) بدون أن يصبح `styleGuide` نصاً حراً يصعب التحقق منه؟
- هل Remotion (React → فيديو) مناسب لنا أمام مسار PixiJS/WebCodecs (Cutaway/OpenVideo)، مع الأخذ بالاعتبار الترخيص وثقل Chrome headless؟
- ما دقة whisper.cpp للعربية واللهجات داخل هذا المسار؟

## الحكم: ⭐⭐⭐⭐⭐ (5/5) — أقرب منتج قائم لرؤيتنا (وكيل + تايم لاين حقيقي + مقترحات بموافقة + نمط تصميم + مهارات + MCP)، وهو المرجع المعياري للمقارنة. لكن AGPL/GPL يجعله للاستلهام فقط لا للبناء عليه.
