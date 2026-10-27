# نموذج البيانات — الميزة 001

**المرجع:** `spec.md` (Key Entities، FR-001..FR-022) · الدستور I–IV، VII · القرارات 2 و10 · مراجع الصيغة: `خام/تشريح/_batch12.md` (lemo-opuscar: أقسام ثابتة + سجل تغييرات؛ video-shotcraft: كرت بمعاملات وتفاوت + قاعدة كسابقة + سجل قرارات؛ huashu: بطاقة + JSON بـschema).

المخططات الرسمية في `contracts/*.schema.json` (JSON Schema 2020-12). هذا الملف يشرحها ويحدد العلاقات والقواعد والحالات.

## 0. قرارات عامة

| القرار | القيمة | السبب |
|---|---|---|
| وحدة الزمن | **وحدتان صحيحتان بحسب الطبيعة:** ما هو صوتي/نصي (كلمات التفريغ، بنود المقترح) بـ**ميكروثانية** (`…Us`)؛ وما هو على التايم لاين (اللقطات، الكابشن) بـ**أرقام إطارات صحيحة** (`…Frame`) على شبكة fps المشروع الكسرية | حدود الإطار عند 30000/1001 ليست ميكروثانية صحيحة، فالإطار الصحيح هو الوحدة الوحيدة التي تجعل فحص ±1 إطار (SC-002) عدّاً لا تقريباً. التحويل: `frame = floor(us * fps.num / (fps.den * 1e6))` و`seconds(frame) = frame * den / num` (كسر دقيق يُمرَّر لـ FFmpeg بست خانات عشرية). لا ثوانٍ عشرية في أي ملف. |
| معدل الإطارات | كسر `{num, den}` = معدل المشروع الثابت (CFR). للمصدر الثابت = معدله؛ لمصدر متغير (VFR، شائع في الجوال) = أقرب معدل معياري لـ `avg_frame_rate` (24000/1001، 24، 25، 30000/1001، 30، 50، 60000/1001، 60) ويُعلَّم `sourceIsVfr` | NTSC بلا تقريب؛ VFR يحتاج معدلاً واحداً تستعمله دالة التركيب والتصدير معاً (بحث B/C). |
| المعرّفات | `id` نص فريد (ULID) | قابل للترتيب زمنياً، آمن في الملفات. |
| الوسائط | **مراجع** (مسار + بصمة) لا نسخ | FR-005: لا تعديل للمصدر؛ المشروع نص صغير. |
| مستند المشروع | JSON واحد `project.json` غير قابل للتغيير منطقياً؛ كل أمر ينتج نسخة جديدة | المبدأ IV والقرار 2 (لقطات كاملة للتراجع). |
| النمط | ملف JSON مستقل في مكتبة المستخدم `styles/<styleId>/style.json` + `versions/<n>.json` | FR-010، القرار 10. |
| المصدر (provenance) | كل قاعدة في النمط وكل سابقة تحمل `source` | الدستور II: المعرفة تحمل مصدرها. |

## 1. الكيانات

### 1.1 Project (مستند المشروع) — `contracts/project.schema.json`

| الحقل | النوع | ملاحظات |
|---|---|---|
| `schemaVersion` | integer | 1 |
| `id`, `name`, `createdAt`, `updatedAt` | string | ISO 8601 |
| `source` | MediaSource | مصدر واحد في 001 |
| `style` | `{ styleId, version }` | التثبيت (FR-010)؛ `availableVersion?` يُحسب عند الفتح لا يُخزَّن |
| `transcript` | Transcript \| null | يُملأ بعد اكتمال التفريغ |
| `transcriptJob` | `{ state, provider, progress, error?, audioHash }` | FR-016: الاستئناف |
| `timeline` | `{ clips: Clip[] }` | مسار فيديو+صوت واحد متزامن (001) |
| `captions` | `{ enabled, cues: CaptionCue[] }` | مشتقة من التفريغ والنمط، تُخزَّن بعد الاشتقاق كي يبقى التصدير حتمياً |
| `proposals` | Proposal[] | آخر مقترح وحالته |
| `corrections` | Correction[] | FR-006 |
| `styleUpdateProposals` | StyleUpdateProposal[] | FR-011 |
| `seed` | integer | بذرة أي عشوائية (الدستور IV) |

### 1.2 MediaSource

`{ id, path, fileName, hash (SHA-256 لأول 64MB + الحجم), fileSize, mtime, durationUs, frameCount (من `-count_frames`), fps:{num,den}, sourceIsVfr, rotation, width, height, hasAudio, container, videoCodec, audioCodec }` — من `ffprobe` (`-show_streams -show_format`، الدوران من side data). الوسائط بمسار مطلق + بصمة لإعادة الربط إن انتقل الملف؛ لا نكتب شيئاً بجانب الوسائط. يُرفض إن `durationUs > 15*60*1e6` قبل أي معالجة (FR-019).

### 1.3 Clip (لقطة)

`{ id, sourceId, inFrame, outFrame (حصري), timelineStartFrame, label? }`

- القيود: `0 ≤ inFrame < outFrame ≤ source.frameCount`؛ اللقطات لا تتداخل على التايم لاين ومرتبة؛ `timelineStartFrame` للّقطة n = مجموع مدد اللقطات قبلها (مسار واحد متصل في 001؛ الفجوات غير مسموحة). عدد إطارات التصدير المتوقع = `Σ(outFrame − inFrame)`.
- التحذير «أقصر من الحد الأدنى» (FR-009) يُحسب لا يُخزَّن.

### 1.4 Transcript و Word — `contracts/transcript.schema.json`

`Transcript = { provider, model, language, durationUs, words: Word[], createdAt, raw?: ref }`
`Word = { id, text, startUs, endUs, confidence (0..1 | null), lang?: "ar"|"en"|..., original?: text, correctedBy?: "user"|"auto" }`

- `original` يحفظ النص قبل أي تصحيح (FR-013: التراجع عن التصحيح التلقائي).
- علامة «منخفض الثقة» **لا تُخزَّن**؛ تُحسب عند العرض: `confidence !== null && confidence < providerProfile.lowConfidenceThreshold`. العتبة في ملف تعريف المزود (تُعاير بقياس WER)، والنمط يحمل فقط `captions.flagLowConfidence`. إن كانت كل القيم `null` تعرض الواجهة «هذا المزود لا يعطي ثقة لكل كلمة».
- الثوانٍ من المزود → `Math.round(s * 1e6)`؛ ElevenLabs `exp(logprob)`.

### 1.5 Proposal و ProposalItem

`Proposal = { id, createdAt, styleRef:{styleId,version}, items: ProposalItem[], totals:{ byReason:{silence,repeat,abandoned,filler}, savedUs }, state }`
`ProposalItem = { id, startUs, endUs, text, reason: "silence"|"repeat"|"abandoned"|"filler", ruleId, confidence?, state: "proposed"|"excluded"|"applied"|"blocked", blockedBy?: ruleId }`

- `reason` مجموعة مغلقة (FR-003). `ruleId` يشير إلى قاعدة النمط التي ولّدت البند (مثل `cut.silence.maxUs`).
- `blocked`: البند يخالف قاعدة إلزامية فلا يُطبَّق ويُعرض السبب (FR-009).

### 1.6 Correction (تصحيح)

`{ id, at, actor:"user", kind: "exclude_item"|"manual_edit"|"word_fix"|"exclude_all", proposalId?, itemId?, ruleId?, reason?: ProposalReason, quote: string, before?: any, after?: any }`

- `quote` = اقتباس ما تغيّر (النص المحذوف/المُبقى) — المادة الخام لـ«القاعدة كسابقة» (الدستور II).
- `manual_edit` يحمل `violates?: ruleId` إن كسر قاعدة إلزامية (يُسمح مع تحذير، FR-009).

### 1.7 Style و StyleVersion — `contracts/style.schema.json`

```text
Style (الرأس)            styles/<styleId>/style.json
├─ id, name, createdAt, basedOn?: {styleId, version}
├─ currentVersion: n
└─ versions[] (ملخص: n, date, reason)
StyleVersion (المحتوى)   styles/<styleId>/versions/<n>.json
├─ schemaVersion, styleId, version, date, reason, basedOnCorrections: correctionRef[]
├─ cut:      { silence.maxUs, repeats.enabled, repeats.similarity, minClipUs,
│              protectSentenceEdgesUs, fillers.words[],
│              repeatedRejectionThreshold (افتراضي 3، FR-011) }    ← كل حقل Rule
├─ captions: { enabled, font.family, font.sizePx, position, maxLines,
│              wordsPerChunk{min,max}, breakAtPauseUs, highlightCurrent,
│              highlightColor, textColor, bgColor, safeArea, lowConfidenceThreshold }  ← كل حقل Rule
├─ precedents[]: { id, ruleId, rule (جملة), quote (تصحيح المستخدم حرفياً), check (سؤال فحص), source, addedInVersion }
└─ styleGuide: string (نص حر للوكيل، مكمّل لا بديل)
Rule = { value, mode: "mandatory"|"preference", source: { kind:"default"|"user"|"learned", ref?, at }, note? }
```

- أقسام ثابتة (lemo) + كل حقل «كرت» له قيمة ووضع ومصدر (shotcraft) + schema يتحقق (huashu). حقلا **الإصدار** و**المصدر** إلزاميان (ما كان غائباً عند الثلاثة).
- `mode` يحسم التعارض: الإلزامي يمنع المقترح؛ التفضيل يرجّح فقط.
- المعرّفات `precedents[].id` لا يُعاد ترقيمها؛ التعديل يُضاف بإصدار جديد (shotcraft).
- الإصدار جديد عند أي حفظ (US3-1)؛ لا تحرير في مكانه.

### 1.8 StyleUpdateProposal

`{ id, createdAt, styleRef, trigger: { kind:"repeated_rejection", reason, count, correctionIds[] }, diff: [{ path, from, to }], newPrecedents: Precedent[], state: "pending"|"accepted"|"rejected", decidedAt? }`

- يُولَّد عند الموافقة على مقترح فيه ≥3 استثناءات بالسبب نفسه (SC-007). القبول = إصدار نمط جديد `reason = "learned"` + `basedOnCorrections`.

### 1.9 History (سجل التعديلات)

`snapshots/<seq>.json = { seq, at, actor:"user"|"agent", command: {name, params}, description, snapshot: Project }`

- لقطة كاملة **قبل** كل أمر (القرار 2). `undo` يستعيد `snapshot[seq]` ويدفع الحالة الحالية إلى مكدس الإعادة. المضغوط (gzip) اختياري لاحقاً.
- التراجع يستعيد **مستند المشروع فقط** (بما فيه تثبيت `{styleId, version}`)؛ إصدارات النمط في مكتبة المستخدم **لا تُحذف أبداً** بالتراجع، فتبقى نسخة نمط أُنشئت ثم تُرجع عنها في السجل كإصدار غير مستخدم.

### 1.10 CaptionCue (مشتق)

`{ id, startFrame, endFrame, wordIds[], lines: string[], fontSizePx, activeWordRects[] }` — يُشتق بدالة نقية `deriveCues(transcript, timeline, style.captions, fps)` ويُخزَّن في المشروع: التجميع وحجم الخط (fit) ومستطيلات الكلمات تُحسب داخل الأمر ولا تُعاد في الرسم، ليكون التصدير حتمياً ومطابقاً للمعاينة (بحث B §3). **قاعدة الإبطال:** كل أمر يغيّر `transcript` أو `timeline` أو `style.captions` أو `fps` (مثل `transcript.fixWord`، `clip.*`، `proposal.apply`، `style.setField(captions.*)`، `project.upgradeStyle`) يعيد الاشتقاق حتمياً ضمن تنفيذه؛ الاشتقاق يحتاج الخطوط المحمّلة وقياس النص، لذا تُنفَّذ الأوامر في الـrenderer (plan.md: Structure Decision).

### 1.11 Settings (خارج المشروع)

`settings.json`: `{ ui.lang:"ar"|"en", transcription: { mode:"cloud"|"local", provider, model, keyRef (اسم المفتاح لا قيمته), disclosures: [{provider, keyRef, acceptedAt}], sendLog: [{at, provider, audioDurationUs}] }, providerProfiles: { "<provider>/<model>": { lowConfidenceThreshold } }, encoder: { detectedAt, ffmpegVersion, gpu, h264: [...] } }`. المفاتيح نفسها مشفّرة بـ `safeStorage` (مفتاح التشفير في Keychain/DPAPI) في ملف منفصل داخل `userData`، لا في المشروع ولا في السجلات.

## 2. العلاقات

```text
Project 1─1 MediaSource
Project 1─1 Transcript 1─* Word
Project 1─* Clip  (كل Clip → MediaSource)
Project 1─* Proposal 1─* ProposalItem (→ ruleId في StyleVersion)
Project 1─* Correction (→ Proposal/Item/ruleId)
Project *─1 StyleVersion (تثبيت styleId+version)
Style 1─* StyleVersion 1─* Precedent
Project 1─* StyleUpdateProposal (→ Correction[])
Project 1─* HistoryEntry (snapshot)
```

## 3. الحالات

- **TranscriptJob:** `idle → extracting_audio → uploading → transcribing → done | failed` (مقطع ≤15 دقيقة = ملف صوت واحد ≈3.6MB فلا تقطيع)؛ عند الإغلاق أثناء العمل تُحفظ الحالة و`audioHash`، وعند الفتح: إن كانت نتيجة المزود غير مستردّة يُعاد من `extracting_audio` (FR-016).
- **Proposal:** `draft → reviewed (استثناءات) → applied | discarded`. `applied` يُنشئ أمر `proposal.apply` واحداً (لقطة واحدة للتراجع).
- **ProposalItem:** `proposed → excluded | applied | blocked`.
- **StyleUpdateProposal:** `pending → accepted | rejected`.
- **تثبيت النمط في المشروع:** `pinned(version n)` → عند وجود `n' > n` يظهر إشعار؛ `project.upgradeStyle` فقط يغيّره (US3-5).

## 4. قواعد التحقق (مختارة)

- أي أمر يُرفض إن أنتج مشروعاً لا يجتاز `project.schema.json` أو القيود البنيوية (§1.3).
- `proposal.apply` MUST يتحقق أن كل بند غير مستثنى لا يخالف قاعدة `mandatory`؛ المخالف يُعلَّم `blocked` ولا يُطبَّق (FR-009).
- `export.mp4` MUST يتحقق بعد الكتابة أن `nb_read_frames` (ffprobe `-count_frames`) ضمن ±1 من `Σ(outFrame − inFrame)` وأن مدة الصوت ضمن إطار من مدة الفيديو، وأن `captions.cues` ضمن حدود اللقطات.
- التفريغ: الكلمات مرتبة، `startUs < endUs`، لا تداخل، `confidence` ∈ [0,1].

## 5. قواعد مضافة من تحليل التناسق (2026-10-27)

- **VFR (القرار 13):** الإطار رقم `i` على شبكة المشروع الثابتة يُرسم من آخر إطار مصدر طابعه الزمني ≤ `i/fps` (أقرب سابق)؛ لا تكرار صناعي ولا تخطٍّ غير مبرَّر. `sourceIsVfr=true` يُعلَّم عند الاستيراد.
- **قياس النص:** `deriveCues` تستلم دالة `measure(text, font, dir) → rects` محقونة من الـrenderer؛ `core` لا يلمس DOM.
- **اللقطات:** المجلد `projects/<id>/snapshots/<seq>.json` (توحيد الاسم مع plan.md وtasks.md).
- **الأوامر:** 20 أمراً؛ `transcript.revertAutoFix` خارج 001 (القرار 21). `Word.correctedBy="auto"` محجوزة ولا تُكتب.
- **الحدود عند الاستيراد:** ≤15 دقيقة، ≤8GB، ≤1080p (القرار 24)؛ ما يتجاوزها يُرفض قبل أي معالجة برسالة تذكر الحد.
- **اتفاقية الدوران (2026-10-28، من T023):** `source.rotation` = قيمة `side_data.rotation` من ffprobe موحَّدة إلى 0/90/180/270 **عكس عقارب الساعة** (كما يعرّفها FFmpeg)؛ الوسم القديم `tags.rotate` (مع عقارب الساعة) يُعكس إلى الاتفاقية نفسها. `width/height` أبعاد المسار الخام قبل الدوران؛ `composeFrame` تدوّر بهذه الاتفاقية (جوال بورتريه حقيقي يعطي عادةً 270).
- **حد الدقة:** يُطبَّق على `min(width, height) ≤ 1080` فيقبل 1920×1080 و1080×1920 (القرار 24).
- **المعرّفات (مراجعة phase-2 #1/#3):** `project.id` و`style.styleId` و`styleRef.styleId` تطابق `^[A-Za-z0-9_-]{1,64}$` لأنها تصير أسماء مجلدات في `userData`؛ القناة IPC تعيد التحقق قبل الكتابة.

