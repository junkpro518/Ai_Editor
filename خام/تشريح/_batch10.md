# ملخص الدفعة 10 — مكتبات ومهارات حركة الواجهات

| الموضوع | الملف | التقييم | السبب |
|---|---|---|---|
| React Bits وMicro وMotion Primitives وmotion.dev وKitchen UI وMono Charts وقوائم Kinetics/Aceternity/MicroKit/crvdesign0 | `react-animation-component-libraries.md` | ⭐⭐⭐ | مفردات ومعاملات ممتازة للنص والخلفيات، لكن مرتبطة بساعة المتصفح وترخيص React Bits فيه Commons Clause |
| libraries.dev (Border beam/Orbs/Metal/Gooey/Thinking orbs) + Liquid Orb Editor + ThreeUI | `ui-effects-libraries.md` | ⭐⭐⭐⭐ | thinking-orbs يثبت نمط `f(t)` الحتمي بترخيص MIT، وThreeUI مصدر مشاهد 3D إجرائية |
| مهارات الحركة: LottieFiles/GSAP/Genjutsu/Three.js/Emil Kowalski/Design DNA | `motion-design-skills-gsap-lottie.md` | ⭐⭐⭐⭐ | جداول مدد ومنحنيات وstagger صريحة، وGSAP قابلة للـ seek، ومخطط Design DNA يوازي استنتاج النمط |
| عرض Rive لنوتش الماك | `rive.md` | ⭐⭐ | المصدر فيديو فقط، وRive لا يضيف كثيراً فوق Lottie/Canvas للمحرر |

## أهم ما خرج من هذه الدفعة
- **عقد الـ preset الحتمي:** الأفضل لمشروعنا أن يكون كل مؤثر `render(ctx, t, params)` دالة نقية في الزمن (مثل `frame(tSec)` في thinking-orbs) — معاينة وتصدير بنفس الشيفرة بلا اعتماد على `requestAnimationFrame`.
- معظم مكتبات React (React Bits، Motion Primitives) غير مصمَّمة للتصدير الحتمي؛ نأخذ المفردات والمعاملات ونعيد الكتابة، لا ننقل المكوّنات.
- **ترخيص React Bits = MIT + Commons Clause:** لا نضمّن كوده في مكتبة نوزعها قبل مراجعة قانونية؛ الاستلهام وإعادة الكتابة أسلم.
- **جداول LottieFiles وEmil** فيها قيم جاهزة (مدد لكل نوع عنصر، منحنيات cubic-bezier، stagger، overshoot، springs) تصلح أساساً لـ `motion-tokens.json` وشخصيات حركة (Playful/Premium/Corporate/Energetic) داخل style pack. تنبيه: قيم الواجهات (<300ms) أسرع من احتياج الفيديو.
- **GSAP** (timeline `paused` + `tl.time(t)`) أنسب محرك حركة نصية seekable في المتصفح، لكن لم أتحقق من ترخيصه التجاري الحالي لمنتج محرر — بند عاجل.
- **Design DNA** يملك مخطط JSON بثلاثة محاور (tokens/نوعي/تأثيرات) يوازي ما نريده لنمط المونتاج المستنتج؛ يستحق قراءة `references/schema.md` لاحقاً.
- **Genjutsu**: حلقة «أطروحة تفاعل توافق عليها ثم كود» وإيصالات الشفافية مصدر استلهام لوكيلنا.
- Mono Charts وKitchen UI وmotion.dev examples وتأثيرات libraries.dev الأخرى لم أصل لمستودعاتها؛ بلا تحقق من الترخيص.
