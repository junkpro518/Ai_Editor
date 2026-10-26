# تقرير الدفعة 11

| الموضوع | الملف | الحكم | لماذا |
|---|---|---|---|
| yoinks + Cobalt (تنزيل فيديو من رابط) | `yoinks-cobalt.md` | ⭐⭐⭐⭐ | yt-dlp محلي حل عملي لاستيراد المرجع، مع تحذير ToS وترخيص AGPL/NC لـ Cobalt |
| Cap (تسجيل شاشة) | `cap.md` | ⭐⭐⭐ | مرجع معماري Rust/Tauri ممتاز لكن خارج النطاق وAGPL |
| Upscayl (تكبير صور محلي) | `upscayl.md` | ⭐⭐⭐ | مكوّن جانبي مفيد (Real-ESRGAN/Vulkan)، AGPL |
| awesome-opus5-5-videos | `awesome-opus5-5-videos.md` | ⭐⭐⭐⭐ | 703 برومبت مصنّفة (motion/3d/explainer/interactive) لتغذية القوالب والأنماط |
| كابشنات Instagram (link 2/4/6/7) | `instagram-captions-misc.md` | — | مجرد إحالات لملفات موجودة (opus، capcut، hyperframes) |

## أهم ما خرج من هذه الدفعة
- لاستيراد مرجع من رابط (vision §3): الأنسب تشغيل `yt-dlp` محلياً داخل التطبيق (نمط yoinks) لا الاعتماد على خدمة سحابية؛ yoinks نفسه MIT لكنه غلاف TUI بلا وضع سكربت بعد.
- Cobalt قوي كـAPI (tunnel / local-processing / picker) لكن API العامة محمية ولا تُستعمل في مشاريع أخرى، وكوده AGPL والواجهة غير تجارية؛ الخيار الوحيد استضافة ذاتية أو الاستلهام.
- قانونياً: كلاهما يتبرأ من المسؤولية ويقرّ أن التنزيل قد يخالف شروط المنصات؛ نحتاج رسالة إخلاء وتحميل المسؤولية على المستخدم، ويفضَّل التنفيذ على جهاز المستخدم.
- مستودع awesome-opus5-5-videos أرقامه الفعلية 703 برومبت (418 لها ريميك، ~207 جزئية)، لا 475 كما في المنشور؛ ومخططه (`category`, `tech_tags`, `prompt`, `prompt_partial`) جاهز كقالب لمعرض قوالبنا.
- هيكل برومبت `<inputs>` + `<direction>` طريقة جيدة لتعريف نمط يسأل الوكيل المستخدم قبل التنفيذ.
- Cap مرجع لتقسيم محرك فيديو Rust (project/editor/rendering/export) وفكرة الزوم التلقائي من بيانات المؤشر؛ Upscayl نموذج لعملية فرعية GPU محلية مع نماذج حسب المحتوى.
- ثلاثة من أربعة كابشنات Instagram مغطاة أصلاً (hyperframes، capcut-premiere-timeline-export، opus)؛ «Kitchen UI» بلا رابط مستودع فيبقى سؤالاً مفتوحاً.
