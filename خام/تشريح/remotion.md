# Remotion (+ مهارات Remotion الرسمية للوكلاء)

**المصادر في خام:** `مستودعات-الوثيقة/Remotion.md`, `روابط/https:::x.com:kseniam0s:status:2099593754659459507.md`, `روابط/https:::x.com:xingbugengming:status:2089540284241572107.md`  
**الرابط الأصلي:** https://github.com/remotion-dev/remotion · https://github.com/remotion-dev/skills · https://remotion.dev  
**النوع:** مكتبة / إطار عمل (+ حزمة مهارات Claude Code/Codex)  
**الترخيص:** ترخيص Remotion الخاص (NOASSERTION على GitHub، مستويان: مجاني/شركات) · المهارات: بلا ترخيص معلن · **النجوم:** 67,817 (المهارات 5,739) · **آخر تحديث:** 2026-10-26 · **اللغة/الحزمة:** TypeScript / React (`remotion`, `@remotion/*`)  
**تحقق من المصدر الأصلي:** نعم (README + LICENSE.md + استنساخ `remotion-dev/skills` وقراءة 8 ملفات: `remotion-best-practices/SKILL.md`, `remotion-interactivity/SKILL.md`, `timeline-structure.md`, `remotion-markup/arabic-text.md`, `video-editing.md`, `silence-detection.md`، وقائمة كل المهارات)

## ما هو (3–6 أسطر)
إطار يصنع الفيديو من كود React: كل إطار هو دالة نقية في رقم الإطار (`useCurrentFrame()`)، ويُرندر عبر Chromium + ffmpeg محلياً أو على Lambda/Vercel أو داخل المتصفح. صار يقدّم نفسه "أدوات فيديو لعصر الوكلاء": وكيل البرمجة يكتب الكود، والـStudio يتيح تعديلاً تفاعلياً بالسحب يُكتب راجعاً إلى الكود ("كود React هو مصدر الحقيقة"). معه حزمة مهارات رسمية (`npx skills add remotion-dev/skills`) تعلّم الوكيل أفضل الممارسات. هو المحرّك الذي تُبنى عليه أغلب مشاريع هذه الدفعة (video-shotcraft، استوديو عبدالله).

## الأفكار (قائمة)
- الفيديو = دالة نقية في الزمن ← الحتمية، والرندر المتوازي، والتعديل بالكود.
- "Switch your workflow at any point": وكيل ↔ سحب وإفلات ↔ كود على نفس المصدر.
- الـStudio يحرّر عُقد JSX مباشرة: كل عنصر قابل للتحرير = عقدة JSX باسم ثابت وخصائص inline.
- مهارة "احترم تعديلات المستخدم": إذا اكتشف الوكيل تغييراً مفاجئاً في الكود فهو مقصود، لا يكتب فوقه.
- لا ترندر افتراضياً، افتح المعاينة التفاعلية وخلّ المستخدم يراقب ويوجّه.
- مكتبات مكوّنات جاهزة: Elements, Effects, Transitions, SFX, Captions، و"Editor Starter" لبناء محرر فيديو كامل.

## المميزات (قائمة، ما يفعله فعلاً لا ما يدّعيه التويت)
- رندر عبر Node (`@remotion/renderer`) أو Lambda أو Vercel Sandbox أو client-side.
- `<Player>` لتضمين المعاينة في تطبيق ويب.
- Studio بتحرير تفاعلي: schema لكل مكوّن، بحقول قابلة لـkeyframes، وتُكتب التعديلات للكود.
- مهارات الوكيل (من المستودع): `remotion-create`, `remotion-markup` (≈30 مرجعاً: timing, sequencing, transitions, captions, voiceover, silence-detection, video-editing, arabic-text, light-leaks, motion-blur, 3d, lottie, color-correction...)، `remotion-interactivity`, `remotion-captions`, `remotion-render`, `remotion-multimedia`, `remotion-maps`, `remotion-saas`, `remotion-upgrade`.
- دعم عربي موثّق تفصيلياً (`arabic-text.md`): `dir="rtl"`، كشف الاتجاه بعدّ الكلمات لا بالحرف الأول، تحريك على مستوى الكلمة، وتقطيع الحروف بـZWJ مع إبقاء لام-ألف والتشكيل والأرقام كوحدة واحدة.
- كشف صمت تكيّفي: يقرأ `input_thresh` من `loudnorm` ويمرّره لـ`silencedetect`.

## التقنيات والبنية
- الحزم/المكتبات: React, TypeScript, Chromium headless, FFmpeg (مدمج عبر `npx remotion ffmpeg`), Mediabunny, `@remotion/three`, `@remotion/motion-blur`, `@remotion/google-fonts`.
- المعمارية: التكوين `Composition` (fps, width, height, durationInFrames) ← `Sequence`/`Track`/`TransitionSeries` للتايم لاين ← مكوّنات React. التحرير التفاعلي عبر `Interactive.create()` و schema لكل مكوّن. الرندر محلي أو سحابي. التصدير MP4/WebM/ProRes/صور/شفاف.
- أمثلة ملموسة:
  - **أنواع حقول schema في الـStudio** (`remotion-interactivity/SKILL.md`): `string`, `number`(min/max/step/integer, keyframable), `boolean`(hold), `color`(keyframable), `enum`(variants بـschema متداخل), `array`, `asset`, `font-family`, `font-weight`, `translate`/`scale`/`rotation-*`/`transform-origin`, `uv-coordinate`, `svg-path`, `remotion-captions`, `hidden`. كل حقل له `default` و`description`، و`keyframable:false` للتحكم الثابت. قطع جاهزة: `Interactive.textSchema`, `backgroundSchema`, `borderRadiusSchema`.
  - **قاعدة بنية التايم لاين** (`timeline-structure.md`): عناصر مستقلة لا تتداخل ← `Track` مسمّى؛ مقاطع متتالية يجب أن تبقى ملتصقة ← `TransitionSeries`؛ طبقات تتحرك/تُقصّ معاً ← `Sequence` واحد يحويها. الحلقات (loops) فقط لما يُتحكم فيه كقالب واحد (جزيئات، أعمدة مخطط).
  - **مقطع فيديو قابل للتحرير** (`video-editing.md`): `from`, `trimBefore`, `durationInFrames`, `playbackRate` على كل مقطع؛ الفيديو والترجمة والطبقات المتزامنة تحت حدّ زمني واحد.

## أشياء نأخذها لمشروعنا (قائمة، كل بند: ماذا + لماذا + أين يخدم الرؤية)
- **قائمة أنواع حقول schema مع عمود keyframable** ← قالب جاهز لتعريف "الخصائص القابلة للضبط" في عناصر النمط (نص، لون، خط، تحويلات، أصول، ترجمة). يخدم: نظام الأنماط + لوحة الخصائص في المحرر.
- **قاعدة Track / TransitionSeries / Sequence** ← تحدد سلوك التايم لاين عند تغيير مدة مقطع (ripple أم لا). يخدم: المحرر (Project Document).
- **مبدأ "احترم تعديلات المستخدم اليدوية"** كقاعدة صريحة للوكيل. يخدم: الوكيل + التعلم من التصحيحات.
- **`arabic-text.md` بالكامل** ← أفضل مرجع وجدناه لتحريك العربي بلا تفكك الحروف، وفيه تحذير Safari/ZWJ والخطوط التي لا تحوي U+200D. يخدم: الترجمة والنصوص العربية (جمهورنا الأول).
- **كشف الصمت التكيّفي** (loudnorm ← silencedetect) ← بديل أدق من عتبة ثابتة لقاعدة "حذف الصمت" في النمط. يخدم: قواعد القص.
- **Remotion كخيار لطبقة الموشن جرافيك فقط** (عناوين، كروت، انتقالات) لا كمحرك المحرر كله ← يعطينا حتمية وكود يقدر الوكيل يكتبه. يخدم: التوليد/الموشن. (القرار مرتبط بالترخيص، انظر التحذيرات.)

## استلهامات (تجربة المستخدم، التسويق، التسعير، الطريقة التي شرحوا بها المنتج، ما يعجب الجمهور في الردود)
- الرسالة التسويقية الثلاثية: agentically / interactively / programmatically، "بدّل طريقة العمل متى شئت" ← نفس ما نعد به (شات + تايم لاين يدوي على مشروع واحد).
- تويت @xingbugengming: مستخدم أعاد إنتاج أمثلة Remotion عبر Codex ثم بنى **مكتبة مكوّنات حركة شخصية وسمّاها "XiaoQi-Motion-Style"** ← هذا بالضبط فرضيتنا: الناس تريد "ستايل" له اسم وتراكم وإعادة استخدام. ويشتكي من استهلاك حصة Codex الأسبوعية (تكلفة التوليد بالكود حقيقية).
- تويت @kseniam0s يضع Remotion ضمن "أدوات مجانية للمؤسسين" (58K نجمة وقتها) ← الانطباع العام أنه مجاني، بينما الترخيص فيه شرط للشركات.
- التسعير: مجاني للأفراد والشركات ≤3 موظفين، ترخيص شركات مدفوع، ومتجر (remotion.pro) يبيع Editor Starter.

## تحذيرات ومخاطر (ترخيص، نضج، اعتماد على API مدفوع، ادعاءات غير مثبتة)
- **الترخيص ليس مفتوح المصدر**: إلزامي ترخيص شركة لأي جهة ربحية فوق 3 موظفين، و**ممنوع** "نسخ أو تعديل كود Remotion بغرض بيع أو ترخيص مشتق خاص بك من Remotion". منتج تجاري يدمج Remotion كمحرك رندر يحتاج مراجعة قانونية وغالباً ترخيص شركة. (مشاريع مثل claude-motion-design تسوّق نفسها صراحة بـ"no Remotion license".) ويوجد تنبيه أن الترخيص "سيتغير قليلاً" في 5.0.
- الرندر يعتمد Chromium ← ثقيل على الجوال وبطيء نسبياً لفيديو طويل بمادة خام حقيقية؛ Remotion مصمم للموشن والقوالب أكثر من مونتاج ساعات من الفوتيج.
- مستودع المهارات بلا ترخيص معلن على GitHub.
- تويت kseniam0s فيه رابط Supabase خاطئ (يشير لـshadcn) ← دقة قوائم "Top N" ضعيفة.

## أسئلة مفتوحة
- هل نحتاج Remotion أصلاً لو محركنا الأساسي (تايم لاين + ffmpeg/WebCodecs) يعالج الفوتيج، والموشن يُكتب بـHTML + seek(t) كما في claude-motion-design؟
- كم تكلفة ترخيص الشركات فعلياً وهل يغطي "تطبيق سطح مكتب يرندر محلياً لدى المستخدم"؟
- هل يمكن تمثيل schema الـStudio كـJSON مستقل ونقله لمحررنا بلا الاعتماد على Remotion؟

## الحكم: ⭐⭐⭐⭐ (4/5) — أنضج أساس للموشن بالكود ومهاراته الرسمية (schema، بنية التايم لاين، العربي) مرجع ممتاز، لكن ترخيصه عائق لمنتج تجاري.
