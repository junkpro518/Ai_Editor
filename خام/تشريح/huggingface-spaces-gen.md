# Hugging Face Spaces (تطبيقات توليد الفيديو والصور)

**المصادر في خام:** `مستندات-Raw/Spaces - Hugging Face_النص_الكامل.md`  
**الرابط الأصلي:** https://huggingface.co/spaces  
**النوع:** قائمة (دليل تطبيقات AI) — لقطة من صفحة الدليل بتاريخ 2026-10-10  
**الترخيص:** — (لكل Space ولكل نموذج ترخيصه) · **النجوم:** — (إعجابات: Wan2.2 14B Fast 3.72k) · **آخر تحديث:** لقطة 2026-10-10 · **اللغة/الحزمة:** Gradio / ZeroGPU  
**تحقق من المصدر الأصلي:** جزئي — الملف هو الصفحة نفسها (1.49 مليون Space)؛ لم أفتح Spaces فردية، وقرأت الأسماء والأوصاف الظاهرة فقط.

## ما هو
صفحة فهرس عامة، ليست أداة. قيمتها أنها تكشف **ما يتوفر الآن من نماذج مفتوحة قابلة للتجربة بلا تثبيت**، وتُظهر وسوم مثل «Running on Zero» (ZeroGPU، حصة GPU مجانية/Pro) و«MCP» (Space يعرض أدواته عبر MCP) و«Agents».

## الأفكار
- فئات فلترة تهمنا: Video Generation، Image Generation، Image Editing، **Background Removal**، Image Upscaling، 3D Modeling، Speech Synthesis، Voice Cloning، Style Transfer.
- Spaces بوسم **MCP**: يعني ممكن استدعاؤها كأداة من وكيل — نفس اتجاه واجهتنا.

## المميزات (ما ظهر فعلاً في اللقطة)
- فيديو: **Wan2.2 14B Fast** (3.72k، صورة+نص إلى فيديو)، Wan2.2 14B Preview، KV Image to Clip (Wan 2.2)، **MiniMax H3 Turbo LoRA** (فيديو مع صوت متزامن، 1.36k)، **MiniMax-H3 Character Swap LoRA** (تبديل شخصية في مقطع)، LTX 2.3 Image-to-Video بصوت أصلي، Omni Video Factory (نص/صورة/تمديد فيديو).
- **LTX-2.5 22B Alpha Gen — Video to Alpha Matte**: يحوّل فيديو RGB إلى ماتّ ألفا متزامن الإطارات (مناسب جداً لإزالة خلفية الفيديو).
- صور: **Qwen-Image-2.1** (توليد وتحرير)، FLUX.2 Klein Multi LoRA، Krea 2 Turbo، Viggle Turbo for Qwen-Image-2.1 (6 خطوات)، Omni Image Editor (يشمل upscale وإزالة علامة مائية)، Agate WebGPU (نص إلى صورة داخل المتصفح 100%).
- تحذير: عدّة Spaces بوسم «Uncensored» في اسمها.

## التقنيات والبنية
- الحزم/المكتبات: Gradio، ZeroGPU، وسوم MCP.
- المعمارية: تعمل سحابياً على بنية HF؛ نفس النماذج غالباً قابلة للتشغيل محلياً أو عبر Inference Providers. الصفحة تعرض أيضاً «Inference Providers / Inference Endpoints / Storage Buckets».
- أمثلة: `hugging-apps/ltx-2-5-alpha-matte`, `zerogpu-aoti/wan2-2-fp8da-aoti-faster`, `Qwen/Qwen-Image-2.1`.

## أشياء نأخذها لمشروعنا
- **اختيار نماذج لأدوات التوليد (ب/أ):** قائمة مرشحة: Wan2.2 (فيديو من صورة = مناسب لتحريك لقطة ثابتة)، Qwen-Image-2.1/FLUX.2 Klein (أغلفة)، LTX للفيديو مع صوت. أين: التوليد.
- **Video-to-alpha-matte (ج):** أهم اكتشاف للدفعة: إزالة خلفية الفيديو بشكل متسق زمنياً، وهو ما لا يقدّمه rembg إطاراً بإطار. أين: المحرر. (يحتاج فحص الحجم: 22B كبير جداً للجهاز المحلي.)
- **استدعاء Space كأداة MCP للتجارب السريعة** قبل أن نقرر ما نحزّمه محلياً. أين: التشغيل/الوكيل.
- **نموذج «Preview ثم finish»** مثل Viggle Turbo (6 خطوات) كمثال على مسارين: سريع للمعاينة وكامل للتصدير. أين: التوليد.

## استلهامات
- تصنيف الأدوات بالمهمة (Video Generation، Background Removal…) واجهة سهلة نقلدها في قائمة «أدوات الوكيل».
- العدّاد الاجتماعي (likes) يخلق دليل جودة.

## تحذيرات ومخاطر
- الصفحة لقطة متغيرة؛ الأسماء قد تتغير أو تُحذف.
- ZeroGPU محدودة بالحصة؛ لا تصلح كاعتماد إنتاجي.
- الأوصاف تسويقية؛ نماذج مثل MiniMax H3 لها ترخيص مقيّد (انظر freevideo.md). Spaces «uncensored» لا نتبناها.
- لم أتحقق من أن النماذج المذكورة تعمل بجودة لأي Space.

## أسئلة مفتوحة
- أي هذه النماذج يعمل على 8–12GB VRAM محلياً؟ (FreeVideo يجيب جزئياً عن H3).
- هل نستعمل Inference Providers لدفع أقل أم نشغّل محلياً؟

## الحكم: ⭐⭐⭐ — خريطة مفيدة لنماذج الفيديو والصور المتاحة (خاصة Alpha Matte)، لكنها دليل لا أداة، وتحتاج فحصاً لكل نموذج.
