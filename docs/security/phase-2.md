# المراجعة الأمنية — المرحلتان 1 و2 (T035)

- **المهارة:** `security-audit` (وضع التوجيه، قراءة فقط، بلا تنفيذ خارج مجموعات الاختبار).
- **النطاق:** `4a65135..57cb0c8` — `src/main/**`، `src/preload/**`، `src/renderer/{index.html,commands,player}`، `src/core/{contracts,commands,history}`، `scripts/ffmpeg-build/**`، `scripts/fixtures/**`، `electron.vite.config.ts`، `electron-builder.yml`، `.github/workflows/ci.yml`.
- **التاريخ:** 2026-10-28. **النموذج:** Claude Fable 5.1 (لم يرفض الطلب).
- **نموذج التهديد:** ملف وسائط/مشروع/نمط خبيث على القرص؛ renderer مُخترَق يحاول الوصول للملفات أو الأسرار أو العمليات عبر IPC؛ `media://` خارج المصادر المسجّلة؛ حقن وسائط/أوامر في FFmpeg؛ تسرّب الأسرار؛ سكربتات الجلب؛ CI.

## ما وُجد سليماً

`sandbox: true` + `contextIsolation: true` + `nodeIntegration: false`؛ `webSecurity` مفعّل؛ CSP بلا `unsafe-eval` (المدقّقات مُترجمة مسبقاً)؛ لا قناة لقراءة الأسرار إطلاقاً (القرار 18)؛ `spawn` بلا shell مع `file:` و`-protocol_whitelist file,pipe`؛ `media://` يخدم فقط مسارات سجّلها main بعد probe/load، مع Range صحيح و`OPTIONS` 204 و405 لغير GET/HEAD؛ سكربتات الجلب تتحقق من SHA-256 قبل فك الأرشيف؛ CI بـ`permissions: contents: read` وبلا أسرار.

## النتائج المؤكدة والإصلاح (كلها أُصلحت في commit هذا الملف)

| # | الخطورة | النتيجة | الدليل | الإصلاح | اختبار الانحدار |
|---|---|---|---|---|---|
| 1 | متوسطة | `project:save` يكتب خارج `userData/projects/` عبر `doc.id` غير المقيَّد (renderer مخترَق + `project.json` ثابت الاسم) | `src/main/ipc.ts` (`project:save` بلا `id()`)، `project.schema.json` (`id` بلا نمط)، `storage/projects.ts` (`path.join` + `mkdir recursive`) | `id(doc.id)` في المعالج + `pattern ^[A-Za-z0-9_-]{1,64}$` على `project.id` و`styleRef.styleId` | `tests/contract/schemas.test.ts`: `id: '../../x'` يُرفض |
| 2 | متوسطة | لا تصلّب للتنقل: إسقاط ملف HTML خارج منطقة الإسقاط يحمّله Chromium كصفحة تملك `window.api` و`media://` (تسريب فيديوهات المصدر) | `src/main/index.ts` بلا `will-navigate`/`setWindowOpenHandler`؛ `Import.tsx` يمنع الإسقاط داخل المنطقة فقط | ثلاث طبقات: `setWindowOpenHandler → deny` + `will-navigate` يمنع كل ما ليس صفحة الواجهة + `did-navigate` احتياطي؛ `main.tsx` يمنع `dragover/drop` العامين؛ `ipc.ts` يرفض أي طلب من إطار عنوانه ليس صفحة الواجهة (`isTrustedSender`) | `tests/e2e/smoke.spec.ts`: التنقل إلى `file://evil.html` لا يغيّر العنوان ولا العنوان الفرعي، `window.open` يرجع null، نافذة واحدة |
| 3 | منخفضة | `style:saveVersion` بـ`styleId` غير مقيَّد ينشئ `v<n>.json` في أي مجلد (إنشاء فقط) | `ipc.ts` (`style:saveVersion` بلا `id()`)، `style.schema.json` | `id(style.styleId)` + نمط في `style.schema.json` | يغطيه اختبار المخطط |
| 4 | معلوماتية | لقطات السجل لا تُدقَّق قبل الاستعادة (`history.undo/redo` بلا `validateProject`) فيتباين ما على الشاشة عمّا يُحفظ | `src/core/commands/registry.ts`، `ipc.ts` (`project:writeSnapshot`) | `validateProject` في فرعي undo/redo وعلى `entry.snapshot` قبل الكتابة | `tests/unit/core/commands/registry.test.ts`: لقطة `{}` → `ContractError` |

## تحسينات صغيرة طُبّقت من الملاحظات غير الأمنية

- `runFfprobe` بمهلة افتراضية 120 ثانية (ملف مُعدّ قد يعلّق `-count_frames`).
- أسرار: `entries` كائن بلا prototype (`Object.create(null)`) فلا يختفي اسم مثل `__proto__` بصمت.
- CSP: `base-uri 'none'; object-src 'none'`.
- `electron-builder.yml`: `files` محصورة في `out/{main,preload,renderer}` (كانت تُدخل أرشيفات `out/ffmpeg-fetch` وتقارير Playwright).
- `build-mac.sh`: تثبيت commit الوسم `n8.1.3` (`FFMPEG_MAC_COMMIT` في `ffmpeg.lock`) والتحقق بعد الاستنساخ.

## تحتاج تحققاً (للمالك عند T033 على ماك)

1. `build/entitlements.mac.plist`: `com.apple.security.cs.disable-library-validation` يُضعف hardened runtime وليس لازماً لعملية FFmpeg المستقلة على الأرجح — احذفه ووقّع وجرّب الاستيراد والمعاينة؛ أبقِ `allow-jit` و`allow-unsigned-executable-memory` فقط إن لزم.
2. `brew install opus zimg` في `build-mac.sh` بلا تثبيت إصدار — يُسجَّل الإصدار المستخدم في `BUILD-INFO.txt` عند أول بناء.

## مسجَّل للمستقبل (ليس عيباً في 001)

- `project:load` يثق بـ`source.path` من `project.json` داخل `userData`؛ حين تصبح ملفات المشروع قابلة للتبادل يلزم التحقق (وجود + `hash` + `fileSize`) قبل `registerMediaSource`.
- `project:probeDropped` يعتمد على preload (`webUtils.getPathForFile` على `File` حقيقي) لا على main؛ مقبول مع `isTrustedSender`.
- لا اختبارات لطبقة IPC بحقن `ipcMain` — يُضاف `tests/integration/ipc.test.ts` في مرحلة لاحقة.
- أكشنات CI بوسم `@v4` لا بـSHA (بلا أسرار؛ تحسين اختياري).
