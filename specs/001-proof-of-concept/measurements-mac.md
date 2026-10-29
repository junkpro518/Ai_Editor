# قياسات الماك — مهمة القياس R10 (جلسة الاختبار على الماك)

**التاريخ:** 2026-10-28 · **الفرع:** `001-proof-of-concept` على `bf2f4e2` · **الحالة:** قياس أوّلي؛ لم يُعدَّل أي كود ولا `measurements.md`.
الخام في `out/spike/` (خارج git). كل الأرقام من تشغيل واحد (`pnpm spike`)، بلا تكرار، فهي أرقام أولية.

## الجهاز

| البند | القيمة |
|---|---|
| الجهاز | Apple M2 · 8 أنوية · 16 GB RAM |
| macOS | 27.0.1 (build 26A434) |
| Electron / Chromium | 45.1.0 / 156.0.8078.49 (Node المضمَّن 24.22.1؛ المضيف Node 22.23.4، pnpm 10.34.9) |
| GPU (`getGPUFeatureStatus`) | `video_decode`, `video_encode`, `gpu_compositing`, `2d_canvas`, `webgl`: كلها `enabled` |
| FFmpeg المبني محلياً | `n8.1.3` LGPL، `--enable-version3 --disable-gpl --disable-nonfree --enable-videotoolbox --enable-audiotoolbox --enable-libopus --enable-libzimg` |

## مدة الخطوات

| الخطوة | النتيجة | الزمن |
|---|---|---|
| `pnpm install` | نجح | 12 ث |
| `pnpm ffmpeg:build-mac` (T006) | نجح، exit 0، buildconf بلا `--enable-gpl` | **2:32.66** |
| `pnpm fixtures:generate` | نجح | 56 ث |
| `pnpm typecheck` / `pnpm lint` / `pnpm build` | نجحت | 3 ث / 2 ث / ~1 ث |
| `pnpm exec vitest run` | **335 نجح، 2 فشل** (انظر الأسفل) | 7 ث |
| `pnpm test:e2e` | **38 نجح، 2 فشل، 7 لم تعمل** (انظر الأسفل) | 223 ث |
| `pnpm spike` | exit 0 | 134 ث |
| `pnpm dist` (arm64 + x64، بلا توقيع) | نجح | 46 ث |

## الجدول S1–S12

| # | القياس | العتبة R10 | النتيجة على الماك | القرار المقترح |
|---|---|---|---|---|
| S1 | حجم المثبّت | >400 MB = مراجعة | `AiEditor-0.1.0-arm64.dmg` = **125,965,458 B (≈120 MiB / 126 MB)**؛ `.app` = 277 MB. **تنبيه: هذا الحجم بلا ffmpeg** — انظر «مشكلة 1». تقدير مع الثنائيين (ffmpeg 22.2 MB + ffprobe 22.0 MB غير مضغوطين) ≈ 150–170 MB | **استمرار** (بفارق كبير تحت 400 MB حتى بعد إضافة ffmpeg) |
| S2 | إقلاع بارد + خمول | تسجيل فقط | إقلاع `launch→domcontentloaded`: **363 ms** (غير مغلّف، `out/`). مجموع الذاكرة وقت الخمول **430 MB** (Renderer 131 MB) | مسجَّل |
| S3 | أقصى ذاكرة معاينة وتقليب 15 د 1080p | >2.5 GB أو انهيار = فيتو | تقليب 60 قفزة موزّعة على 27000 إطار: **0 أخطاء، 0 انهيار**. أقصى Renderer **830 MB**، أقصى GPU 159 MB، **أقصى مجموع كل العمليات 1,325 MB (1.29 GB)**. وسيط القفزة **74 ms**. استيراد الملف 288 ms، أول إطار 259 ms. **تحفظ:** الاختبار تقليب قصير (60 قفزة)، لا جلسة معاينة 15 دقيقة متواصلة؛ ونمو Renderer مع القفزات يحتاج مراقبة (المذكور في `measurements.md` عن `decoder.ts`) | **استمرار** (1.29 GB < 2.5 GB)؛ يبقى فحص التسرب بجلسة أطول |
| S4 | `VideoDecoder.isConfigSupported` | فشل H.264 أو HEVC الآيفون = فيتو | H.264 `42c00d` ✓ `64001f` ✓ `640028` ✓ · **HEVC `hvc1.1.6.L93.B0` ✓ · 10-bit `hvc1.2.4.L120.B0` ✓ · `hev1.2.4.L120.B0` ✓** · VP9 ✓ · AV1 ✓. **لم يُقَس:** ملف HEVC حقيقي من آيفون/HDR/VFR غير متوفر؛ `hdrDrawImage` في الخرج نصه «لا فك HEVC 10-bit على هذا الجهاز (بلا GPU)» وهو نص ثابت قديم لا يصح هنا (الفك مدعوم) فلا يُعتمد | **استمرار مشروط**: دعم الإعدادات ✓، والفك الفعلي لملف آيفون وHDR→SDR **بانتظار عيّنة المالك** |
| S5 | `VideoEncoder.isConfigSupported('avc1.640028')` | يحدد المسار R2 | **`prefer-hardware` ✓** · `prefer-software` ✓ · `no-preference` ✓ · Annex-B ✓ · `avc1.42001f` (3.1 عند 1080p) ✗ (كما على Linux؛ المستوى لا الـprofile) · VP9 ✓ · AV1 ✓ | **المسار الأساسي R2 (WebCodecs عتادي)**؛ سؤال OpenH264 لا يطال الماك |
| S6 | بناء FFmpeg LGPL لماك، buildconf بلا gpl | فشل = مراجعة | **نجح**: `--disable-gpl --enable-version3`، 2:32.66 | **استمرار** |
| S7 | مشفّر عتادي H.264 | لا H.264 عتادي = فيتو | `detectEncoders` → **`h264_videotoolbox`: hardware=true, works=true**؛ `aac` ✓ | **استمرار** (لا فيتو) |
| S8 | زمن عدّ إطارات 15 د | >30 ث = بديل | `-count_frames`: **43.7 ث** (27000 إطار) — فوق العتبة حتى على M2؛ **`probe()` الكامل (بعد T096، `-count_packets`): 272 ms** | **استمرار** (البديل T096 مفعَّل وتحت العتبة بفارق كبير) |
| S9 | تصدير 10 د + تشغيل Safari/Chrome/iOS/Android | فشل ±1 = حاجب | **لم يُقَس**: يحتاج T050 وعيّنة `talk-ar-10min` وأجهزة. مؤشر جزئي من S10 (دقيقتان): العدّ 3600/3600 ✓، 20/20 متطابقة الموضع | **مفتوح** |
| S10 | سرعة decode→compose→encode لـ2 د 1080p30 | <1.0× = احتياطي | **فك+تركيب فقط: 86.6 fps = 2.89×** · **خط الترميز (VideoEncoder `prefer-hardware` Annex-B): 150.1 fps = 5.00×** · الدمج 24.5 ث بالمجمل لمقطع 120 ث (**≈4.9×**) · الناتج 119.0 MB، 3600/3600 إطار، 120.000 ث | **استمرار** (≥1.0× بفارق كبير؛ مقارنةً بـ0.66× على Linux) |
| S11 | رسم عربي مختلط، مقارنة الأنظمة | اختلاف = تحقيق (FR-021) | الرسم **صحيح بصرياً** (ترتيب bidi سليم، أرقام هندية ولاتينية في موضعها) `out/spike/s11-arabic.png`. `measureText.width = 1225.38` (**مطابق لـLinux**). **بصمة البكسلات `6c957a42` ≠ Linux `719065ed`** (فرق في تنعيم الحواف غالباً: Skia/Graphite على GPU مقابل برمجي). `getSelectionRects/getTextClusters/getActualBoundingBox/getIndexFromOffset` ✗ و`Range.getClientRects` ✓ كما على Linux | **تحقيق** حسب FR-021: العرض متطابق والبصمة تختلف؛ مقارنة بكسلية مع ويندوز مفتوحة. لا يؤثر على الاستمرار |
| S12 | توقيع + notarization | رفض Apple = إصلاح | **تجربة جافة ad-hoc فقط** على نسخة من `.app` في `/tmp` (لا Apple ID ولا شهادات ولا notarization): `codesign --force --deep --options runtime --entitlements build/entitlements.mac.plist -s -` نجح في ثانية، `codesign --verify --deep --strict` ✓ (flags `adhoc,runtime`). `spctl --assess` = **rejected** (متوقع لـad-hoc). **لم يُختبر الدمج مع ffmpeg داخل الحزمة** لأنه غير موجود فيها (مشكلة 1) | **مفتوح**: notarization الحقيقية تحتاج هوية المالك وإذنه؛ أعد التجربة بعد إصلاح مشكلة 1 |

### عتبة PSNR/SSIM على الماك (VideoToolbox)

| المقياس | الماك (مشفّر عتادي 8 Mb/s) | Linux (برمجي) |
|---|---|---|
| PSNR وسيط للإطار نفسه | **35.21 dB** | 38.22 dB |
| SSIM وسيط | **0.9245** | 0.885 |
| التطابق الموضعي | **20/20** (أفضل تطابق هو الإطار نفسه) | 20/20 |
| عتبة الوسيط − 3 dB (ما حسبه السكربت) | **32.21 dB** | 35.2 dB |

القراءة: المشفّر العتادي أقل PSNR بنحو 3 dB وأعلى SSIM. عتبة Linux (35.2 / 0.85) **تفشل على الماك** (من 20 إطاراً: **8 إطارات تحت 35.2**؛ المدى 34.86–36.21 dB). الاقتراح: اعتماد عتبة **PSNR ≥ 32.2 / SSIM ≥ 0.85** على الماك، أو قياس بعد إصلاح المرجع 4:2:0 المذكور في `measurements.md` (القياس هنا بالسكربت `export-spike.ts` كما هو). القرار للرئيس/المالك.

## الفشل حرفياً (لم يُصلَح شيء)

### مشكلة 1 — ثنائيات ffmpeg لا تدخل الحزمة المبنية (حاجبة للتوزيع)
`pnpm dist` يطبع:
```
file source doesn't exist  from=.../resources/ffmpeg/mac-arm64
file source doesn't exist  from=.../resources/ffmpeg/mac-x64
```
`electron-builder.yml` يستعمل `from: resources/ffmpeg/${os}-${arch}` فيصير `${os}` = `mac` بينما مجلد البناء `darwin-arm64` (من `build-mac.sh`). النتيجة: `AiEditor.app/Contents/Resources/` بلا مجلد `ffmpeg`، والتطبيق المغلَّف لن يجد ffmpeg (`ffmpeg_missing`). كذلك الإعداد يبني x64 ولا توجد ثنائيات `darwin-x64`. (تلميح للرئيس: إمّا تسمية المجلد `mac-arm64` أو `from: resources/ffmpeg/darwin-${arch}`.)

### مشكلة 2 — vitest: فشل اختبارين (مكتوبَين على linux-x64 حرفياً)
```
FAIL tests/integration/ffmpeg.test.ts > resolveFfmpeg > يجد ثنائيات linux-x64 في التطوير
Expected: ".../resources/ffmpeg/linux-x64/ffmpeg"
Received: ".../resources/ffmpeg/darwin-arm64/ffmpeg"
FAIL tests/integration/ffmpeg.test.ts > resolveFfmpeg > FFMPEG_DIR يتقدّم على كل شيء، وغيابه يعطي ffmpeg_missing
Error: لم نجد ffmpeg/ffprobe. بحثنا في: .../resources/ffmpeg/linux-x64
```
أي عيب اختبار يفترض Linux، لا عيب في الماك. (قبل بناء FFmpeg كان الفشل 5 ملفات؛ زالت بعد T006.)

### مشكلة 3 — e2e: `captions.spec.ts:244` يفشل بثبات (أعدته منفرداً: نفس النتيجة)
```
frame 59: preview 85893686 vs export reference 1c862c47
> 294 | expect(previewHash).toBe(refHash);
```
بصمة المعاينة ≠ بصمة المرجع للكابشن المحروق على الماك. (لم يُحلَّل السبب؛ الاشتباه فرق رسم الخط/GPU كما في S11.) الاختبارات الأربعة الأخرى في الملف نجحت.

### مشكلة 4 — e2e: `arabic.spec.ts` فشل مرة ثم نجح (عابر)
في التشغيل الكامل: `"beforeAll" hook timeout of 120000ms exceeded` و`electron.launch: Timeout 180000ms exceeded` (أول إطلاق Electron)، فذهبت الاختبارات 2–8 كـ«لم تعمل» (7). أعدته منفرداً: **8/8 نجحت في 1.2 ث**. العدّ النهائي المعاد: كل الاختبارات نجحت عدا اختبار captions أعلاه.

## ملاحظات

- `electron-winstaller@5.4.0` بنص بناء تجاهله pnpm (تحذير فقط).
- `S4` HDR/آيفون/VFR و`S9` و`notarization` الحقيقية تحتاج مدخلات المالك (ملف آيفون، T050، هويته).
- لم أستعمل أي شهادة أو Apple ID. الـdmg في `release/` (خارج git) غير موقَّع.

## جدول القرارات المقترحة

| العتبة | القرار |
|---|---|
| S1 حجم المثبّت | استمرار |
| S3 ذاكرة المعاينة | استمرار (يبقى فحص جلسة أطول) |
| S4 فك H.264/HEVC | استمرار مشروط بعيّنة آيفون حقيقية |
| S5 مشفّر عتادي | مسار أساسي عتادي |
| S6 بناء LGPL | استمرار |
| S7 H.264 عتادي | استمرار (لا فيتو) |
| S8 عدّ الإطارات | استمرار (بديل T096) |
| S9 تصدير 10 د | مفتوح |
| S10 السرعة | استمرار (≈5×) |
| S11 العربية | تحقيق بصمة؛ لا فيتو |
| S12 التوقيع | مفتوح؛ يعتمد على إصلاح مشكلة 1 وإذن المالك |

---

## ملحق (أضافه الرئيس من رسالة جلسة الاختبار، 2026-10-29)

### PSNR/SSIM للإطارات العشرين على الماك (`s10.json`؛ same = الإطار نفسه، prev/next = الجار؛ الكل aligned=true)

| الإطار | PSNR same | prev | next | SSIM same |
|---|---|---|---|---|
| 173 | 35.14 | 18.56 | 18.56 | 0.91869 |
| 469 | 35.20 | 17.71 | 17.78 | 0.917369 |
| 763 | 35.86 | 20.47 | 20.53 | 0.926553 |
| 1105 | 36.12 | 21.05 | 20.95 | 0.928159 |
| 1153 | 35.21 | 19.16 | 19.17 | 0.924792 |
| 1187 | 35.19 | 17.69 | 17.63 | 0.92201 |
| 1253 | 35.17 | 18.56 | 18.58 | 0.925819 |
| 1586 | 35.25 | 18.48 | 18.46 | 0.924095 |
| 1636 | 34.86 | 18.12 | 18.18 | 0.923236 |
| 1718 | 35.77 | 20.36 | 20.38 | 0.925639 |
| 2094 | 35.76 | 21.11 | 21.19 | 0.926281 |
| 2220 | 36.21 | 19.79 | 19.69 | 0.930071 |
| 2321 | 34.97 | 18.20 | 18.20 | 0.923242 |
| 2355 | 34.88 | 18.11 | 18.12 | 0.92413 |
| 2630 | 35.21 | 17.79 | 17.87 | 0.918871 |
| 3014 | 35.18 | 18.36 | 18.35 | 0.927767 |
| 3204 | 35.78 | 20.88 | 20.94 | 0.921127 |
| 3304 | 35.40 | 19.50 | 19.46 | 0.927001 |
| 3372 | 35.02 | 18.23 | 18.28 | 0.925677 |
| 3583 | 35.82 | 19.58 | 19.68 | 0.917205 |

الملخص: psnrMedian 35.21، ssimMedian 0.924461، proposedPsnrGateDb 32.21، allAligned true. أدنى 34.86 (1636) وأعلى 36.21 (2220)؛ 8 إطارات تحت 35.2. **ملاحظة الرئيس:** هذه القيم من `export-spike.ts` (المرجع بلا تحويل 4:2:0)؛ فحص التطابق الفعلي في التطبيق (`src/main/parity.ts`) صار يمرّر المرجع عبر yuv420p (US2)، فيُعاد القياس به قبل تغيير العتبة.

### نص فشل captions.spec.ts:244 (تشغيل منفرد)
```
frame 59: preview 85893686 vs export reference 1c862c47
Expected (refHash): "1c862c47"
Received (previewHash): "85893686"
  292 |   const previewHash = await frameHash(target);
  293 |   console.log(`frame ${target}: preview ${previewHash} vs export reference ${refHash}`);
> 294 |   expect(previewHash).toBe(refHash);
at tests/e2e/captions.spec.ts:294:23
1 failed، 4 passed (3.7s)
```

### نص فشل ffmpeg.test.ts
```
FAIL  tests/integration/ffmpeg.test.ts > resolveFfmpeg > يجد ثنائيات linux-x64 في التطوير
Expected: ".../repo/resources/ffmpeg/linux-x64/ffmpeg"
Received: ".../repo/resources/ffmpeg/darwin-arm64/ffmpeg"
 ❯ tests/integration/ffmpeg.test.ts:38:25
FAIL  tests/integration/ffmpeg.test.ts > resolveFfmpeg > FFMPEG_DIR يتقدّم على كل شيء، وغيابه يعطي ffmpeg_missing
Error: لم نجد ffmpeg/ffprobe. بحثنا في: .../repo/resources/ffmpeg/linux-x64
 ❯ missing src/main/ffmpeg/paths.ts:18:24
 ❯ resolveFfmpeg src/main/ffmpeg/paths.ts:29:22
 ❯ tests/integration/ffmpeg.test.ts:48:14
Test Files 1 failed | 40 passed (41) · Tests 2 failed | 335 passed (337)
```
