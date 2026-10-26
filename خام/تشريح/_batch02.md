# الدفعة 02 — التقنيات الأساسية (وثيقة §11)

| الموضوع | الملف | الحكم | لماذا |
|---|---|---|---|
| FFmpeg | `ffmpeg.md` | ⭐⭐⭐⭐⭐ | أساس التصدير والتحليل؛ الترخيص GPL/LGPL هو الخطر |
| WebCodecs | `webcodecs.md` | ⭐⭐⭐⭐ | معاينة وتصدير سريعان في Chromium، مع احتياط |
| WebGPU | `webgpu.md` | ⭐⭐⭐ | تسريع لاحق، ليس شرطاً للـMVP |
| PixiJS | `pixijs.md` | ⭐⭐⭐⭐ | مركّب مجرَّب للمعاينة، مع حذر في النص العربي |
| Electron | `electron.md` | ⭐⭐⭐⭐ | أقل مخاطرة لمحرر وسائط؛ Tauri أخف لكن دعم WebView متباين |
| MCP | `mcp.md` | ⭐⭐⭐⭐⭐ | واجهة الوكلاء؛ صمّم command registry الآن |
| Whisper | `whisper.md` | ⭐⭐⭐⭐⭐ | أفضل تفريغ محلي مجاني؛ استعمل whisper.cpp/faster-whisper |
| Deepgram | `deepgram.md` | ⭐⭐⭐ | بديل سحابي اختياري؛ العربية غير مقاسة |
| Cloudflare R2 | `cloudflare-r2.md` | ⭐⭐⭐ | رخيص بلا egress، لكنه غير لازم للـMVP |
| Pexels API | `pexels-api.md` | ⭐⭐⭐ | B-roll تلقائي؛ الصفحة المحفوظة فارغة والشروط للتحقق |

## أهم ما خرج من هذه الدفعة
- الترخيص أخطر نقطة: FFmpeg بناء LGPL فقط، وx264/x265 تعني GPL وبراءات؛ الأسلم ترميز عتادي وتشغيل FFmpeg كعملية منفصلة.
- Electron أنسب للبداية لأن WebCodecs/WebGPU تحتاج Chromium ثابتاً؛ Tauri يعتمد على WebView النظام ودعمه متباين (خصوصاً Linux).
- المعاينة: WebCodecs ثم Pixi/WebGL، وWebGPU تحسين اختياري. التصدير: FFmpeg، مع مسار WebCodecs للحالات البسيطة.
- التفريغ: whisper.cpp محلياً (مع VAD) كافتراضي، وDeepgram/OpenAI خلف واجهة موحدة اختيارية؛ جودة العربية الخليجية لازم تُقاس بـWER قبل أي التزام.
- MCP: صمّم سجل أوامر واحداً بمخططات JSON تتولد منه أدوات الشات وMCP؛ احذر prompt injection وكثرة الأدوات.
- R2 وPexels اختياريان؛ الأرقام (تسعير R2 وDeepgram، حدود Pexels) من الذاكرة لأن الصفحات لم تُجلب، وتحتاج تحققاً.
- ملف Pexels المحفوظ في خام فارغ (حاجز Cloudflare) ويستحسن إعادة جلبه يدوياً.
