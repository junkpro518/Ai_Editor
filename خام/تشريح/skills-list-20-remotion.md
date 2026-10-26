# قائمة 20 مهارة وكلاء (بما فيها remotion-best-practices)

**المصادر في خام:** `مستندات/0xMarioNawfal (@RoundtableSpace) on X.txt`  
**الرابط الأصلي:** https://x.com/roundtablespace/status/2103828182541734166 · الأهم لنا: https://github.com/remotion-dev/skills  
**النوع:** قائمة (+ مهارة Claude Code رسمية من Remotion)  
**الترخيص:** remotion-dev/skills بلا ترخيص معلن على GitHub (Remotion نفسه برخصة شركة خاصة) · **النجوم:** remotion-dev/skills 5739 · **آخر تحديث:** 2026-10-26 · **اللغة/الحزمة:** Markdown/TypeScript  
**تحقق من المصدر الأصلي:** جزئي — فحصت remotion-dev/skills فقط (12 مهارة: `remotion-best-practices` و `remotion-captions` و `remotion-interactivity` وغيرها)؛ بقية الـ 19 مهارة عامة (BMAD، mattpocock، Prisma، Clerk، Sentry، PostHog...) لا تمس الفيديو ولم أفتحها.

## ما هو (3–6 أسطر)
تويت قائمة "20 مهارة تغطي دورة البناء للإطلاق": مواصفات (bmad-spec)، نمذجة المجال، تصميم الكود، وكلاء (Google agents-cli، Mastra)، باك إند، قواعد بيانات، تصميم وحركات (emil-design-eng، review-animations)، **remotion-best-practices** للفيديو البرمجي، اختبار متصفح (playwright-cli)، أمن (semgrep)، أخطاء (Sentry)، تحليلات (PostHog)، بريد (Resend). الصلة الوحيدة المباشرة بنا هي مهارات Remotion الرسمية.

## الأفكار
- مهارة "موجّه" (router): `remotion-best-practices` لا تحتوي المعرفة بل توجه الوكيل لمرجع فرعي حسب المهمة (إنشاء، ترجمات، خرائط، وسائط، رندر، Studio).
- **"احفظ تعديلات المستخدم"**: لو لاحظ الوكيل تغييراً مفاجئاً في الكود فهو مقصود — لا يكتب فوقه.
- **لا رندر إلا بطلب صريح**؛ الافتراضي فتح Studio للمعاينة الحية أثناء العمل.
- **Remotion Studio يحرر JSX الذي يولّد عناصر التايم لاين** ويكتب التعديلات للكود؛ و Studio يدعم WebMCP.
- مخطط خصائص قابلة للتحرير (string/number/boolean/color/enum/array/asset/font) مع إمكانية keyframe لبعضها.

## المميزات
- 12 مهارة: `remotion-best-practices, -create, -captions, -interactivity, -markup, -maps, -multimedia, -render, -saas, -studio, -docs, -upgrade`.
- الترجمات بنوع موحد `Caption {text, startMs, endMs, timestampMs, confidence, pageBreakAfter?}` من `@remotion/captions`، مع تفريغ واستيراد SRT.
- `remotion-interactivity`: هيكلة الكود حول "وحدات تحرير" ومسارات ليقدر المستخدم يحدد/يحرك/يقص/ينسق كل عنصر في Studio.

## التقنيات والبنية
- الحزم/المكتبات: Remotion 4.0.5xx، React، `npx remotion studio`، `npx remotion render`.
- المعمارية: التايم لاين = شجرة مكونات React (`<Sequence>`، compositions متصلة)، والخصائص القابلة للتحرير = schema على مستوى الاستدعاء. المعاينة في المتصفح، الرندر محلي أو Lambda.

## أشياء نأخذها لمشروعنا
- **قاعدة "احترم تعديلات المستخدم اليدوية"** صراحةً في تعليمات الوكيل — جوهر "المستخدم يعدّل يدوياً أو بالمحادثة" — الوكيل.
- **المعاينة الحية افتراضياً والتصدير بطلب صريح** — المحرر/التكلفة.
- **نوع Caption الموحد بالميلي ثانية مع confidence** كصيغة داخلية للترجمات — المحرر.
- **schema للخصائص القابلة للتحرير وأيها قابل للـ keyframe** — مرجع لتصميم Project Document — المحرر.
- **مهارة موجّهة تحمّل المراجع عند الحاجة** — نمط لتنظيم معرفة الوكيل عن أنماطنا — الوكيل.

## استلهامات
- صيغة "القائمة المرقمة بأقسام (DEFINE/BUILD/MAKE IT USABLE/VERIFY)" تحصد مشاهدات (60.9K).
- Remotion نشر مهاراته الرسمية مبكراً — الأدوات تتنافس على أن تكون "سهلة للوكلاء".

## تحذيرات ومخاطر
- رخصة Remotion: مجانية للأفراد والشركات حتى 3 موظفين، ورخصة شركة مدفوعة بعدها — مهم لو بنينا على Remotion.
- القائمة عامة، أغلبها غير مرتبط بالفيديو.

## أسئلة مفتوحة
- هل نستخدم Remotion للرسوم/الترجمات المتحركة فوق محرك FFmpeg (كما يفعل `remotion-ffmpeg-skill` لدى kajisho5)؟
- هل تكفي "Studio يكتب للكود" كنموذج تحرير يدوي، أم نحتاج Project Document مستقل عن الكود؟

## الحكم: ⭐⭐⭐ — القائمة نفسها عامة، لكن مهارات Remotion الرسمية تعطي قواعد وكيل ومخطط تحرير مفيدين.
