# جرد التراخيص — الميزة 001 (الدستور VI)

آخر تحديث: 2026-10-28. المصدر: `pnpm licenses list --json` + ملفات الترخيص داخل `resources/`. القاعدة: ما يُشحن في المنتج متساهل فقط (MIT/Apache-2.0/BSD/ISC/OFL)؛ GPL/AGPL/MPL لا تُضمَّن؛ FFmpeg LGPLv3 عملية منفصلة.

## 1. اعتماديات التشغيل (تُشحن داخل التطبيق)

| الحزمة | الإصدار | الترخيص | الدور |
|---|---|---|---|
| electron | 45.1.0 | MIT | الغلاف (Chromium + Node) |
| react / react-dom | 19.3.1 | MIT | الواجهة |
| mp4box | 2.5.0 | BSD-3-Clause | demux لـWebCodecs |
| ajv | 8.20.0 | MIT | تحقق المخططات |
| ajv-formats | 3.0.1 | MIT | صيغ date-time |
| write-file-atomic | 8.0.0 | ISC | حفظ ذري |
| ulid | 3.0.2 | MIT | معرّفات |
| (متعدية) fast-deep-equal، json-schema-traverse، require-from-string، scheduler | — | MIT | — |
| (متعدية) fast-uri | — | BSD-3-Clause | — |
| (متعدية) signal-exit | — | ISC | — |

**نتيجة الفحص (`pnpm licenses list --prod`):** MIT، BSD-3-Clause، ISC فقط. لا GPL/LGPL/MPL في ما يُشحن من npm.

## 2. أدوات التطوير (لا تُشحن)

| الحزمة | الإصدار | الترخيص |
|---|---|---|
| typescript | 5.9.3 | Apache-2.0 |
| electron-vite / vite / @vitejs/plugin-react | 6.0.0 / 8.3.5 / 6.1.2 | MIT |
| electron-builder | 26.18.1 | MIT |
| vitest | 5.0.5 | MIT |
| @playwright/test | 1.64.1 | Apache-2.0 |
| json-schema-to-typescript | 16.0.0 | MIT |
| eslint / typescript-eslint / prettier | 10.13.0 / 8.72.1 / 3.9.10 | MIT |
| tsx | 4.21.0 | MIT |
| @types/* | — | MIT |
| (متعدية، تطوير فقط) lightningcss | — | MPL-2.0 — داخل vite؛ لا تدخل حزمة التطبيق |
| (متعدية، تطوير فقط) caniuse-lite | — | CC-BY-4.0 — بيانات للبناء فقط |
| jiwer (Python، scripts/wer) | — | Apache-2.0 — قياس WER، تطوير فقط |

## 3. ثنائيات منفصلة (عملية خارجية)

| الثنائي | المصدر | الترخيص | ملاحظات |
|---|---|---|---|
| FFmpeg/ffprobe win64 | BtbN/FFmpeg-Builds `autobuild-2026-10-27-18-38` (`n8.1.3-24-g92611900bb`، `win64-lgpl`) | LGPLv3 (`--enable-version3`، بلا `--enable-gpl`) | البصمة في `scripts/ffmpeg-build/ffmpeg.lock`؛ `LICENSES/` و`SHA256SUMS` في المجلد |
| FFmpeg/ffprobe linux64 | نفس الوسم (`linux64-lgpl`) | LGPLv3 | **تطوير وCI فقط، لا يُشحن** (مستثنى في electron-builder.yml) |
| FFmpeg/ffprobe darwin | بناء ذاتي `scripts/ffmpeg-build/build-mac.sh` (ffmpeg n8.1.3 + libopus + zimg + VideoToolbox) | LGPLv3 | المصدر والسكربت يُنشران مع التطبيق (التزام LGPL §4) |
| libopus (داخل FFmpeg) | Xiph | BSD-3-Clause | استخراج صوت الرفع |
| zimg (داخل FFmpeg) | sekrit-twc | WTFPL | HDR→SDR في المسار الاحتياطي |
| مشفّرات H.264 العتادية (VideoToolbox/NVENC/AMF/QSV) | داخل FFmpeg LGPL | متساهل | لا x264/x265/libfdk_aac/openh264 (القرار 14) |

## 4. الخطوط (`resources/fonts/`)

| الخط | الملفات | الترخيص | المصدر |
|---|---|---|---|
| IBM Plex Sans Arabic (افتراضي) | Regular, Medium, SemiBold, Bold | OFL-1.1 (`OFL.txt`) | google/fonts `ofl/ibmplexsansarabic` |
| Cairo | `Cairo[slnt,wght].ttf` | OFL-1.1 | google/fonts `ofl/cairo` |
| Tajawal | Regular, Bold | OFL-1.1 | google/fonts `ofl/tajawal` |
| Noto Sans Arabic | `NotoSansArabic[wdth,wght].ttf` | OFL-1.1 | google/fonts `ofl/notosansarabic` |
| Noto Naskh Arabic | `NotoNaskhArabic[wght].ttf` | OFL-1.1 | google/fonts `ofl/notonaskharabic` |

## 5. خدمات خارجية (BYOK، لا كود مضمَّن)

| الخدمة | الاستخدام | الشروط |
|---|---|---|
| Deepgram API (`nova-3`) | تفريغ افتراضي مؤقت حتى قياس WER | شروط Deepgram؛ `mip_opt_out=true` دائماً (research.md R5) |
| ElevenLabs Scribe (`scribe_v2`) | بديل | شروط ElevenLabs |

## 6. مرفوض/غير مستخدم (للسجل)

mediabunny (MPL-2.0)، jassub/libass (يضمّن FriBidi LGPL)، HyperFrames كمحرك (Apache-2.0 لكن x264 افتراضياً)، libopenh264 (براءة Cisco)، Tauri، PixiJS (مؤجل). التفاصيل في `specs/001-proof-of-concept/research.md` §R11.

`THIRD-PARTY.md` يُولَّد من هذا الجرد عند التغليف (T010/T091).
