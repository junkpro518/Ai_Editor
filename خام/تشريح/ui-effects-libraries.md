# مكتبات المؤثرات البصرية: libraries.dev (Border beam، Orbs، Metal، Gooey، Thinking orbs) + محرر Liquid Orb + ThreeUI

**المصادر في خام:** `روابط/https:::x.com:jakubantalik:status:2095551141367173608.md`, `روابط/https:::x.com:jakubantalik:status:2098081565607673911.md`, `روابط/https:::x.com:motreskukosta:status:2095802560988786976.md`, `روابط/https:::x.com:mengto:status:2090817187900780961.md`  
**الرابط الأصلي:** https://libraries.dev · https://github.com/Jakubantalik/thinking-orbs · https://designminis.com/tools/liquid-orb-editor · https://github.com/MengTo/threeui  
**النوع:** مكتبة / أداة ويب  
**الترخيص:** thinking-orbs MIT · ThreeUI MIT (مع ملفات `ASSET-LICENSES.md` و`FONT-LICENSES.md` منفصلة) · محرر Liquid Orb: مجاني، الترخيص غير معروف · **النجوم:** thinking-orbs 3.9k، ThreeUI 6.9k · **آخر تحديث:** thinking-orbs 2026-08-16، ThreeUI 2026-09-03 · **اللغة/الحزمة:** TypeScript/React (+React Native وSwiftUI للـ orbs)، three.js  
**تحقق من المصدر الأصلي:** جزئي — README + الشيفرة المصدرية لـ thinking-orbs، README + LICENSE لـ ThreeUI، صفحة libraries.dev؛ مستودعات border-beam/metal/gooey لم أجدها في بحث GitHub، ومحرر الأورب صفحة دليل فقط بلا شيفرة

## ما هو
- **libraries.dev** (Jakub Antalik): سبع مكتبات تأثيرات React للواجهات الذكية: حدود متحركة (Border beam)، مؤشرات تفكير (Orbs)، مصوّر صوت، أفاتار بوت، معدن سائل (Metal)، Gooey، محمّل صور. تثبّت من npm.
- **Thinking Orbs:** مؤشرات تحميل نقطية بتسع حالات (working، searching، solving، listening، connecting، weaving، composing، breathing، shaping) على canvas 2D فقط.
- **Liquid Orb Editor** (Galleta، عبر designminis): يولّد أورب سائلاً متحركاً "في 30 ثانية".
- **ThreeUI** (Meng To): 160+ مكوّن three.js إجرائي مجاني (50 مكوّناً أب، 141 نسخة) بحجم 100–200KB للمكوّن؛ يُنسخ كبرومبت أو مصدر؛ نسخة Pro فيها MCP وskills.

## الأفكار
- **الحالة = فعل يقوم به الوكيل:** تسع حالات مسمّاة (searching، solving…) كواجهة لحالة الوكيل. تتطابق مع حالات وكيلنا في المحرر (يحلل، يقص، يرتب).
- **حجمان مصمَّمان منفصلين وليس scale:** كل حجم له عدد نقاط وسرعة خاصة — درس لـ presets: ضبط يدوي لكل مقاس.
- **المظهر من الثيم تلقائياً** (ancestor class → prefers-color-scheme).
- **تخفيض الحركة:** لقطة ثابتة "حتمية" عند `prefers-reduced-motion`.
- ThreeUI: كل مكوّن بثيمات (شروق/غروب) ومواقع مختلفة، ويُسلَّم للوكيل كبرومبت يعدّل الثيم والإضاءة والحركة.

## المميزات
- thinking-orbs: `<ThinkingOrb state="searching" size={64} speed={1.5} theme="auto" />`، canvas 2D بلا WebGL ولا filters ليتطابق المخرج على كل المتصفحات.
- ملفات المحرك: `src/engine/{braid,lattice,morph,orbits,ribbon,profiles,registry,core}.ts` — كل حالة مولّد هندسي مستقل.
- ThreeUI: حزمة npm `@designcodeio/threeui`، مصدر كامل بلا حساب أو دفع.

## التقنيات والبنية
- الحزم/المكتبات: React، canvas 2D، three.js (ThreeUI)، Vite.
- المعمارية: في `ThinkingOrb.tsx` دالة `frame(tSec)` تُرسم من زمن مطلق؛ الحلقة تستدعيها بـ `performance.now()/1000 * speed`، وللحركة المخفّضة تستدعي `frame(0.6)` — أي **الرسم دالة نقية في الزمن**. هذا يعني أنه قابل للـ seek وللتصدير الحتمي بإطار-إطار بتمرير `t` يدوياً (وهذا ما نحتاجه).
- ThreeUI: three.js إجرائي بلا أصول خارجية تقريباً؛ قابلية seek تعتمد على كل مكوّن (لم أفحصها).
- أمثلة ملموسة: `presets.ts` (معاملات الحجمين)، `registry.ts` (ربط الحالة بالمولّد).

## أشياء نأخذها لمشروعنا
- **نمط "مولّد = f(t, params)"** كعقد لأي preset حركة/overlay في المحرر: دالة نقية، بلا حالة خفية، تُعرض على canvas. ينتج معاينة حيّة وتصديراً حتمياً بنفس الشيفرة. يخدم: المحرر + التصدير.
- **حالات الوكيل المرئية** (orbs) كمؤشر "الوكيل يعمل الآن" في واجهة المحادثة، بتسع حالات تقابل مهام المحرر. يخدم: الوكيل/تجربة المستخدم.
- **Border beam / حدود متوهجة** كـ preset لإطار لقطة أو لوحة اقتباس؛ **Orbs/Liquid orb** كخلفية صوتية/مرئية لمقاطع البودكاست. يخدم: الأنماط + التوليد (بعد التأكد من الترخيص/إعادة الكتابة).
- **ThreeUI كمصدر مشاهد 3D إجرائية** لخلفيات وintro؛ ترخيص MIT يسمح، لكن تحقق من `ASSET-LICENSES.md`. يخدم: التوليد.
- **عقد "نسخة ثابتة حتمية"** عند reduced-motion → نفسه "إطار الغلاف/الصورة المصغرة" لأي preset.

## استلهامات
- بيع الجودة بفيديو 24 ثانية لكل مكتبة، وتجميعها تحت دومين واحد ("بيت لكل مكتباتي").
- النموذج التجاري: مجاني للمجتمع + Pro (MCP وskills) + رعاة README بـ 500/1500/3000$ شهرياً في ThreeUI — طريق ربح لمشاريع المصدر المفتوح.
- محرر الأورب: "ساعات إلى 30 ثانية" — صيغة تسويق مبنية على مقارنة الزمن.

## تحذيرات ومخاطر
- Border beam/Metal/Gooey: ادعاء "مجانية" من التغريدة فقط؛ لم أجد مستودعاتها (ربما في npm). التحقق مطلوب قبل أي استخدام.
- محرر الأورب خارجي بلا شيفرة مفتوحة ظاهرة؛ يصدّر فيديو/كود غير معروف.
- three.js في ThreeUI ثقيل (100–200KB للمكوّن) وغير مضمون الحتمية.
- طبيعة React-only: ننقل المفهوم لا المكوّن إلى محرك عرضنا.

## أسئلة مفتوحة
- هل نبني معياراً داخلياً `Preset { params, render(ctx, t) }` ونصدّر به كل المؤثرات؟
- هل تقبل thinking-orbs كمصدر للـ UI فقط (لا تصدير فيديو)؟

## الحكم: ⭐⭐⭐⭐ — thinking-orbs مثال نظيف على مولّد حتمي `f(t)` بترخيص MIT، وهو النمط الصحيح لـ presets قابلة للتصدير.
