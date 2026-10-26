# الدفعة 07 — ملخص

| الموضوع | الملف | التقييم | السبب بسطر |
|---|---|---|---|
| KrillinAI (صار OpenCreator) | `krillinai.md` | ⭐⭐⭐⭐ | مرجع عملي لخط توطين بـCLI+manifest+أنماط ترجمة JSON بحقول ASS، فوق Codex |
| Kapwing | `kapwing.md` | ⭐⭐ | SaaS مغلق، مرجع مقارنة (ترجمة/دبلجة/Clips) فقط |
| GPT-SoVITS | `gpt-sovits.md` | ⭐⭐ | استنساخ ممتاز (MIT) لكن لا عربية (zh/ja/ko/yue/en فقط) |
| VoiceStudio | `voicestudio.md` | ⭐⭐⭐⭐ | دبلجة محلية + ASS كاريوكي بتوقيت كلمات + MCP؛ لكن AGPL |
| Higgsfield MCP + Virality Predictor | `higgsfield-mcp-virality.md` | ⭐⭐⭐ | نمط تصميم MCP جيد؛ الـPredictor صندوق أسود مغلق بسقف 15 ثانية |
| مكتبة 389 فيديو Opus 5.5 (Skillry) | `opus-video-prompt-library.md` | ⭐⭐⭐ | نمط بطاقة (أصل + برومبت + remake + Skills) ينفع مكتبة الأنماط |

## أهم ما خرج من هذه الدفعة
- KrillinAI تغيّر: الاسم OpenCreator، الترخيص Apache-2.0 (لا GPL كما في التويت)، 13.9K نجمة، ومحرّك الوكيل هو Codex.
- أفضل فكرة معمارية: كل مرحلة أمر CLI يطبع JSON ويكتب manifest مع dry-run؛ مثالية لواجهة MCP عندنا.
- ملف أنماط الترجمة في KrillinAI (JSON بحقول ASS لكل اتجاه أفقي/عمودي) بذرة جيدة لقسم «النصوص» في حزمة النمط.
- VoiceStudio فيه `karaoke_ass.py`: ASS بتوقيت كلمة-بكلمة، وقاعدة «لا تستعمل توقيت الكلمات إن لم تطابق النص المعروض» (مهمة بعد الترجمة)؛ لكن ترخيص AGPL يمنع نسخ الكود.
- العربية: لا KrillinAI ولا VoiceStudio يعالجان RTL في مولّد الترجمة صراحة (KrillinAI فيه خطوط احتياطية للعربية؛ VoiceStudio لا شيء)، وGPT-SoVITS لا يدعم العربية إطلاقاً. نحتاج اختبار libass مع العربية بأنفسنا.
- «Virality Predictor» ميزة مغلقة (hook score، hold rate، brain heatmap، حد 15 ثانية)، والادعاء «مسح دماغي» غير موثق؛ نأخذ فكرة فحص ما قبل النشر بمقاييس بسيطة محلية.
- مكتبة «389 فيديو» (الآن 418) هي أكواد HTML/Three.js/Remotion يكتبها Claude لا نماذج فيديو؛ ويؤكد مسار «كود ← فيديو» كطبقة موشن. يوجد ملف `awesome-opus5-5-videos.md` من دفعة أخرى حول موضوع قريب، يُراجع التداخل.
- نمط بطاقة Skillry (أصل + remake + برومبت + وسوم + Skills) نموذج جاهز لواجهة مكتبة الأنماط عندنا.
