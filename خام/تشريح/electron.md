# Electron

**المصادر في خام:** `خام/مستودعات-الوثيقة/Electron.md`  
**الرابط الأصلي:** https://github.com/electron/electron · https://electronjs.org  
**النوع:** مستودع / إطار تغليف سطح مكتب  
**الترخيص:** MIT · **النجوم:** 123560 · **آخر تحديث:** 2026-10-26 · **اللغة/الحزمة:** C++ / `electron`  
**تحقق من المصدر الأصلي:** جزئي — README وبيانات المستودع من الوثيقة؛ المقارنة مع Tauri من معرفتي

## ما هو
إطار يجمع Chromium وNode.js لبناء تطبيقات سطح مكتب بـHTML/JS (يستعمله VS Code). لمحرر الفيديو هو الحاضنة التي تعطي WebCodecs وWebGPU بإصدار Chromium معروف مع وصول للملفات والعمليات.

## الأفكار
- نفس كود المحرر الويب يعمل على Windows/macOS/Linux.
- main process (Node) يشغّل FFmpeg وWhisper المحلي ويدير الملفات، وrenderer يعرض الواجهة.
- خادم MCP محلي داخل main process.

## المميزات
- Chromium موحّد: WebCodecs/WebGPU تتصرف بنفس الطريقة لدى كل المستخدمين.
- وصول كامل لنظام الملفات والعمليات الفرعية، وتحديث تلقائي (`electron-updater`)، وتوقيع/تثبيت (`electron-builder`, Forge).
- نظام بيئي ضخم ومجتمع كبير.

## التقنيات والبنية
- الحزم/المكتبات: `electron-builder` أو `@electron-forge`، `electron-store`، `child_process`، `better-sqlite3`.
- المعمارية: main + preload (contextBridge) + renderer. المنطق الثقيل في worker أو عملية مرافقة.
- أمثلة ملموسة: `contextBridge.exposeInMainWorld('api', {...})`، `protocol.handle` لخدمة ملفات الوسائط المحلية بدون رفع.

### البدائل
| الخيار | الحجم | WebCodecs/WebGPU | ملاحظة |
|---|---|---|---|
| Electron | ~100-200MB | ثابت (Chromium مرفق) | الأكثر أماناً للمحرر الوسائطي |
| Tauri | ~5-15MB | يعتمد على WebView النظام (WebView2/WebKit) | دعم WebCodecs/WebGPU متباين، خاصة WebKitGTK على Linux |
| Wails / Neutralino | صغير | WebView النظام | نفس مشكلة التباين |
| تطبيق أصلي (Qt/Rust) | متفاوت | لا يوجد | تكلفة تطوير عالية |
| ويب فقط (PWA) | — | حسب المتصفح | بلا تحكم بالملفات، وFile System Access محدود |

## أشياء نأخذها لمشروعنا
- ابدأ بـElectron لأن الاعتماد على WebCodecs/WebGPU يتطلب محركاً ثابتاً — يخدم التشغيل.
- أبقِ كود الواجهة محايداً (لا تتغلغل Node APIs) ليمكن نقله إلى Tauri لاحقاً — يخدم المرونة.
- شغّل FFmpeg وأدوات التفريغ كعمليات مرافقة معزولة — يخدم التصدير والأمان.

## استلهامات
CapCut Desktop وDiscord وNotion وVS Code أمثلة على قبول المستخدمين لحجم Electron.

## تحذيرات ومخاطر
- الحجم واستهلاك الذاكرة، وضرورة تحديث Chromium أمنياً (وتيرة إصدار سريعة).
- أمان: فعّل `contextIsolation` وعطّل `nodeIntegration` في renderer، وتحقق من أي محتوى بعيد.
- التوقيع على macOS (notarization) وWindows (EV cert) له تكلفة.
- كل تطبيق يحمل Chromium خاص به: تحديثات كبيرة.

## أسئلة مفتوحة
- هل نقبل ~150MB تنزيل؟ وهل تدعم أجهزة المستخدمين المستهدفة تسريع Chromium؟
- هل تستحق Tauri الجهد إذا أمكن تحميل FFmpeg كعملية مرافقة وإبقاء المعاينة خفيفة؟

## الحكم: ⭐⭐⭐⭐ — الخيار الأقل مخاطرة لمحرر وسائط مبني على تقنيات الويب.
