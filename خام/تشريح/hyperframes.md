# HyperFrames + HyperFrames Studio + Hypit

**المصادر في خام:** `مستندات/Mo Elgaraihy (@EngMoElgaraihy) on X (3).txt`, `روابط/https:::x.com:miguel07code:status:2102441708395041170.md`, `مستندات-Raw/charlieautomates — Comment “VIDEO” for all the resources_النص_الكامل.md`, (ويُذكر HyperFrames أيضاً داخل `video-use`)  
**الرابط الأصلي:** https://github.com/heygen-com/hyperframes · https://hyperframes.heygen.com · https://hyperframes.dev/studio · https://github.com/hypit-ai/hypit  
**النوع:** مستودع (إطار + CLI + مهارات Claude Code) + تطبيق سطح مكتب (Studio) + مستودع ثانٍ (Hypit)  
**الترخيص:** HyperFrames: Apache-2.0 · Hypit: Apache-2.0 معدّل (NOASSERTION) · **النجوم:** HyperFrames 72,866 · Hypit 25,842 · **آخر تحديث:** HyperFrames 2026-10-26 · Hypit 2026-10-26 · **اللغة/الحزمة:** TypeScript، Node ≥22، FFmpeg، Puppeteer/Chrome بلا واجهة، GSAP  
**تحقق من المصدر الأصلي:** نعم — استنساخ عميق 1 للمستودعين؛ قرأت README و`skills/hyperframes/SKILL.md` و`references/captions.md` و`skills/hyperframes-cli/SKILL.md` و`packages/cli/src/commands/{timeline,transcribe,history}.ts` و`docs/studio-app/*` (index, edit-with-the-agent, connect-your-agent, reference-video, brand-kits) و`docs/guides/{mcp,captions-and-recuts}.mdx` و`docs/faq.mdx`؛ ولـHypit: README وLICENSE و`skills/hypit/SKILL.md` و`examples/podcast/reference.svml` و`migrations/0.3.md`.

## ما هو (3–6 أسطر)
HyperFrames (من HeyGen) إطار مفتوح يحوّل HTML+CSS+رسوم قابلة للتقديم/التأخير (seekable) إلى MP4 حتمي: كل مشهد ملف HTML بسمات `data-start/data-duration/data-track-index`، والمحرّك يقدّم كل فريم في Chrome بلا واجهة ثم يرمّز بـFFmpeg. مبني صراحةً "للوكلاء": مهارات Claude Code/Codex وCLI غير تفاعلي بمخرجات JSON. **HyperFrames Studio** تطبيق سطح مكتب (ماك/ويندوز/لينكس) يجمع محادثة مع وكيلك المحلي + معاينة + تايم لاين مشترك، مع تحرير بالرسم/التعليق على الفريم. **Hypit** مشروع منفصل (ليس من HeyGen) يستنسخ "صيغة" فيديو ناجح بلغة ترميز خاصة (SVML) مرتكزة على الكلمات لا الثواني؛ كان يعتمد على HyperFrames ثم استبدله بـ`HtmlProgram` خاص به في 0.3.

## الأفكار (قائمة)
- الفيديو = ملفات HTML نصية يكتبها الوكيل ويعدّلها الإنسان في نفس الملفات (لا صيغة تايم لاين مغلقة).
- الحتمية: نفس المدخل = نفس الفريمات (ممنوع `Date.now()` و`Math.random()` غير المبذور والشبكة والمؤقتات).
- تايم لاين مشترك بين الإنسان والوكيل مع سجل يفصل تعديلات كل طرف.
- "مرجع → انسخ أسلوب المونتاج": يحلّل فيديو مرجعياً ويطبّق قصّه وكابشنه ومؤثراته على لقطاتك.
- Brand kit يُقرأ مع كل رسالة للوكيل ويُنسخ للمشروع.
- Hypit: كل حدث بصري مربوط بكلمة في النص (anchor) فيعيد التوقيت تلقائياً عند تغيير الصياغة أو اللغة.

## المميزات (قائمة، ما يفعله فعلاً لا ما يدّعيه التويت)
- CLI: `init`, `preview`, `render`, `check --json` (لنتر بقواعد العقد مع سطر `Fix:`)، `snapshot --review`، `transcribe`، `timeline`، `history`، `media-treatment`، `remove-background`، `tts`، `capture <url>`، `add <block>`، `lambda`/`cloudrun` للتصيير السحابي.
- تحرير التايم لاين بأوامر ذرية: `timeline move|trim|split|delete|set|duplicate <ref>`، و`timeline apply plan.json` (خطة JSON مثل `[{"verb":"move","ref":"#outro","time":"9"}]`) تُرجع `receipt` يُستخدم في `timeline undo receipt.json`.
- سجل المشروع (تجريبي): `history begin --who <agent> --label ...` ثم `history --since mine --who <agent>` ليرى الوكيل ما غيّره المستخدم منذ دوره، و`history undo`، و`history end`.
- التفريغ محلي: whisper.cpp (افتراضي `small.en` — **يترجم غير الإنجليزي للإنجليزية** إن لم تحدّد `--model small --language`) أو Parakeet؛ يخرج توقيت كل كلمة `[{id,text,start,end}]` إلى `assets/transcript.json` ويصدّر SRT/VTT.
- مكتبة ~450 بلوك (انتقالات shader، كابشن، رسوم بيانية، خرائط، 3D) تُثبّت كمصدر قابل للتعديل.
- Studio app: تحرير بالكتابة أو التحديد (V) أو الرسم (D) أو التعليق (C) على مكان ولحظة؛ حتى 10 تعديلات معلّقة تُرسل دفعة واحدة؛ تايم لاين يدوي (Split/Delete/Speed/Volume/Fade/Close gaps)؛ Cmd+Z؛ "Show original" لمقارنة المرجع جنباً إلى جنب على نفس الساعة.
- يدعم وكلاء: Claude Code، Codex، Grok، Antigravity، Copilot، OpenCode (مجاني)؛ وضع صلاحيات Auto أو Full access.
- MCP مستضاف (`https://mcp.heygen.com/mcp/hyperframes/`، بيتا) للعمل من Claude.ai/ChatGPT بتصيير سحابي.
- Hypit: حزم مولّدات (seedance، gpt-image، nano-banana، elevenlabs، fishaudio…) ومحاذاة whisperx محلية و`yt-dlp`، وأمثلة "مرجع + 3 نسخ" (UGC، بودكاست، مقابلة شارع).

## التقنيات والبنية
- الحزم/المكتبات: `@hyperframes/core` (أنواع، محلل، لنتر، runtime، محوّلات إطارات)، `engine` (Puppeteer+FFmpeg)، `producer` (تصيير+مزج صوت)، `studio` (محرر متصفح)، `player` (`<hyperframes-player>`)، `shader-transitions`، `aws-lambda`؛ GSAP/Lottie/Three.js/Anime.js/WAAPI عبر "frame adapters".
- المعمارية: `index.html` جذر يعلن المتغيرات ويركّب مشهداً لكل sub-composition في `compositions/`؛ الأصول في `assets/`. التايم لاين = عناصر `class="clip"` بـ`data-start`/`data-duration` بالثواني، و`data-track-index` مجرد مسار عرض في Studio (ترتيب الرسم بـz-index). كل composition تسجّل timeline متوقفاً في `window.__timelines[id]`. أنواع المسارات `data-track-kind="graphics|captions"`. النصوص والألوان والوسائط القابلة للتبديل متغيرات `data-var-text`/`data-var-src`/`var(--id)`. محلي بالكامل للتصيير؛ السحابي اختياري (HeyGen لأصوات/أفاتار/تصيير/تحليل المرجع).
- الوكيل: لا API داخلي — الوكيل يكتب HTML ويشغّل CLI بـ`--json`، ويتبع "عقداً" من 12 قاعدة في SKILL.md وحلقة عمل (timeline → history → تعديل → check → snapshot → render بعد الموافقة).
- Studio app: الوكيل يعمل على جهاز المستخدم ويُفوتر على حسابه؛ ميزة Reference تستخدم مفتاح HeyGen API (تحليل سحابي مدفوع)؛ Brand kits تتطلب تسجيل دخول HeyGen.
- Hypit: ملف `.svml` بـ`<import>` لحزم، و`<script>` بنص المشهد مقسوم بـ`||` وعلامات دلالية `@{~lifestyle}`/`@{/lifestyle}`؛ "Semantic alignment, musical beats and authored events are peer sources of absolute time".
- أمثلة ملموسة: `npx hyperframes timeline --json`، `timeline apply plan.json`، `history --since mine --who claude`، قواعد الكابشن في `references/captions.md`: مجموعات 2–3 كلمات للحماس، 3–5 للحوار، 4–6 للهدوء؛ كسر عند نهاية جملة أو وقفة ≥150ms؛ اختيار blend حسب سطوع الخلفية (<60 screen، 60–180 overlay، >180 normal)؛ كلمة "embed" واحدة خلف المتحدث تغطيها الرأس 30–55%.

## أشياء نأخذها لمشروعنا
- **خطة تعديل ذرية + إيصال + تراجع** (`timeline apply` → receipt → undo): كل اقتراح من الوكيل دفعة قابلة للمعاينة والإلغاء — **الوكيل/المحرر** (وضع "خطة للمراجعة ثم التنفيذ" في الرؤية).
- **سجل يفصل تعديلات الإنسان عن الوكيل** (`history --since mine --who`): المادة الخام لميزة "اقتراح تحديث النمط من تصحيحات المستخدم" — **نظام الأنماط**.
- **Reference → Copy editing style** مع قائمة "What to swap" بكل عنصر وزمنه وطريقة ملئه، و"Show original" للمقارنة: أقرب شيء لفرضيتنا؛ ننسخ تجربة المقارنة جنباً إلى جنب وإظهار ما استُنتج — **نظام الأنماط**.
- **Brand kit بأدوار ألوان (Main/Secondary/Accent/Text/Background/Neutral) + قواعد نصية + PDF دليل الهوية، يُنسخ إلى `assets/brand-kit`**: نموذج جاهز لقسم "الأصول المرتبطة" في النمط — **نظام الأنماط**.
- **قواعد الكابشن الرقمية** (حجم المجموعة، الوقفات، المناطق الآمنة 90%/80%، blend حسب السطوع): كقيم افتراضية قابلة للتخصيص في قسم "النصوص" — **نظام الأنماط/التوليد**.
- **التحرير بالإشارة على الفريم** (تحديد/رسم/تعليق مثبت بزمن ومكان) + طابور تعديلات يُرسل دفعة: واجهة للمحادثة المرتبطة بالتايم لاين — **المحرر/الوكيل**.
- **HyperFrames كمحرك طبقة الموشن** (Apache-2.0، محلي، حتمي): يمكن أن يكون مصيّر طبقات الرسوم/الكابشن فوق الفيديو بدل بناء محرك — **التصدير/التوليد**.
- **`check --json` بسطر Fix**: لنتر للمشروع يقرأه الوكيل ليصلح نفسه — **الوكيل**.
- **ربط الأحداث بالكلمات لا بالثواني** (Hypit): عند حذف جملة أو إعادة الصياغة تتحرك الرسوم معها — **المحرر/نظام الأنماط**.

## استلهامات
- شعار واضح: "Write HTML. Render video. Built for agents." ومقارنة مباشرة مع Remotion في جدول.
- التطبيق مجاني والفوترة على وكيل المستخدم نفسه (BYO agent) + OpenCode مجاني — نموذج تسعير منخفض الاحتكاك.
- شخصية مرشد "Framey" ورسوم توضيحية متحركة لكل خطوة في التوثيق.
- "frame.md": ترجمة design.md للعلامة إلى قواعد للكاميرا — فكرة تسويقية قوية لـ"النمط".
- ردود الجمهور: إعجاب بـ"Opus 1-shotted launch video in 20 mins" — النتيجة السريعة من برومبت واحد هي ما ينتشر.
- Hypit: "One workflow, 100 variants" وتسويق موجّه للإعلانات المدفوعة وTikTok Shop.

## تحذيرات ومخاطر
- **Studio desktop app**: لم أجد مصدره في المستودع (لا electron/tauri)؛ الـFAQ يقول إن الإطار وCLI والمهارات Apache-2.0 فقط — غالباً التطبيق مغلق ويتطلب حساب HeyGen.
- ميزة Reference سحابية عبر HeyGen API ومدفوعة؛ Brand kits تتطلب حساباً — عكس تفضيلنا المحلي.
- افتراضي التفريغ `small.en` يترجم العربية للإنجليزية بصمت — خطر مباشر لجمهورنا العربي.
- التصيير عبر Chrome بلا واجهة لكل فريم: بطيء للفيديو الطويل، وإزالة الخلفية ~2fps على CPU.
- Hypit: ترخيص معدّل يمنع SaaS متعدد المستأجرين وإعادة التوزيع التجارية ويُلزم بقاء الشعار — لا يصلح للتضمين في منتج تجاري. الأفضل اعتماده كمصدر أفكار فقط. وادعاء "1:1 clone" يعتمد غالباً على نماذج توليد مدفوعة.
- ادعاء تويت charlieautomates أن "HyperFrames renders it" لم يعد دقيقاً بعد Hypit 0.3.
- أرقام النجوم في التويتات (22,943) أقدم من الحالية؛ نمو سريع جداً قد يعني تغيّرات API متكررة (مثلاً سجل `history` موسوم "trial").

## أسئلة مفتوحة
- هل Studio app مفتوح المصدر في مستودع آخر؟ وما الذي يُرسل لـHeyGen أثناء تحليل المرجع؟
- كيف يمثّل "Copy editing style" النمط داخلياً؟ هل يُحفظ كقالب قابل لإعادة الاستخدام أم يُطبّق مرة واحدة؟
- هل HTML-كصيغة مشروع يتحمّل فيديو طويلاً (ساعة) بلقطات خام كثيرة، أم يصلح فقط لطبقة الموشن؟
- أداء Parakeet/whisper.cpp مع العربية واللهجات.

## الحكم: ⭐⭐⭐⭐⭐ (5) — أقرب منافس ولبنة بناء معاً: تايم لاين مشترك إنسان/وكيل، خطط تعديل بإيصالات وتراجع، سجل يفصل تعديلات الطرفين، و"انسخ أسلوب المرجع" — كلها مقروءة في الكود والتوثيق وبترخيص Apache-2.0 للإطار.
