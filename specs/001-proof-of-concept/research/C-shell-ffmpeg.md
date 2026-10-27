# C — الغلاف (Electron/Tauri) وFFmpeg والتصدير وتخزين المفاتيح والملفات

> باحث C · 2026-10-27 · الميزة 001. كل رقم أداء هنا **فرضية** حتى نقيسه (المبدأ VIII). ما لم أتحقق منه مكتوب «غير متحقق». هذا ليس استشارة قانونية؛ مسائل البراءات (H.264/AAC) تحتاج محامياً قبل الإطلاق التجاري.

---

### C1. Electron أو Tauri؟

**القرار:** **Electron** (المرشح الأول في الدستور)، بشرط أن تمر «تجربة القياس» في أول مهمة (القسم الأخير) بلا فيتو. نثبّت إصداراً رئيسياً مدعوماً وقت كتابة الخطة: آخر إصدار مستقر الآن **45.0.0** (نُشر 2026-10-21). الفريق يدعم آخر 3 إصدارات رئيسية (45/44/43). للتغليف: `electron-builder` (stable على npm: 26.18.0)، والتحديث: `electron-updater` (6.8.11).

**السبب (حقائق غير أدائية، تكفي وحدها):**
1. **محرك واحد مثبّت على النظامين.** Electron يشحن نفس Chromium بالضبط على macOS وWindows. معناها WebCodecs وتشكيل النص (HarfBuzz داخل Chromium) وWebGL/Canvas تتصرف بنفس الطريقة. وهذا شرط FR-021 («نفس السلوك») والمبدأ IV (الحتمية، والمعاينة = التصدير).
2. **Tauri = محركان مختلفان:** WKWebView على macOS (WebKit، والنص يتشكل غالباً بـ CoreText لا HarfBuzz) وWebView2 على Windows (Chromium). يعني النص العربي قد يتشكل بمحركين مختلفين، فتتغير الكابشن بين النظامين. وهذا يخالف FR-021 من الأساس.
3. **محرك WKWebView مربوط بإصدار النظام عند المستخدم:** حسب caniuse، WebCodecs في Safari **جزئي من 16.4 إلى 18.7، وكامل من 26.0 فقط**. يعني مستخدم Tauri على macOS أقدم يشوف دعماً ناقصاً (الصوت غالباً). وWebView2 «evergreen» يتحدّث من تحته بدون ما نصدر نسخة جديدة. في الحالتين يتغير سلوك المعاينة بدون تحكم منا، وهذا ضد الحتمية.
4. Electron وelectron-builder وForge وelectron-updater كلها **MIT** (متحقق من GitHub/npm).

**البدائل المدروسة:**
- **Tauri** (Apache-2.0): مرفوض بسبب 2 و3 فوق، ما له علاقة بالأداء. لو تبيّن لاحقاً أن Electron فشل في القياس، نرجع للمالك بالخيارات، ما نبدّل بصمت.
- Wails/Neutralino: نفس مشكلة WebView النظام.
- ويب فقط: ما فيه تشغيل FFmpeg كعملية منفصلة، ولا وصول آمن للملفات.

**التوقيع والتوثيق (متطلبات قبل التوزيع العام):**
- **macOS:** عضوية Apple Developer (99$ سنوياً) + شهادة Developer ID Application + Hardened Runtime + entitlements + notarization + stapling. وelectron-builder يسويها كلها. **مهم:** ملفات `ffmpeg`/`ffprobe` داخل الحزمة لازم تتوقّع هي بعد بـ hardened runtime، وإلا يرفض Apple التوثيق. نتأكد أنها داخل `.app` في مكان يوقّعه electron-builder (مثلاً `extraResources` مع `mac.binaries`).
- **Windows:** شهادة **EV ما عاد لها ميزة** في SmartScreen من 2024 (تُعامل مثل OV). **Azure Artifact Signing** (كان اسمه Trusted Signing): يحتاج اشتراك Azure مدفوع. والشهادات العامة متاحة **لمنظمات** في: أمريكا، كندا، الاتحاد الأوروبي، بريطانيا، أستراليا، نيوزيلندا، اليابان، كوريا الجنوبية، سنغافورة، سويسرا، النرويج، إسرائيل. و**للأفراد في أمريكا وكندا فقط**. **السعودية مو في القائمة** ← نحتاج غالباً شهادة **OV** من جهة إصدار (CA)، مع مفتاح على HSM أو خدمة توقيع سحابية. (هل يمكن تصدير مفتاح OV كملف .pfx اليوم؟ وثيقة electron-builder تقول نعم، لكن متطلبات CA/B حول تخزين المفاتيح «غير متحقق».) SmartScreen يبني سمعة الملف تدريجياً مهما كانت الشهادة.
- **سؤال للمالك:** باسم مَن نوقّع (فرد أو مؤسسة)؟ وفي أي دولة مسجلة المؤسسة؟ هذا يحدد هل Artifact Signing متاح لنا.

**التحديث التلقائي:** `electron-updater` (MIT) يتحقق على Windows من توقيع Authenticode للتحديث، ويرفضه إذا اختلف `publisherName`. وعلى macOS، التحديث يحتاج تطبيقاً موقّعاً. الإصدار 7 (alpha حالياً) يضيف توقيع ملف البيان (manifest)، فنراقبه. **التحديث التلقائي خارج نطاق 001 على الأغلب**، نذكره عشان نختار الأداة صح من البداية.

**ما يجب قياسه قبل الاعتماد:** انظر «تجربة القياس» آخر الملف (الحجم، الذاكرة، WebCodecs على عيّناتنا). الحجم (~100–200MB) والذاكرة **فرضيات** من ملف التشريح، مو حقائق.

**الاعتماديات والتراخيص:**
| الاسم | الإصدار | الترخيص | لماذا |
|---|---|---|---|
| electron | 45.x (أو 44.x المستقر) | MIT | Chromium موحّد + Node |
| electron-builder | 26.18.x (‏v27 alpha، إعدادات التوقيع تغيّرت فيه) | MIT | تغليف وتوقيع وnotarization |
| electron-updater | 6.8.x | MIT | تحديث بتحقق توقيع (لاحقاً) |
| @electron-forge (بديل) | 8.0.1 | MIT | غير مختار: نكتفي بأداة واحدة |
| tauri (مرفوض) | — | Apache-2.0 | للمقارنة فقط |

**المصادر:** https://github.com/electron/electron/releases · https://www.electronjs.org/docs/latest/tutorial/electron-timelines · https://caniuse.com/webcodecs · electron-builder: `website/docs/features/code-signing/code-signing-win.md`, `website/docs/notarization.md`, `website/docs/win.md` (عبر GitHub API) · https://learn.microsoft.com/en-us/azure/artifact-signing/quickstart · https://learn.microsoft.com/en-us/azure/artifact-signing/faq

---

### C2. توزيع FFmpeg تحت المبدأ VI (بناء LGPL وعملية منفصلة)

**القرار:**
- **Windows x64:** بناء **BtbN FFmpeg-Builds** بنوع `win64-lgpl` (static)، من **فرع إصدار مثبّت** (مثلاً `n8.1` أو `n9.0`)، مو `master`. ونثبّت **وسم إصدار بتاريخ** (مو `latest`، لأنه يتحرك. والمحفوظ: آخر 14 يومي، وآخر بناء لكل شهر لمدة سنتين). وبصمة **SHA-256 مثبّتة** في سكربت البناء.
- **macOS arm64 + x64:** **ما فيه بناء LGPL جاهز وموثوق** (تفاصيل تحت). **نبنيه بأنفسنا في CI** على أجهزة macOS، من **نفس فرع الإصدار** المستخدم في Windows، بدون `--enable-gpl`، ونتحقق بـ `ffmpeg -buildconf` و`ffmpeg -L`. توحيد الإصدار شرط من FR-021، مو مجرد تحسين.
- **نشحنه داخل التطبيق** (مو تنزيل عند أول تشغيل): لأن FR-017 يطلب أن الاستيراد والتصدير يشتغلان بدون اتصال من أول مرة. وأيضاً التنزيل لاحقاً يضيف خطر سلسلة توريد ويعقّد التوقيع. التحديث يجي مع تحديث التطبيق.
- **التزامات LGPL:** نسخة الترخيص في «حول/التراخيص»، وتوفير المصدر الدقيق وسكربتات البناء (رابط أو عرض مكتوب)، وجرد التراخيص في المستودع. تنبيه: BtbN يبني `--enable-version3`، يعني **LGPLv3** (ملف `COPYING.LGPLv3`). نذكرها في الجرد.

**السبب والبدائل المدروسة — نتيجة فحص المرشحين:**
| المصدر | المنصات | الترخيص الفعلي | libass | ملاحظة |
|---|---|---|---|---|
| BtbN `*-lgpl` | win64, winarm64, linux64, linuxarm64 (**بدون macOS**) | LGPLv3 (x264/x265 مستبعدة صراحة في `lgpl*`) | نعم (+fribidi) | فيه amf وnvenc (ffnvcodec) وQSV (libvpl) وopenh264. وجود `h264_mf` ما ظهر في السكربتات (يُكتشف تلقائياً؟ **غير متحقق**، يُفحص بـ `-encoders`) |
| Gyan.dev | Windows | **GPLv3** لكل البناءات (essentials فيه libx264) | — | مرفوض |
| evermeet.cx | macOS **Intel فقط** | **GPL** (`--enable-gpl`، x264، x265) | نعم | مرفوض |
| ffmpeg.martin-riedl.de | macOS arm64/x64، Linux | فيه x264 و x265، يعني **GPL** فعلياً (الصفحة ما تذكر الترخيص) | نعم | موقّع ومعه SHA256، لكنه GPL. مرفوض |
| `ffmpeg-static` (npm) | الكل | الحزمة **GPL-3.0**. ثنائياتها من Gyan وevermeet وosxexperts وjohnvansickle (كلها GPL) | — | مرفوض |
| `@ffmpeg-installer/ffmpeg` | الكل | ترخيص غير مُعلن في بيانات GitHub. وثنائي mac من evermeet (GPL). آخر تحديث 2023 | — | مرفوض |
| Homebrew `ffmpeg` | macOS | يُبنى بـ x264 افتراضياً، يعني GPL (**غير متحقق** هذه الجلسة) | — | للتطوير المحلي فقط |
| ae-ffmpeg (PyPI) | ? | يدّعي LGPLv3 | ? | **غير متحقق**. مثال على أن البناء الذاتي ممكن |

**البدائل المدروسة (التوزيع):** التنزيل عند أول تشغيل مرفوض: يكسر FR-017 (العمل بلا اتصال من أول مرة)، ويضيف خطر سلسلة توريد، ويعقّد التوقيع. والربط بمكتبات libav* داخل Node (`node-av` وأمثاله) مرفوض لأن المبدأ VI يطلب عملية منفصلة.

**ملاحظة libass:** موجود في BtbN، ونضيفه في بناء mac (رخص: libass **ISC**، fribidi **LGPL-2.1**، harfbuzz «MIT-old» حسب **غير متحقق** (GitHub يقول NOASSERTION)، freetype مزدوج FTL/GPLv2 ونختار FTL حسب **غير متحقق** (GitHub يقول NOASSERTION)). **لكن:** إذا التصدير استخدم libass والمعاينة رسمت النص في Chromium، صار عندنا محركا تشكيل مختلفان، وهذا **يخالف المبدأ IV**. القرار مربوط ببحث محرك الكابشن. التوصية المبدئية: نخلي التصدير يرسم الإطارات بنفس دالة التركيب ونرسلها لـ FFmpeg ليرمّزها، فنستغني عن libass. ونضمّنه فقط إذا اختار بحث الكابشن ASS.

**نمط التشغيل (main process فقط، والواجهة ما تشغّل عمليات):**
- `child_process.spawn(ffmpegPath, argsArray, { shell: false, windowsHide: true })` (مدمج في Node، بدون اعتمادية). أو `execa` (MIT، 10.2.1) لو احتجنا إلغاء ومهلة جاهزة. **ممنوع** `exec` أو تمرير نص للـ shell.
- مع مصفوفة الوسائط ما نحتاج escaping للـ shell، **لكن فيه طبقتان باقيتان:**
  1. **أسماء الملفات:** نسبق كل مدخل بـ `file:` ونضبط `-protocol_whitelist file,pipe`، عشان اسم ملف مثل `concat:...` أو `http:...` ما يُفسَّر كبروتوكول. ونمرر مسارات مطلقة دائماً (ما يبدأ أي اسم بـ `-`).
  2. **الـ filtergraph** له escaping خاص (`:` `\` `'` `,` `[` وحرف القرص في Windows `C:`). نكتب الرسم في ملف مؤقت ونمرره بـ `-filter_complex_script` (أو صيغته الأحدث في FFmpeg 7+: **غير متحقق**)، والملفات المساعدة (مثل ASS) تُنسخ لمجلد مؤقت بأسماء آمنة.
- ثوابت كل استدعاء: `-nostdin -hide_banner -nostats -loglevel error -progress pipe:1`، ونقرأ `out_time_us` و`frame` و`progress=end` من stdout لشريط التقدم، وstderr للأخطاء. والإلغاء: نرسل `q` لـ stdin (لو ما استخدمنا `-nostdin`) أو `SIGTERM`، ثم نحذف الملف الناقص.
- محتوى المقطع والتفريغ مدخل غير موثوق، وما يدخل أي وسيط إلا عبر مخطط أمر (المبدأ VII).

**ffprobe لـ FR-001/FR-019:**
`ffprobe -v error -print_format json -show_format -show_streams -show_entries stream_side_data file:<path>`
- المدة من `format.duration`. ونرفض إذا تجاوزت 15 دقيقة **قبل** أي معالجة (FR-019).
- fps **ككسر** من `r_frame_rate` و`avg_frame_rate` (مثل `30000/1001`)، ما نحوّله لعدد عشري. إذا اختلفا = غالباً **VFR** (شائع في الجوال).
- الدقة + **الدوران** (displaymatrix في side data) + `pix_fmt`/`color_transfer` (‏HDR HLG/PQ 10-bit من الآيفون).
- `nb_frames` غالباً **ناقص** في MOV/MKV. العدد الموثوق: `-count_frames` ثم `nb_read_frames` (أبطأ؛ نقيس زمنه على 15 دقيقة).

**ما يجب قياسه قبل الاعتماد:** حجم ffmpeg+ffprobe لكل منصة، ونجاح بناء mac في CI، وقائمة `-encoders`/`-hwaccels` الفعلية، وزمن `-count_frames`.

**الاعتماديات والتراخيص:**
| الاسم | الإصدار | الترخيص | لماذا |
|---|---|---|---|
| FFmpeg (ثنائي منفصل) | فرع n8.1 أو n9.0 (واحد للنظامين) | LGPLv3 (‏`--enable-version3`، بدون gpl) | تحليل + ترميز التصدير |
| BtbN/FFmpeg-Builds (سكربتات) | وسم بتاريخ | MIT | مصدر ثنائي Windows |
| libass (اختياري) | مع البناء | ISC | فقط إن اختير ASS |
| fribidi (اختياري) | مع البناء | LGPL-2.1 | تبع libass |
| libvpl / nv-codec-headers / AMF | مع البناء | MIT / **غير متحقق** / **غير متحقق** (GitHub: NOASSERTION) | مشفّرات عتادية على Windows |
| execa (اختياري) | 10.2.1 | MIT | راحة في إدارة العملية |

**المصادر:** https://github.com/BtbN/FFmpeg-Builds (README، `variants/defaults-lgpl.sh`، `scripts.d/50-{x264,libass,openh264,amf,ffnvcodec,onevpl}.sh`، releases) · https://www.gyan.dev/ffmpeg/builds/ · https://evermeet.cx/ffmpeg/ · https://ffmpeg.martin-riedl.de/ · https://github.com/eugeneware/ffmpeg-static (README) · https://github.com/kribblo/node-ffmpeg-installer (README)

---

### C3. تصدير H.264 MP4 بدون كودكات GPL

**القرار:** H.264 (High، `yuv420p`) + AAC داخل MP4 مع `-movflags +faststart`، بدقة المصدر (حتى 1080p) وfps المصدر (FR-022). **الترميز العتادي أولاً** (المبدأ VI):
- **macOS:** `h264_videotoolbox` (Intel وApple Silicon).
- **Windows:** الترتيب `h264_nvenc` ← `h264_qsv` ← `h264_amf` ← `h264_mf` (Media Foundation، وفيه احتياطي برمجي من Windows نفسه: **غير متحقق**).
- **الاحتياطي البرمجي الأخير:** `libopenh264` (BSD-2-Clause، موجود في BtbN lgpl). **تنبيه براءات:** رخصة براءة Cisco تشمل **فقط ثنائي Cisco الذي يُنزَّل منفصلاً** إلى جهاز المستخدم ويقدر يطفيه، مو نسخة مبنية من المصدر ومربوطة static داخل ffmpeg. حقوق النسخ سليمة (BSD)، لكن غطاء البراءة ما يشملنا. لذلك يبقى احتياطياً أخيراً، والقرار القانوني للمالك.
- `libx264`/`libx265`: **ممنوعة** (GPL). و`libfdk_aac` ممنوع (nonfree).
- **الصوت:** مشفّر `aac` المدمج في FFmpeg (LGPL). وعلى macOS فيه بديل `aac_at` (AudioToolbox؛ وجوده في بنائنا **غير متحقق**). نختار واحداً للنظامين ونقيس الفرق السمعي.

**البدائل المدروسة:** `libx264`/`libx265` (GPL، ممنوعة)؛ `libfdk_aac` (nonfree)؛ الترميز بـ VideoEncoder من WebCodecs (مؤجل لبحث المعاينة والتصدير، وتفحصه S5)؛ smart cut (ما يصلح مع كابشن محروق، تحت).

**الكشف وقت التشغيل:** (1) `ffmpeg -hide_banner -encoders` ونبحث عن الأسماء. (2) **ترميز تجريبي ثانية واحدة** في أول تشغيل لكل مشفّر موجود (`-f lavfi -i testsrc2=size=1280x720:rate=30 -t 1 -c:v <enc> -f null -`)، لأن وجود الاسم ما يعني أن العتاد يدعمه (nvenc بدون بطاقة NVIDIA يفشل). نحفظ النتيجة مع إصدار ffmpeg وتعريف الـ GPU، ونعيد الفحص إذا تغيّرت.

**قالب أمر التصدير (فكرة؛ المدخل إطارات من دالة التركيب):**
`-f rawvideo -pix_fmt <rgba|nv12> -s WxH -r <fps-rational> -i pipe:0` + الصوت من المصدر مقصوصاً حسب EDL + `-c:v <hw-enc> -pix_fmt yuv420p -fps_mode cfr -r <fps-rational> -c:a aac -movflags +faststart`
- **VFR:** مقاطع الجوال غالباً VFR. نثبّت fps كسرياً واحداً (من `avg_frame_rate` أو قاعدة نحددها في الخطة) تستخدمه **دالة التركيب والتصدير معاً**، ونخرج CFR (`-fps_mode cfr`؛ و`-vsync` قديم ومتروك).
- **الدوران وHDR:** نطبّق الدوران في التركيب. وHDR 10-bit ← SDR `yuv420p` يحتاج tone-mapping (`zscale` يحتاج libzimg، موجود في BtbN، ونضيفه لبناء mac). هذا بند قياس.
- ملاحظة: VideoEncoder في Chromium (WebCodecs) بديل تصدير ممكن، لكن مشفّره البرمجي لـ H.264 داخل Electron **غير متحقق**. نفحصه بـ `isConfigSupported` في التجربة. القرار بين «FFmpeg يرمّز» و«WebCodecs يرمّز» يحسمه بحث المعاينة والتصدير. وفي الحالتين لا GPL.

**فحص التطابق ±1 إطار (FR-014/SC-002):**
1. الـ EDL يُخزَّن **بأرقام إطارات صحيحة** (مو ثوانٍ عشرية) على شبكة fps الكسرية للمشروع. وهذا اللي يخلي ±1 قابلاً للفحص.
2. المتوقع = مجموع `(out − in)` لكل مقطع مُبقى.
3. الفعلي = `ffprobe -count_frames -select_streams v:0 -show_entries stream=nb_read_frames,r_frame_rate` على الملف الناتج، و`format.duration`، ومدة مسار الصوت.
4. النجاح: `|فعلي − متوقع| ≤ 1`، ومدة الصوت ضمن إطار واحد من مدة الفيديو. ونضيف مقارنة بصرية آلية: نستخرج 10 إطارات عشوائية من الناتج (`-ss` دقيق + `-frames:v 1`) ونقارنها ببكسلات المعاينة لنفس الإطار (SSIM/فرق بكسل بعتبة نقيسها).

**Smart cut (نسخ مباشر عند keyframes):** **ما يصلح** في 001 لأن الكابشن محروق، فلازم كل الإطارات تتعاد ترميزها. نسجله فكرة لميزة لاحقة («قص فقط بلا كابشن»)، ونكتب منطقه بأنفسنا (LosslessCut GPL، نتعلم منه بس).

**ما يجب قياسه قبل الاعتماد:** نجاح كل مشفّر عتادي على أجهزتنا، والجودة عند bitrate نحدده، وتشغيل الناتج في Safari/Chrome/iOS/Android (FR-022)، وزمن تصدير 10 دقائق.

**الاعتماديات والتراخيص:**
| الاسم | الإصدار | الترخيص | لماذا |
|---|---|---|---|
| h264_videotoolbox / mf / nvenc / qsv / amf | داخل FFmpeg | LGPL (واجهات للعتاد/النظام) | ترميز بلا GPL |
| libopenh264 | داخل بناء BtbN | BSD-2-Clause (براءة Cisco **لا** تشمل البناء من المصدر) | احتياطي أخير |
| aac (مدمج) / aac_at | داخل FFmpeg | LGPL / إطار النظام | صوت |

**المصادر:** https://www.openh264.org/BINARY_LICENSE.txt · https://github.com/cisco/openh264 (الترخيص عبر GitHub API) · سكربتات BtbN المذكورة في C2 · ملف التشريح `خام/تشريح/losslesscut.md`

---

### C4. تخزين مفتاح API في المخزن الآمن للنظام

**القرار:** **`safeStorage` من Electron بالواجهة غير المتزامنة فقط** (`isAsyncEncryptionAvailable` و`encryptStringAsync` و`decryptStringAsync`)، والمفتاح المشفّر يُحفظ في ملف داخل `userData` (مو داخل ملف المشروع أبداً).
**تفسير نحتاج موافقة المالك عليه:** الدستور يقول «مخزن النظام الآمن لا ملفات نصية». مع safeStorage، **مفتاح التشفير** في Keychain (macOS) أو DPAPI (Windows)، وعلى القرص **نص مشفّر فقط**. أرى أن هذا يحقق القصد (ما فيه مفتاح مقروء في ملف). لو المالك يبي القراءة الحرفية (السر نفسه داخل Keychain/Credential Manager)، نستخدم `@napi-rs/keyring` بدلاً منه.

**السبب:**
- بدون اعتمادية native إضافية، ويصونه فريق Electron. والواجهة المتزامنة **متروكة وتُحذف في Electron 46**، فنبدأ بالـ async من أول يوم.
- **macOS:** Keychain يمنع التطبيقات الثانية بدون موافقة المستخدم. لكن **بدون توقيع ثابت للتطبيق، Keychain يعيد السؤال بعد كل تحديث**، فالتوقيع (C1) شرط لتجربة سليمة.
- **Windows:** DPAPI يحمي من المستخدمين الثانيين، **لا من تطبيقات نفس المستخدم**. وهذا ينطبق تقريباً على Credential Manager كذلك، فما يرجّح keyring هنا.
- Linux (تطوير/CI فقط): لو ما فيه secret store، safeStorage يرجع `basic_text` (حماية شكلية). نرفض الحفظ في هذه الحالة ونطلب المفتاح لكل جلسة.

**البدائل المدروسة:**
- `keytar`: **مؤرشف** (archived، آخر دفع 2022-12). مرفوض.
- `@napi-rs/keyring` (MIT، 2.1.2، نشط، ربط لـ keyring-rs، ثنائياته مبنية بـ `cargo auditable`): بديل مقبول إذا اختار المالك القراءة الحرفية. عيبه: وحدة native لكل معمارية تُوقَّع داخل الحزمة.

**تجربة الإفصاح قبل أول إرسال (FR-017، المبدأ V):** نافذة إلزامية قبل أول تفريغ لكل مزود، فيها:
- **ماذا يُرسَل:** «الصوت فقط»، الصيغة، المدة، الحجم التقريبي. و«الفيديو لا يغادر جهازك».
- **إلى مَن:** اسم المزود + النطاق الفعلي (endpoint) + رابط سياسة الاحتفاظ بالبيانات عنده.
- **بأي مفتاح:** اسم المفتاح كما سمّاه المستخدم + آخر 4 أحرف فقط.
- زر «موافق ومتابعة» / «إلغاء». الموافقة تُحفظ لكل (مزود + مفتاح)، وتُطلب من جديد إذا تغيّر أحدهما. وفي الإعدادات سجل بكل الإرسالات (تاريخ، مزود، مدة الصوت) وزر «حذف المفتاح».
- المفتاح يُفك تشفيره في main process فقط وقت الطلب، وما يمر للواجهة ولا يُكتب في السجلات.

**الاعتماديات والتراخيص:**
| الاسم | الإصدار | الترخيص | لماذا |
|---|---|---|---|
| electron `safeStorage` | ضمن Electron | MIT | المختار |
| @napi-rs/keyring | 2.1.2 | MIT | بديل حرفي |
| keytar | — | MIT (مؤرشف) | مرفوض |

**المصادر:** https://www.electronjs.org/docs/latest/api/safe-storage · https://github.com/Brooooooklyn/keyring-node (README، الترخيص عبر GitHub API) · https://github.com/atom/node-keytar (حالة الأرشفة عبر GitHub API)

---

### C5. تخزين المشروع والأنماط على القرص

**القرار:**
- **المشاريع:** `userData/projects/<projectId>/project.json` + `snapshots/` (لقطات التراجع) + `cache/` (الصوت المستخرج، الإطارات المصغرة، waveform). المشروع يشير للوسائط **بمسار مطلق + بصمة** (الحجم + mtime + hash لأول/آخر عدة MB) عشان إعادة الربط إذا انتقل الملف. **ما نكتب ملفاً جنب الوسائط** (قد يكون المجلد للقراءة فقط أو متزامناً سحابياً، وما نلمس مجلدات المستخدم؛ روح المبدأ III).
- **مكتبة الأنماط:** `userData/styles/<styleId>/v<n>.json` بدون تعديل على النسخ القديمة. المشروع يثبّت `{styleId, version}` (قرار التوضيح Q2).
- **الحفظ الذري:** `write-file-atomic` (ISC): يكتب ملفاً مؤقتاً، ثم fsync، ثم rename. حفظ تلقائي بعد كل أمر (مع debounce قصير) وعند الإغلاق. ونحتفظ بنسخة `project.json.bak` من آخر حفظ ناجح، ونقرأها لو فشل parse الأصل.
- **استئناف التفريغ (FR-016):** حالة التفريغ داخل المشروع: `{provider, keyRef (اسم المفتاح لا قيمته), audioCachePath, chunks: [{index, startFrame, endFrame, status: pending|sent|done|failed, remoteJobId?, result?}]}`. عند الفتح نرسل فقط القطع اللي مو `done`، بعد التحقق أن بصمة الوسائط ما تغيّرت.
- **ممنوع:** أي مفتاح أو سر داخل `project.json` أو السجلات.

**البدائل المدروسة:** `electron-store` (MIT): مناسب للإعدادات الصغيرة، لكن ما نحتاجه لأن JSON + كتابة ذرية يكفي. وSQLite (`better-sqlite3`) تعقيد ما يحتاجه 001 (المبدأ VIII). ملف sidecar جنب الوسائط: مرفوض (الأسباب فوق).

**ما يجب قياسه قبل الاعتماد:** `rename` فوق ملف موجود على Windows قد يفشل (EPERM) إذا مضاد الفيروسات قافل الملف. نختبر حفظاً متكرراً تحت ضغط على Windows (**غير متحقق** هل write-file-atomic يعيد المحاولة). وحجم اللقطات الكاملة لمقطع 15 دقيقة.

**الاعتماديات والتراخيص:**
| الاسم | الإصدار | الترخيص | لماذا |
|---|---|---|---|
| write-file-atomic | آخر مستقر | ISC | حفظ ذري |
| electron-store (مرفوض الآن) | — | MIT | للمقارنة |

**المصادر:** https://github.com/npm/write-file-atomic (الترخيص عبر GitHub API) · https://github.com/sindresorhus/electron-store (الترخيص عبر GitHub API)

---

## تجربة القياس (Spike) — أول مهمة في الخطة

الهدف: نحسم Electron بالقياس كما يطلب الدستور، ونثبت أن FFmpeg LGPL يكفي. **العتبات مقترحة وتحتاج موافقة المالك**، مو حقائق.

| # | ماذا نقيس | أين | عتبة فيتو مقترحة (للمالك) |
|---|---|---|---|
| S1 | حجم المثبّت (dmg/nsis) مع ffmpeg+ffprobe | mac arm64، win x64 | > 400MB يستدعي مراجعة |
| S2 | زمن الإقلاع البارد + الذاكرة وقت الخمول | جهاز Mac المرجعي | — (تسجيل فقط) |
| S3 | أقصى ذاكرة أثناء معاينة وتقليب مقطع 1080p مدته 15 دقيقة | Mac 8GB إن وُجد | > 2.5GB أو انهيار = فيتو |
| S4 | `VideoDecoder.isConfigSupported` لعيّناتنا الحقيقية (H.264، HEVC من آيفون، 10-bit HDR، VFR) | Electron على mac/win | فشل H.264 أو HEVC الآيفون = فيتو |
| S5 | `VideoEncoder.isConfigSupported({codec:'avc1.640028', hardwareAcceleration:'prefer-software'})` | Electron | معلومة لقرار مسار التصدير |
| S6 | بناء FFmpeg LGPL لـ mac arm64/x64 في CI من نفس فرع Windows؛ `-buildconf` بدون `gpl` | CI | فشل = مراجعة المصدر |
| S7 | `ffmpeg -encoders` + ترميز تجريبي ثانية لكل مشفّر عتادي | mac + أي Windows متاح | لا مشفّر H.264 يعمل على mac = فيتو |
| S8 | زمن `ffprobe -count_frames` لمقطع 15 دقيقة | mac | > 30 ثانية: نستخدم بديلاً |
| S9 | تصدير 10 دقائق: الزمن + فحص ±1 إطار + تشغيل في Safari/Chrome/iOS/Android | mac | فشل ±1 أو عدم تشغيل = عيب حاجب |
| S10 | توقيع + notarization لحزمة فيها ffmpeg (تجربة جافة) | mac | رفض Apple = إصلاح قبل المتابعة |
| S11 | رسم نص عربي مختلط (نفس الإطار) على mac وwin ومقارنة البكسلات | Electron | اختلاف = تحقيق (يمس FR-021) |

## نقاط مفتوحة للمالك
1. باسم مَن نوقّع على Windows (فرد أو مؤسسة، والدولة)؟ السعودية مو ضمن دول Artifact Signing ← غالباً شهادة OV من CA.
2. هل التشفير بـ safeStorage (مفتاح في Keychain/DPAPI ونص مشفّر على القرص) يحقق «مخزن النظام الآمن»؟ أو نلتزم حرفياً بـ keyring؟
3. هل نقبل libopenh264 كاحتياطي أخير مع غياب غطاء براءة Cisco؟ أو نكتفي بالعتادي ونرفض التصدير برسالة واضحة إذا ما وُجد مشفّر عتادي؟
4. libass مربوط بقرار محرك الكابشن (المبدأ IV): التوصية أن ترسم دالة التركيب نفسها الإطارات للتصدير.
