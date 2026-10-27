# مهمة القياس R10 (Spike) — T031/T032/T034

سكربتات تقيس عتبات الفيتو في `specs/001-proof-of-concept/research.md` §R10 (القرار 15) على التطبيق **المبني** نفسه:
Playwright يشغّل Electron (`out/main/index.js`) ويستدعي مشغّل التطبيق الحقيقي (`src/renderer/player`) و`composeFrame` عبر الخطافات
`window.__test` / `window.__preview` — لا نسخة ثانية من الفك أو التركيب. النتائج تُكتب في `out/spike/` (خارج git) وتُنقل يدوياً إلى
`specs/001-proof-of-concept/measurements.md`.

## الملفات

| الملف | الدور |
|---|---|
| `measure.ts` | المنسّق: S2، S4، S5، S11، S7 (معلومة)، S8، S3 (جزئي)، ثم يستدعي `export-spike.ts` لـS10 وعتبة PSNR/SSIM. يكتب `out/spike/<id>.json` و`summary.json`. |
| `export-spike.ts` | T032: فك → تركيب → `VideoEncoder` (Annex-B) → stdin إلى FFmpeg `-f h264 -i pipe:0 -c:v copy -c:a aac`، ثم عدّ الإطارات وPSNR/SSIM مع فحص ±1 عند 20 فهرساً ببذرة ثابتة. يعمل مستقلاً أيضاً. |
| `probes.ts` | الدوال التي تُنفَّذ داخل صفحة التطبيق بـ`page.evaluate` (مكتفية بذاتها — لا استيراد داخلها). |

## المتطلبات

- `pnpm install` ثم **`pnpm build`** (السكربت يشغّل `out/`، لا `dev`).
- ثنائيات FFmpeg LGPL في `resources/ffmpeg/<platform>-<arch>/` (`pnpm ffmpeg:fetch` على ويندوز/لينكس، `pnpm ffmpeg:build-mac` على ماك)، أو `FFMPEG_DIR`.
- العيّنة `tests/fixtures/synthetic-15min-1080p.mp4` (`pnpm fixtures:generate`).
- ذاكرة فارغة ≥ 4 GB (S3 يفتح ملف 15 دقيقة 1080p داخل التطبيق).

## التشغيل

```bash
# ماك (المالك) — كل القياسات التي تعتمد على العتاد الهدف
pnpm build
pnpm spike                       # = tsx scripts/spike/measure.ts؛ 10–20 دقيقة
# أو رجل التصدير وحده:
pnpm exec tsx scripts/spike/export-spike.ts

# لينكس بلا شاشة (صندوق التطوير)
xvfb-run -a pnpm spike
```

الخرج: `out/spike/machine.json`، `s2.json`، `s3-partial.json`، `s4.json`، `s5.json`، `s7-linux.json` (على ماك يبقى الاسم؛ المحتوى هو تقرير `detectEncoders`)،
`s8.json`، `s10.json`، `s11.json` + `s11-arabic.png`، `s10-export.mp4`، `s10-ref-NNNNN.png` (20 مرجعاً)، `summary.json`، `run.log`.

## ما لا يقيسه السكربت (يدوي على ماك — T033)

| القياس | الأمر |
|---|---|
| S1 حجم المثبّت | `pnpm build && pnpm dist` ثم حجم `release/*.dmg` (و`*.exe` من CI ويندوز) |
| S6 بناء FFmpeg LGPL لماك | `pnpm ffmpeg:build-mac` ثم `resources/ffmpeg/darwin-arm64/ffmpeg -buildconf` (لا `--enable-gpl`) |
| S7 مشفّر عتادي | `pnpm spike` يكتب `s7-linux.json` بتقرير `detectEncoders` على ماك (يُتوقع `h264_videotoolbox: works`) |
| S9 تصدير 10 دقائق + تشغيل | بعد T050: تصدير `talk-ar-10min.mp4` وتشغيله في Safari/Chrome/iOS/Android |
| S12 التوقيع وnotarization | `pnpm dist` مع هوية التوقيع ثم `xcrun notarytool submit --wait` (تجربة جافة) |
| S11 المقارنة بين ماك وويندوز | تشغيل `pnpm spike` على الجهازَين ومقارنة `s11.json → pixelHash` و`s11-arabic.png` بصرياً |

## كيف تُقرأ النتائج

- السرعة: `xRealtime = مدة المقطع ÷ زمن المعالجة`؛ عتبة S10 هي ≥ 1.0× على ماك التطوير (R2).
- الذاكرة: `getAppMetrics()` → `workingSetSize` بالكيلوبايت لكل عملية؛ `maxTotalKb` هو مجموع كل العمليات (عتبة S3: 2.5 GB).
- PSNR/SSIM: المرجع هو الإطار المركّب (PNG من canvas الناتج) مقابل الإطار المفكوك من MP4 الناتج بعد تحويل الاثنين إلى `rgb24` في FFmpeg؛
  `aligned` = أفضل تطابق هو الإطار نفسه لا n−1 أو n+1. العتبة الأولية المقترحة: `الوسيط − 3 dB`.
- الفهارس العشرون ثابتة (LCG ببذرة 20261028) فتتطابق بين الأجهزة.
