# PixiJS

**المصادر في خام:** `خام/مستودعات-الوثيقة/PixiJS.md`  
**الرابط الأصلي:** https://github.com/pixijs/pixijs · https://pixijs.com  
**النوع:** مكتبة  
**الترخيص:** MIT · **النجوم:** 48507 · **آخر تحديث:** 2026-10-26 · **اللغة/الحزمة:** TypeScript / `pixi.js` (v8)  
**تحقق من المصدر الأصلي:** جزئي — README وبيانات المستودع من الوثيقة؛ تفاصيل v8 من معرفتي

## ما هو
محرك رسم 2D سريع فوق WebGL وWebGPU (وCanvas احتياطياً). يعطي scene graph (Container, Sprite, Graphics, Text, filters). في سياقنا: مركّب (compositor) لطبقات التايم لاين في المعاينة.

## الأفكار
- كل clip = Sprite بنسيج من `VideoFrame` أو `<video>`، وكل مسار = Container.
- فلاتر جاهزة (blur, color matrix) وقابلة للكتابة (GLSL/WGSL).
- نفس scene graph يُستعمل للمعاينة وللتصدير (render لإطار ثم ترميزه).

## المميزات
- أداء عالٍ لعدد كبير من العناصر، وإدارة batching تلقائية.
- دعم نص (BitmapText, SplitText في v8) وتحريك.
- renderer قابل للتبديل: WebGL أو WebGPU.
- حجم معقول ونظام امتدادات.

## التقنيات والبنية
- الحزم/المكتبات: `pixi.js` ومعه `@pixi/filters` للفلاتر الإضافية؛ مجتمع GSAP للتحريك.
- المعمارية: Application → stage (Container) → عناصر. التايم لاين عندنا يمثّل الحالة، وPixi يعرض الحالة عند زمن t (pure render function).
- أمثلة ملموسة: `new Application(); await app.init({preference:'webgpu'})`, `Texture.from(videoFrame)`.

## أشياء نأخذها لمشروعنا
- Pixi كطبقة عرض للتأثيرات والنصوص المتحركة (كابشن الأنماط) — يخدم المحرر والأنماط.
- مبدأ "render(state, t)" نقي، بحيث تُعاد نفس النتيجة في المعاينة والتصدير — يخدم التصدير.
- بدائل للمقارنة: Three.js (3D أثقل)، regl/raw WebGL (تحكم أكبر)، Canvas2D (بسيط وأبطأ)، Remotion/HTML (قوالب React للتصدير).

## استلهامات
المحررات الويب التي ذكرتها الوثيقة (OpenVideo/OpenCut) تستعمله، فهو مسار مجرَّب.

## تحذيرات ومخاطر
- مصمم للألعاب/2D، فلا يعطي تلوين فيديو احترافياً (LUT 3D، color management) بدون عمل مخصص.
- تحويل نسيج من VideoFrame يتطلب حذراً مع الذاكرة والـcolor space.
- كتابة النص العربي: الـshaping والاتجاه RTL في Canvas/Pixi يحتاج اختباراً (HarfBuzz، الخطوط، الربط) — نقطة خطر لمنتج عربي.
- تغيّر API بين v7 وv8.

## أسئلة مفتوحة
- هل Pixi كافٍ لـcolor grading أم نحتاج مسار shaders خاص؟
- كيف نعرض الترجمة العربية بدقة (HTML overlay أم Pixi Text)؟

## الحكم: ⭐⭐⭐⭐ — خيار عملي ومجرَّب للمعاينة والتركيب، مع حذر في النص العربي.
