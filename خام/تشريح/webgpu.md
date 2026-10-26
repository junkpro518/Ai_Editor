# WebGPU

**المصادر في خام:** `خام/مستودعات-الوثيقة/WebGPU.md`  
**الرابط الأصلي:** https://github.com/gpuweb/gpuweb · https://webgpu.org  
**النوع:** مواصفة W3C / واجهة متصفح  
**الترخيص:** W3C (NOASSERTION في GitHub) · **النجوم:** 5519 · **آخر تحديث:** 2026-10-21 · **اللغة/الحزمة:** مواصفة + WGSL  
**تحقق من المصدر الأصلي:** جزئي — README فقط؛ الدعم من معرفتي

## ما هو
واجهة GPU حديثة للويب (خلف Vulkan/Metal/D3D12) تدعم الرسم وحسابات compute، بلغة shaders اسمها WGSL. خلف WebGL.

## الأفكار
- تأثيرات الفيديو (ألوان، LUT، blur، انتقالات) كـshaders تعمل على إطارات `VideoFrame` مباشرة.
- compute shaders لتحليل الإطارات (مشاهد، حركة).
- تشغيل نماذج ML صغيرة في المتصفح (Transformers.js, ONNX Runtime Web) بتسريع GPU.

## المميزات
- أداء أعلى من WebGL في العمل المتوازي.
- `importExternalTexture` لاستخدام إطار فيديو كنسيج بدون نسخ.
- WGSL مواصفة قياسية.

## التقنيات والبنية
- الحزم/المكتبات: PixiJS 8 يدعم WebGPU كـrenderer، وThree.js وBabylon، وTransformers.js لـWhisper في المتصفح.
- المعمارية: WebCodecs يُنتج VideoFrame ثم WebGPU texture ثم pipeline التأثيرات ثم إعادة VideoFrame للترميز.
- أمثلة ملموسة: `navigator.gpu.requestAdapter()`، `device.importExternalTexture({source: videoFrame})`.

### حالة الدعم
- Chrome/Edge: مفعّل افتراضياً منذ 113 (Windows/macOS/ChromeOS ثم Android وLinux تدريجياً).
- Safari: مفعّل افتراضياً في macOS/iOS 26.
- Firefox: متوفر على Windows ثم منصات أخرى تدريجياً، لكن تحقق من الحالة الحالية.
- في Electron: يتبع Chromium المرفق، لكن Linux وبعض مشغلات GPU قد تحتاج flags.

## أشياء نأخذها لمشروعنا
- WebGL كمسار افتراضي وWebGPU كتسريع اختياري عند توفره (fallback) — يخدم المحرر.
- تأثيرات النمط (لون، grain، انتقالات) كـshaders قابلة للتخصيص — يخدم نظام الأنماط والتوليد.
- تشغيل Whisper/تحليل محلياً بـGPU عند توفره — يخدم الخصوصية والتشغيل.

## استلهامات
"بدون رفع، وكله على جهازك" رسالة قوية.

## تحذيرات ومخاطر
- تباين الدعم على Linux والأجهزة القديمة والـdrivers؛ قد تظهر أخطاء device lost.
- لا نبنيها كاعتماد وحيد.
- الذاكرة المشتركة للـGPU محدودة على الأجهزة الضعيفة.

## أسئلة مفتوحة
- هل يكفي WebGL2 للـMVP؟ (غالباً نعم.)
- هل يستحق WebGPU تعقيد مسارين للـshaders (GLSL وWGSL)؟

## الحكم: ⭐⭐⭐ — مفيد كتسريع لاحق، لا يجب أن يكون شرطاً للـMVP.
