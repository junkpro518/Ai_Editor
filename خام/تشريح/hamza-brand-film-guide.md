# دليل Hamza Khalid لفيلم العلامة بـOpus 5.5 (+ 8 مستودعات مرجعية)

**المصادر في خام:** `مستندات/Hamza Khalid (@humzaakhalid) on X.txt`  
**الرابط الأصلي:** مقال على X (humzaakhalid/article/2105203643758895454)؛ المستودعات: JohnHeibel/PDoomVideo, JohnHeibel/ClaudeAnimationBase, buildwithhanif/claude-animation-skill, heygen-com/hyperframes, remotion.dev/docs/ai/skills, WinterArc21/Battle-of-Austerlitz-Film, guanmo-ai/awesome-ai-motion, athemeroy/awesome-opus-5-5-videos  
**النوع:** مقال / قائمة  
**الترخيص:** — (المقال) · **النجوم:** — · **آخر تحديث:** المقال ~2026-09-30 · **اللغة/الحزمة:** —  
**تحقق من المصدر الأصلي:** جزئي — المقال مقطوع بعد خطوة تثبيت المهارات (البريف، CLAUDE.md، "البرومبت الدقيق" والإصلاحات خلف اشتراك نشرة aiinpublic.com). جُلبت بيانات GitHub للمستودعات السبعة، وREADME لـClaudeAnimationBase، وبنية awesome-ai-motion وعيّنة من `data/cases.json`.

## ما هو (3–6 أسطر)
دليل خطوة بخطوة لبناء "استوديو موشن" في مجلد واحد على Claude Code: مجلد العلامة ← استنساخ 8 مستودعات كمكتبة مراجع ← تثبيت المهارات ← بريف العلامة وCLAUDE.md ← البرومبت ← الرندر والإصلاح. الرسالة المحورية: **"البرومبت 10% من النتيجة، والإعداد 90%"** — وأيّد ذلك باقتباس من Thariq (فريق Claude Code): المنشور يقول one-shot بينما البرومبت خلفه 10K حرف مع skills وأمثلة ومفاتيح API. جرّب برومبتاً منتشراً كما هو فخرج رأس "يطفو" بلا رقبة ونص يتعارك مع الخلفية، لأن Claude "بلا علامة ولا مراجع ولا قواعد فملأ الفراغ بالتخمين".

## الأفكار (قائمة)
- النموذج من الذاكرة وحدها "يلجأ لأكثر حركة متوسطة رآها" ← أعطه مستودعات مرجعية تُريه كيف يُصنع الفيديو بالكود.
- المستودعات = "كيف يبدو الناتج الجيد"؛ المهارات = "قواعد العمل لكل إطار".
- المجلد الواحد هو الاستوديو: كل فيديو جديد يبني على السابق (تراكم).
- "هذه مهارة يدفع العملاء للوكالات عليها أربعة أرقام".

## المميزات (قائمة، ما يفعله فعلاً لا ما يدّعيه التويت)
القائمة كما تحققنا منها على GitHub:

| # | الدور في الدليل | المستودع | الترخيص | النجوم | آخر دفع | الوصف |
|---|---|---|---|---|---|---|
| 1 | فيديو موسيقي | JohnHeibel/PDoomVideo | — | 2,617 | 2026-09-25 | كود فيديو "I'm Upping My P(doom)" بـOpus 5.5 |
| 2 | Starter | JohnHeibel/ClaudeAnimationBase | MIT | 1,926 | 2026-09-24 | p5.js + p5.brush، شخصية Clawd، 31 عاطفة مُمثَّلة، ودليل للنموذج |
| 3 | Node canvas | buildwithhanif/claude-animation-skill | MIT | 47 | 2026-09-23 | رسوم 2D يدوية بالكود: "detail bible"، rig نملة، فرشاة/ألوان مائية، حلقة إعادة إنتاج مطابقة للإطار، صوت مُركّب |
| 4 | Framework HTML | heygen-com/hyperframes | Apache-2.0 | 72,867 | 2026-10-26 | "Write HTML. Render video. Built for agents." |
| 5 | Framework React | remotion.dev/docs/ai/skills | (انظر remotion.md) | — | — | مهارات Remotion الرسمية |
| 6 | فيلم طويل | WinterArc21/Battle-of-Austerlitz-Film | — | 26 | 2026-09-24 | بلا وصف |
| 7 | مكتبة برومبتات | guanmo-ai/awesome-ai-motion | NOASSERTION | 444 | 2026-10-22 | معرض موشن مع المصدر والبرومبت وصناعة العمل |
| 8 | Dataset | athemeroy/awesome-opus-5-5-videos ← صار **awesome-claude-5-5-videos** | CC-BY-4.0 | 797 | 2026-10-11 | سير عمل فيديو Claude 5.5 موثقة المصدر |

- ClaudeAnimationBase (من README): النموذج يرسم ستوريبورد أولاً، يبني لقطة لقطة، يرندر contact sheets ليفحص عمله، ويكتب `out/video.mp4`. `ANIMATION_GUIDE.md` يحمل القواعد: "مصنوع يدوياً، حي، قطعة واحدة، بلا نص، انتقالات دائماً، شيء يحدث في كل مشهد"، ومبادئ تحريك الشخصيات والتوقيت. ملاحظة المؤلف: مستوى الاستدلال يتناسب مع مدى "بذخ" وتفصيل المشهد.
- الأوامر المذكورة: `npx skills add remotion-dev/skills`؛ `claude plugin marketplace add heygen-com/hyperframes` + `claude plugin install hyperframes@hyperframes`؛ `claude plugin marketplace add buildwithhanif/claude-animation-skill` + `claude plugin install claude-animation@claude-animation-skill`؛ و`GIT_LFS_SKIP_SMUDGE=1` لتخطي فيديوهات اختبار HyperFrames.

## التقنيات والبنية
- الحزم/المكتبات: Claude Code، Node 22+، git، ffmpeg، Remotion، HyperFrames (HTML+GSAP)، p5.js/p5.brush، Node canvas.
- المعمارية: مجلد علامة = `repos/` (مراجع) + مهارات مثبتة + بريف علامة + CLAUDE.md + renders. كل شيء محلي، والوكيل يقرأ المراجع ويكتب الكود.
- أمثلة ملموسة:
  - برومبت الإعداد (من المقال): "أنشئ مجلد repos واستنسخ فيه… تحقق من Node 22+ وgit وffmpeg وثبّت الناقص… ثم اذكر كل مستودع بسطر عمّا يفيد".
  - **مخطط حالة في `awesome-ai-motion/data/cases.json`** (schemaVersion 2، ~4MB): `id, title, titleEn, category, summary, summaryEn, stage, author{name,handle,url}, source{url,publishedAt}, model{name,evidenceQuote,evidenceUrl}, media{durationSeconds,videoCount}, cover{path,sourceUrl,kind,timeSeconds,width,height}, prompt{status,text,sourceUrl,checkedAt,display}, metrics{bookmarks,likes,views}, verification{authorClaimConfirmed,videoAttachmentConfirmed,fullReview,independentlyReproduced,promptMatchedSource}, webPlayback{...}`.

## أشياء نأخذها لمشروعنا (قائمة، كل بند: ماذا + لماذا + أين يخدم الرؤية)
- **مبدأ "الإعداد 90%"**: النمط ليس برومبتاً بل حزمة (هوية + مراجع + قواعد + أمثلة) ← يبرر أن "Style Pack" عندنا يحمل مراجع وأمثلة لا وصفاً نصياً فقط. يخدم: **نظام الأنماط**.
- **فصل "المراجع تُري الناتج الجيد" عن "المهارات تعطي قواعد العمل"** ← حقلان مختلفان في النمط: `references[]` و`rules[]`. يخدم: النمط.
- **مخطط `verification` في awesome-ai-motion** (authorClaimConfirmed, independentlyReproduced, promptMatchedSource...) ← نموذج جيد لـ"مستوى الثقة" في كل خاصية مستخرجة أو مرجع مستورد. يخدم: النمط (حدود الثقة) + متجر الأنماط مستقبلاً.
- **المجلد كاستوديو تراكمي** ← كل مشروع جديد يرث من مكتبة العلامة. يخدم: الأنماط/الأصول.
- مراجعة لاحقة مقترحة: `ClaudeAnimationBase/ANIMATION_GUIDE.md` (قواعد تحريك شخصيات بصيغة دليل للنموذج) و`claude-animation-skill` ("detail bible" + حلقة مطابقة الإطار) — لم نفتح ملفاتها الداخلية.

## استلهامات (تجربة المستخدم، التسويق، التسعير، الطريقة التي شرحوا بها المنتج، ما يعجب الجمهور في الردود)
- عرض "قبل/بعد": نفس البرومبت بلا إعداد (رأس طائر، نص غير مقروء) مقابل الفيلم بعد الإعداد ← طريقة إقناع ممتازة لشرح قيمة "النمط".
- قصة السعر: "Tony Dinh دفع أكثر من $1,000 لفيديو إطلاق، والأسبوع الماضي صنعه مع Claude في أقل من 30 دقيقة".
- لقطات شاشة لكل نقرة (لغير المبرمجين) + "لا تحتاج خلفية تصميم، تحتاج صورة لعلامتك أو رابط متجرك وبرومبتاً".
- نموذج تسويق: المقال طُعم ← الباقي في النشرة المدفوعة/المجانية.

## تحذيرات ومخاطر (ترخيص، نضج، اعتماد على API مدفوع، ادعاءات غير مثبتة)
- الأجزاء الأهم (البريف، CLAUDE.md، البرومبت) **غير موجودة** في المصدر.
- مقال تسويقي (50+ دليل، 1,200+ برومبت) — ليس توثيقاً تقنياً.
- عدة مستودعات بلا ترخيص (PDoomVideo، Austerlitz) ← لا يجوز نسخ كودها. awesome-ai-motion بترخيص NOASSERTION.
- مستودعان صغيران جداً (26 و47 نجمة).
- اسم مستودع الـdataset تغيّر (رابط المقال قديم).
- يتضمن "Test 1: The Writing Test… Opus 5.5 vs Fable 5.1" بلا محتوى (بقايا مقال آخر).

## أسئلة مفتوحة
- ما محتوى "brand brief" وCLAUDE.md عند Hamza؟ (خلف النشرة)
- هل HyperFrames (72K نجمة، Apache-2.0) بديل أنسب من Remotion لطبقة الموشن عندنا؟ (يستحق تشريحاً مستقلاً إن لم يكن في دفعة أخرى.)
- هل يصلح awesome-ai-motion كـ"مجموعة مراجع" لتدريب/اختبار استخراج الأنماط؟

## الحكم: ⭐⭐⭐ (3/5) — فكرة "الإعداد 90%" وقائمة المراجع مفيدة، ومخطط التحقق في awesome-ai-motion لطيف؛ لكن المحتوى الجوهري مقفل والمقال تسويقي.
