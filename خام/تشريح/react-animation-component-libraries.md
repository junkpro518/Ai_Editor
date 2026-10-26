# مكتبات مكوّنات React المتحركة وقوائمها (React Bits، Motion Primitives، Kitchen UI، Mono Charts، قوائم Kinetics/Aceternity/MicroKit)

**المصادر في خام:** `روابط/https:::x.com:adhamdannaway:status:2089000477841334741.md`, `روابط/https:::x.com:davidhaz:status:2100868487631475113.md`, `روابط/https:::x.com:noahelhadedy:status:2085821925775843431.md`, `روابط/https:::x.com:rammcodes:status:2086003629417435416.md`, `روابط/https:::x.com:subhanhq:status:2088599468698751328.md`, `مستندات-Raw/abdallahkhraisatt — اكتب "UI” في الكومنتس ورح ابعتلك اياها_النص_الكامل.md`, `مستندات/Himanshu Hingorani (@himanshubuildss) on X.txt`, `مستندات/أحمد مصمم جرافيك (@crvdesign0) on X.txt`  
**الرابط الأصلي:** https://github.com/DavidHDev/react-bits · https://reactbits.dev/c/micro · https://github.com/ibelick/motion-primitives · https://motion.dev · https://amicro.vercel.app (Mono Charts، محمي بـ Vercel Checkpoint ولم يُقرأ)  
**النوع:** مكتبة / قائمة  
**الترخيص:** React Bits = MIT + Commons Clause (ليس MIT صرفاً) · Motion Primitives = MIT · motion.dev = MIT · **النجوم:** React Bits 50.3k، Motion Primitives 6.8k · **آخر تحديث:** React Bits 2026-10-19، Motion Primitives 2026-09-28 · **اللغة/الحزمة:** JS/TS، React، Tailwind أو CSS  
**تحقق من المصدر الأصلي:** جزئي — README + package.json + قائمة الملفات لـ React Bits وMotion Primitives؛ Mono Charts وKitchen UI لم أصل لمستودعاتهما (الأول خلف حماية Vercel، والثاني بلا رابط في التفريغ ولم أجده في بحث GitHub)

## ما هو
مجموعة مكتبات "انسخ والصق" لمكوّنات واجهات متحركة. React Bits هي الأكبر: 215+ مكوّن في خمس فئات (Text Animations 33، Animations 38، Components 48، Micro 34، Backgrounds 63). تغريدة David Haz تعلن فئة "Micro" الجديدة (30 مكوّن وقت الإعلان). الباقي قوائم يحفظها المطوّرون: Motion Primitives (مبنية على `motion`)، Kitchen UI (مكتبة بتفاصيل دقيقة)، Mono Charts (رسوم بيانية متحركة بأمر CLI واحد، ضمن Amicro).

## الأفكار
- التوزيع كـ "مصدر تملكه" وليس حزمة: تنسخ الكود (shadcn-style registry عبر jsrepo/CLI) وتعدّله.
- كل مكوّن له صفحة تجريب بأدوات تحكم حيّة (controls) ثم الكود — نفس فكرة "لوحة معاملات" لأي preset حركة.
- أربع نكهات لكل مكوّن: JS/TS × CSS/Tailwind.
- React Bits تقدّم MCP وAgent Kit وskills (في نسخة Pro) — "مصمَّمة للبشر والوكلاء".
- Kitchen UI: التفاصيل الصغيرة تبيع المكتبة (مشغل كاسيت ببكرات تدور، زر حذف بالضغط المطوّل للتأكيد، واجهة دفع تطبع إيصالاً فعلياً).

## المميزات
- React Bits: خلفيات shader (Liquid Chrome، Light Tunnel، Topography…)، نصوص (Split Text، Typewriter، Rotating words، scroll reveal)، مؤشر/hover، معارض.
- Motion Primitives (ملفات المكوّنات الفعلية): `text-effect`, `text-scramble`, `text-shimmer`, `text-shimmer-wave`, `text-morph`, `text-roll`, `text-loop`, `spinning-text`, `animated-number`, `sliding-number`, `animated-group`, `in-view`, `infinite-slider`, `magnetic`, `tilt`, `spotlight`, `glow-effect`, `border-trail`, `progressive-blur`, `morphing-dialog`, `morphing-popover`, `dock`, `cursor`, `scroll-progress`.
- motion.dev: springs (stiffness/damping/mass)، scroll مربوط بـ ScrollTimeline، layout animations، `AnimatePresence`، حركة مواد three.js بنفس الـ API.
- قائمة Himanshu (28 مصدراً) وقائمة crvdesign0 (10 مواقع، بلا أسماء في النص — الروابط مقصّرة t.co) تذكر Kinetics (150+ تأثير حركة)، Aceternity (200+)، Magic UI، MicroKit، Uiverse، 21st.dev (سجل مكوّنات عبر MCP)، Anime.js — لم أتحقق من أي منها فرادى.

## التقنيات والبنية
- الحزم/المكتبات: React Bits تعتمد `gsap` 3.13، `motion` 12، `three` 0.180، `@react-three/fiber`، `ogl`، `postprocessing`، `matter-js`. Motion Primitives تعتمد `motion ^11` + Next 15.
- المعمارية: مكوّنات React مستقلة؛ لا تمثيل زمني (timeline) مشترك بينها. معظم الحركة مدفوعة بـ `requestAnimationFrame`/ساعة حقيقية أو بأحداث (hover/scroll/in-view).
- قابلية الـ seek للتصدير: **غالباً لا**. مكوّنات motion/CSS مرتبطة بساعة المتصفح؛ مكوّنات shader (OGL/three) تأخذ `uTime` من ساعة حقيقية في الغالب (لم أفتح كل ملف — افتراض). يمكن جعلها حتمية بتمرير الزمن يدوياً أو بعرضها داخل Remotion/headless وتجميد الساعة، لكن هذا عمل إضافي لكل مكوّن.
- أمثلة ملموسة: `text-scramble.tsx`، `border-trail.tsx`، `animated-number.tsx` في Motion Primitives.

## أشياء نأخذها لمشروعنا
- **قاموس الحركة وليس الكود:** أسماء المؤثرات (stagger، scramble، shimmer، roll، morph، spotlight، magnetic، tilt) كمفردات في نظام الأنماط — نمط المستخدم يقول "عناوين scramble ثم roll" والوكيل يترجمها. يخدم: نظام الأنماط + الوكيل.
- **أنماط النص المتحرك** (text-effect، split text، typewriter، rotating words) كأول مجموعة presets للعناوين/الترجمة داخل المحرر — أكثرها بسيط ويمكن إعادة كتابته كدالة نقية `f(t)`. يخدم: المحرر + التصدير.
- **لوحة controls لكل preset:** كل preset = مخطط JSON بمعاملات (مدة، easing، stagger، شدة) تُعرض كمنزلقات؛ مستوحى من صفحات React Bits. يخدم: المحرر + الأنماط.
- **الخلفيات (Backgrounds) كطبقات مولَّدة:** shader backgrounds كطبقة B-roll إجرائية بلا ملفات، بشرط تمرير الزمن صراحة. يخدم: التوليد + التصدير.
- **Mono Charts:** رسوم بيانية متحركة لمقاطع الشرح/الإحصاءات (ظهور الأعمدة، عدّاد رقمي `animated-number`). يخدم: التوليد.
- **لا نعتمد عليها كاعتماد تشغيلي** — نقتبس المفردات والمعاملات ونعيد الكتابة (انظر الترخيص).

## استلهامات
- "انسخ الكود وألصقه" + صفحة حيّة بأدوات تحكم = أسرع طريق للإقناع (ريل Kitchen UI يبيع المكتبة بثلاث تفاصيل فقط).
- React Bits: مجانية للأبد + Pro يدفع مرة واحدة ويأخذ كل التحديثات؛ ونص تسويقي "للمواقع التي يتذكرها الناس".
- ردود الجمهور على هذه القوائم: "احفظ التغريدة" — الطلب الحقيقي هو الاستكشاف السريع، ما يدعم فكرة معرض presets داخل المنتج.
- طريقة "اكتب UI في الكومنتس" لتوزيع الرابط — نمو بالتفاعل.

## تحذيرات ومخاطر
- **Commons Clause في React Bits:** تسمح بالاستخدام "ضمن تطبيق/موقع/منتج" لكنها تمنع بيع البرنامج نفسه كما هو. إن شحنّا مكوّناتها كمكتبة presets قابلة للتنزيل فقد نقع في المحظور. الأسلم: الاستلهام وإعادة الكتابة، أو مراجعة قانونية قبل التضمين.
- معظمها مبني للـ DOM/WebGL في المتصفح بساعة حقيقية — لا يضمن إخراجاً حتمياً لكل إطار.
- Mono Charts وKitchen UI لم أتحقق من ترخيصهما ولا من مستودعاتهما؛ ادعاء "مفتوح المصدر" في التغريدة فقط.
- القوائم (Kinetics، Aceternity، MicroKit، 21st.dev…) روابط بلا تحقق؛ كل منها بترخيص مختلف (Aceternity مثلاً فيها مكوّنات Pro).

## أسئلة مفتوحة
- هل محرّك العرض عندنا (متصفح/Electron + headless) سيتيح تمرير `t` لكل مكوّن؟ إن نعم فمكوّنات shader تدخل بسرعة.
- أي المفردات الأكثر طلباً في فيديوهات القصيرة العربية فعلاً (scramble؟ typewriter؟ highlight؟)؟

## الحكم: ⭐⭐⭐ — مصدر مفردات ومعاملات ممتاز للنصوص والخلفيات، لكن الكود غير مصمَّم للتصدير الحتمي وترخيص React Bits فيه قيد.
