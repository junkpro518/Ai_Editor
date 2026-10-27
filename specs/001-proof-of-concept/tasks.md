---

description: "Task list for feature 001 — إثبات تقني: مونتاج مقطع خام واحد بنمط واحد"
---

# Tasks: إثبات تقني — مونتاج مقطع خام واحد بنمط واحد

**Input**: Design documents from `/specs/001-proof-of-concept/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md (R1–R12), data-model.md, contracts/ (4 schemas), quickstart.md (Q1–Q9)

**Tests**: مطلوبة صراحة (الدستور «الاختبار أولاً» + طلب المالك): تُكتب قبل الكود وتفشل أولاً. اختبارات العربية، والمعاينة=التصدير، والتراجع بوابات إلزامية.

**Organization**: المهام مجمّعة حسب قصص المستخدم (US1 P1 ← US2 P2 ← US3 P3 ← US4 P4)، وقبلها مرحلة إعداد ومرحلة أساس تتضمن **مهمة القياس R10 كبوابة فيتو**. بعد كل مرحلة تنفيذ مهمة مراجعة أمنية (`security-audit`، وضع التوجيه). القبول على macOS.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: يمكن تنفيذها بالتوازي (ملفات مختلفة، بلا اعتماد على مهمة غير مكتملة)
- **[Story]**: قصة المستخدم (US1..US4) لمراحل القصص فقط
- كل مهمة تذكر مسار الملف بالضبط

## Path Conventions

حزمة واحدة (plan.md §Project Structure): `src/core` (نقي)، `src/main`، `src/preload`، `src/renderer`، `resources/`، `tests/{unit,contract,integration,e2e}`، `scripts/`، `docs/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: هيكل المشروع والأدوات والثنائيات المرخّصة

- [X] T001 إنشاء هيكل المشروع كما في plan.md: `package.json` (pnpm، `"type":"module"`)، `electron.vite.config.ts`، مجلدات `src/{core,main,preload,renderer}`، `resources/{ffmpeg,fonts,styles}`، `tests/{unit,contract,integration,e2e}`، `scripts/{acceptance,wer,ffmpeg-build,spike,fixtures}`، `docs/{licenses,security}`، `tests/fixtures/`
- [X] T002 تثبيت الاعتماديات بإصدارات مثبّتة (research.md R11): electron 45.x، electron-builder 26.18.x، react 19، electron-vite، typescript 5 (strict)، mp4box.js، ajv 8، write-file-atomic، ulid، vitest 3، @playwright/test؛ تسجيل كل واحدة مع ترخيصها في `docs/licenses/INVENTORY.md`
- [X] T003 [P] إعداد ESLint + Prettier مع قاعدة حدود الطبقات: `src/core/**` ممنوع من استيراد `electron`، `react`، `src/main/**`، `src/renderer/**` (eslint `no-restricted-imports`) في `eslint.config.js`
- [X] T004 [P] إعداد vitest (`vitest.config.ts`: بيئة node لـ`tests/unit` و`tests/contract`) وPlaywright-Electron (`playwright.config.ts` لـ`tests/e2e`) وسكربتات `pnpm test`، `pnpm test:e2e`، `pnpm dev`، `pnpm build`، `pnpm ffmpeg:fetch` (T005)، `pnpm acceptance:parity` (T042)، `pnpm fixtures:fetch` (T095)
- [X] T005 [P] سكربت جلب FFmpeg لويندوز: `scripts/ffmpeg-build/fetch-win.sh` ينزّل BtbN `win64-lgpl` من وسم بتاريخ مثبّت، يتحقق من SHA-256 المثبّت، يفك إلى `resources/ffmpeg/win32-x64/` مع `COPYING.LGPLv3` (research.md R4)؛ ونفس السكربت يجلب `linux64-lgpl` إلى `resources/ffmpeg/linux-x64/` **للتطوير وCI فقط** (مستثنى من الحزمة في electron-builder)
- [ ] T006 [P] *(السكربت مكتوب 2026-10-28؛ التنفيذ والتحقق يحتاجان ماك المالك)* سكربت بناء FFmpeg لماك: `scripts/ffmpeg-build/build-mac.sh` يبني ffmpeg/ffprobe من نفس فرع الإصدار بـ`--enable-version3` بدون `--enable-gpl`، مع libopus وzimg وh264_videotoolbox وaac، ويتحقق أن `ffmpeg -buildconf` لا يحوي `--enable-gpl`، ويخرج إلى `resources/ffmpeg/darwin-{arm64,x64}/` + `LICENSES/`
- [X] T007 [P] نسخ خطوط OFL إلى `resources/fonts/` (IBM Plex Sans Arabic كافتراضي، Cairo، Tajawal، Noto Sans Arabic، Noto Naskh Arabic) مع ملفات `OFL.txt` وتسجيلها في `docs/licenses/INVENTORY.md`
- [X] T008 [P] نسخ مخططات العقود إلى المصدر ومولّد الأنواع: `scripts/gen-types.ts` يولّد `src/core/contracts/types.ts` من `specs/001-proof-of-concept/contracts/*.schema.json` (json-schema-to-typescript، MIT) ويبني validators بـ ajv في `src/core/contracts/validate.ts`
- [X] T009 [P] إعداد CI (`.github/workflows/ci.yml`): Linux لوحدات/عقود/تكامل؛ macOS لبناء FFmpeg (T006) وe2e وسكربت التطابق؛ بلا مفاتيح API في CI
- [X] T010 [P] إعداد electron-builder (`electron-builder.yml`): هدف macOS dmg (arm64 + x64) مع hardened runtime لثنائيات FFmpeg، وهدف Windows nsis مؤجل التوقيع (القرار 16)؛ استثناء `resources/ffmpeg/linux-x64/` من الحزمة؛ ملف `docs/licenses/THIRD-PARTY.md` يُولَّد من الجرد
- [ ] T095 [P] *(المولَّدة جاهزة 2026-10-28؛ مقطعا الكلام وHEVC الجوال بانتظار المالك)* تجهيز عيّنات الاختبار في `tests/fixtures/` (القرار 25؛ رقم خارج التسلسل أُضيف في تحليل التناسق): البحث عن مقاطع حديث عربي خليجي/مخلوط بترخيص CC-BY أو CC0 (`talk-ar-10min.mp4` 1080p30 و`talk-ar-2min-mixed.mp4`) وعرض المرشحين على المالك قبل الاعتماد؛ توليد `music-only.mp4` و`long-16min.mp4` و`phone-4k.mp4` بـFFmpeg؛ `phone-vfr-hevc.mov` من جوال؛ الملفات الكبيرة خارج git (`.gitignore` + `scripts/fixtures/fetch.sh` بالبصمات SHA-256) و`tests/fixtures/README.md` بالمصدر والترخيص لكل ملف

---

## Phase 2: Foundational (Blocking Prerequisites + Spike R10)

**Purpose**: البنية المشتركة التي تعتمد عليها كل القصص، ومهمة القياس التي قد تُوقف Electron

**⚠️ CRITICAL**: لا تبدأ أي قصة قبل اكتمال هذه المرحلة وقبل تسجيل قرار «استمرار» في T034

### Tests (تُكتب أولاً وتفشل)

- [X] T011 [P] اختبارات الزمن في `tests/unit/core/time.test.ts`: `usToFrame`/`frameToSeconds` بكسر 30000/1001 بلا انزلاق، `nearestStandardFps` (24000/1001، 24، 25، 30000/1001، 30، 50، 60000/1001، 60)، `expectedFrames(clips) = Σ(outFrame − inFrame)`
- [X] T012 [P] اختبارات العقود في `tests/contract/schemas.test.ts`: fixtures صالحة وغير صالحة لكل من `project`، `style`، `transcript`، `commands` (مثل `durationUs > 900000000` يُرفض، `outFrame ≤ inFrame` يُرفض، `mode` خارج `mandatory|preference` يُرفض)
- [X] T013 [P] اختبارات سجل الأوامر في `tests/unit/core/commands/registry.test.ts`: كل أمر من الـ20 مسجّل، التحقق من المعاملات قبل التنفيذ، الأمر `undoable` يأخذ لقطة، الناتج يجتاز `project.schema.json`، التنفيذ نقي (نفس المدخل = نفس المخرج)
- [X] T014 [P] اختبارات التخزين في `tests/integration/storage.test.ts`: حفظ ذري (ملف مؤقت ثم rename)، `.bak` عند فشل التحليل، لقطات `snapshots/<seq>.json`، حد 200 مدخل مع طيّ الأقدم (FR-015)
- [X] T015 [P] اختبارات FFmpeg في `tests/integration/ffmpeg.test.ts` على عينات صغيرة في `tests/fixtures/`: `probe()` يرجع fps ككسر وrotation وhasAudio وframeCount بـ`-count_frames`، رفض >15 دقيقة/>8GB/>1080p قبل المعالجة (القرار 24)، `spawn` بمصفوفة وسائط و`file:` و`-protocol_whitelist file,pipe`، تحليل `-progress pipe:1`، الإلغاء يحذف الناتج
- [X] T016 [P] اختبار الأسرار في `tests/integration/secrets.test.ts`: `safeStorage` غير المتزامن، الرفض على Linux بلا secret store (`basic_text`)، المفتاح لا يظهر في أي ناتج IPC ولا في السجلات

### Implementation

- [X] T017 [P] `src/core/time.ts`: الكسر `{num,den}`، `usToFrame`، `frameToSeconds` (نص بست خانات)، `nearestStandardFps`، `expectedFrames`
- [X] T018 [P] `src/core/contracts/`: الأنواع المولَّدة (T008) + `validateProject/Style/Transcript/CommandParams`
- [X] T019 `src/core/commands/registry.ts`: تحميل `commands.schema.json`، `execute(project, name, params, actor)` → تحقق ← لقطة (إن `undoable`) ← تنفيذ نقي ← تحقق المخرج ← حدث؛ وملف لكل أمر في `src/core/commands/<name>.ts` كهياكل تُملأ في القصص
- [X] T020 [P] `src/core/history/snapshots.ts`: مكدسا التراجع/الإعادة بلقطات كاملة، حد 200، تسلسل `seq`، الفاعل والوصف
- [X] T021 [P] `src/main/storage/`: `projects.ts` (`userData/projects/<id>/project.json` + `snapshots/` + `cache/`)، `styles.ts` (`userData/styles/<id>/v<n>.json` بلا تعديل في المكان)، `settings.ts`، كلها بـ`write-file-atomic` + `.bak`
- [X] T022 [P] `src/main/secrets.ts`: `safeStorage` async فقط، ملف `userData/secrets.enc`، فك التشفير لحظة الطلب داخل main فقط، `keyRef` بالاسم + آخر 4 أحرف للعرض (القرار 18)
- [X] T023 [P] `src/main/ffmpeg/process.ts` (spawn آمن، تقدم، إلغاء، مهلة) و`src/main/ffmpeg/probe.ts` (ffprobe → `MediaSource` مع `frameCount`، `sourceIsVfr`، `rotation`، رفض >15 دقيقة/>8GB/>1080p، القرار 24) و`src/main/ffmpeg/encoders.ts` (كشف `-encoders` + ترميز تجريبي ثانية لكل مشفّر عتادي، تخزين النتيجة في settings)
- [X] T024 `src/preload/index.ts` + `src/main/ipc.ts`: سطح IPC محصور في persist/ffmpeg/secrets/providers (لا أوامر مونتاج في main)، `contextIsolation` مفعّل، `nodeIntegration` معطّل، `protocol.handle('media')` لخدمة ملفات المصدر للقراءة فقط
- [X] T025 [P] `src/renderer/commands/runtime.ts`: يشغّل `core/commands` في الـrenderer، يحفظ عبر IPC بعد كل أمر (debounce قصير)، يبث الحالة لـReact
- [X] T026 [P] هيكل الواجهة RTL: `src/renderer/App.tsx`، `i18n/{ar,en}.json` مع تبديل اللغة وتنسيق الأرقام/التواريخ حسب اللغة (FR-018)، شريط تنقل بين الشاشات، نافذة تأكيد عامة للأوامر `confirm: true`
- [X] T027 `src/renderer/player/demux.ts` (mp4box.js → عينات) و`player/decoder.ts` (WebCodecs `VideoDecoder`، `VideoFrame.close()` إلزامي، إعادة الفتح عند الـseek) و`player/audio.ts` (مسار الصوت عبر `<audio>`/`AudioContext` متزامن مع الإطار)
- [X] T028 `src/core/captions/compose.ts` الإصدار الأول: `composeFrame(ctx, frameIndex, source, cues, style, fonts)` يرسم الفيديو فقط بدقة المصدر على OffscreenCanvas (الكابشن في US2)؛ `src/renderer/player/preview.ts` يعرض الناتج مصغّراً
- [X] T029 `src/renderer/screens/Import.tsx` + أمر `project.import` في `src/core/commands/project.import.ts`: اختيار ملف ← probe ← إنشاء `project.json` بـ`seed` وبصمة الوسائط ← عرض أول إطار خلال ≤5 ثوانٍ ← رسالة الرفض لـ>15 دقيقة/>8GB/>1080p (القرار 24)
- [X] T030 النمط الافتراضي `resources/styles/default-v1.json` بالقيم في spec.md §Assumptions وplan.md §Assumptions (صمت 700ms، لقطة 500ms، حواف 120ms، `repeatsSimilarity` 0.8، قائمة الحشو الافتراضية، `repeatedRejectionThreshold` 3، 3–5 كلمات، وقفة 150ms، IBM Plex Sans Arabic 78px، منطقة آمنة 80%) يجتاز `style.schema.json`، وتثبيته في المشروع عند الاستيراد

### Spike R10 (بوابة فيتو — research.md R10، القرار 15)

- [X] T031 `scripts/spike/measure.ts` + `scripts/spike/README.md`: S1 حجم المثبّت، S2 الإقلاع والذاكرة، S3 ذاكرة المعاينة لـ15 دقيقة 1080p، S4 `VideoDecoder.isConfigSupported` (H.264، HEVC آيفون، HDR 10-bit، VFR) **وهل رسم `VideoFrame` من مصدر HDR على canvas SDR يحوّل الألوان تلقائياً** (يحدد مسار HDR في T050/T086)، S5 `VideoEncoder.isConfigSupported('avc1.640028')` عتادي/برمجي، S8 زمن `-count_frames`، S11 رسم نص عربي مختلط ومقارنة
- [X] T032 تجربة التصدير الأولية (S9/S10) في `scripts/spike/export-spike.ts`: مقطع 2 دقيقة 1080p30 → decode → `composeFrame` (بكابشن تجريبي عربي ثابت) → `VideoEncoder` → Annex-B عبر stdin إلى FFmpeg `-c:v copy -c:a aac` → قياس السرعة (≥1.0× الزمن الحقيقي) وفحص ±1 إطار؛ وإن غاب مشفّر Chromium: المسار الاحتياطي rawvideo → مشفّر FFmpeg عتادي
- [ ] T033 *(يحتاج ماك المالك؛ الأوامر في scripts/spike/README.md)* S6/S7/S12 على ماك: بناء FFmpeg LGPL في CI (T006)، قائمة المشفّرات الفعلية + ترميز تجريبي، تجربة توقيع + notarization جافة لحزمة فيها ffmpeg
- [X] T034 تسجيل النتائج في `specs/001-proof-of-concept/measurements.md` مع قرار **استمرار / فيتو** لكل عتبة (القرار 15) وتاريخ، وتثبيت عتبة PSNR/SSIM الأولية لفحص التطابق (FR-014)؛ عند أي فيتو: التوقف والعودة للمالك قبل المرحلة 3

### متابعات من مهمة القياس (أُضيفت 2026-10-28 بعد T034)

- [ ] T096 استبدال `-count_frames` في `src/main/ffmpeg/probe.ts` بعدّ سريع: `-count_packets` (`nb_read_packets` للمسار v:0) أو جدول عينات mp4box، مع إبقاء `-count_frames` لفحص التطابق بعد التصدير فقط (T042)؛ تحديث `tests/integration/ffmpeg.test.ts` والقياس S8 في `measurements.md`. السبب: 94 ثانية لمقطع 15 دقيقة (×3 عتبة R10 S8) وتعطيل FR-001 (≤5 ثوانٍ)
- [ ] T097 تحقيق نمو ذاكرة الـrenderer (418→1000 MB خلال 60 بحثاً) في `src/renderer/player/decoder.ts`: إغلاق كل `VideoFrame`، حجم طابور الفك، إعادة الاستخدام؛ قياس قبل/بعد في `measurements.md` S3 قبل قياس الماك
- [ ] T098 في T050: اختيار مستوى H.264 من الدقة (L4.0 لـ1080p؛ `isConfigSupported` يرفض L3.1 عند 1080p)، وضبط نطاق الألوان في الدمج (ناتج Chromium `yuvj420p` full-range) أو التحقق من تشغيله الصحيح على Safari/Chrome/جوال (R3 الطبقة 4)

### Security review

- [X] T035 مراجعة أمنية (مهارة `security-audit`، وضع التوجيه) لكود المرحلتين 1–2: حدود IPC، spawn بلا shell، `file:` + whitelist، الأسرار، `protocol.handle` للقراءة فقط؛ إصلاح النتائج المؤكدة وتسجيل «لا نتائج» إن لم توجد في `docs/security/phase-2.md`

**Checkpoint**: الأساس جاهز وقرار «استمرار» مسجَّل في measurements.md

---

## Phase 3: User Story 1 — من مقطع خام إلى فيديو مقصوص بموافقتي (Priority: P1) 🎯 MVP

**Goal**: استيراد ← تفريغ سحابي بإفصاح ← مقترح قص مبرَّر ← استماع ← استثناء ← موافقة ← تايم لاين قابل للتعديل ← تصدير MP4 مطابق

**Independent Test**: quickstart Q1، Q2، Q3، Q4، Q6 (بلا كابشن) على `talk-ar-10min.mp4`: الملف الناتج أقصر بالمقدار المعلن ويجتاز `scripts/acceptance/parity.ts`

### Tests for User Story 1 ⚠️ (تُكتب أولاً وتفشل)

- [ ] T036 [P] [US1] `tests/unit/core/transcript/normalize.test.ts`: التطبيع العربي (NFKC، حذف التشكيل U+064B–U+0652 وU+0670، التطويل، `أإآٱ→ا`، `ؤ→و`، `ئ→ي`، `ة→ه`، `ى→ي`، الأرقام المشرقية→غربية، الترقيم→مسافة، اللاتيني→صغير؛ لا حذف «ال» ولا فصل «و»)
- [ ] T037 [P] [US1] `tests/contract/providers.test.ts`: استجابات مسجّلة من Deepgram (`ar-SA` و`multi`) وElevenLabs (`scribe_v2` مع `spacing`/`audio_event` تُحذف، `exp(logprob)`) → `transcript.schema.json`، ثوانٍ → `Math.round(s*1e6)`، `confidence` null عند غيابها، `modelParams` يحوي `mip_opt_out=true`
- [ ] T038 [P] [US1] `tests/unit/core/proposal/*.test.ts`: `silence` (فجوة بين كلمتين > `silenceMaxUs` مع حماية الحواف)، `repeats` (Jaccard على الكلمات المطبَّعة ≥ `repeatsSimilarity` لجملتين متتاليتين → حذف الأولى)، `fillers` (قائمة النمط، كلمة كاملة فقط)، `abandoned` (مقطع قصير يليه صمت ثم بداية مشابهة)، `totals` (عدد لكل سبب + `savedUs`)، `minClipUs` يمنع لقطة أقصر، `blocked` عند مخالفة قاعدة `mandatory`
- [ ] T039 [P] [US1] `tests/unit/core/commands/proposal.test.ts`: `proposal.exclude` يغيّر حالة البند، `proposal.apply` يطبّق غير المستثنى وغير المحظور فقط كـ`clip.*` في لقطة واحدة، ينشئ `corrections[]` بـ`quote` و`reason` و`ruleId`، `exclude_all` عند استثناء الكل، حالة المقترح `applied`
- [ ] T040 [P] [US1] `tests/unit/core/commands/clip.test.ts`: `split/trim/move/delete` بالإطارات، لا تداخل ولا فجوات، `timelineStartFrame` يُعاد حسابه، تحذير `below_min_clip` و`violates_mandatory_rule` مع تسجيل `correction.manual_edit`
- [ ] T041 [P] [US1] `tests/e2e/us1-import-propose-apply-export.spec.ts` (Playwright-Electron، استجابة مزود مسجّلة): Q1→Q3→Q4→Q6 بلا كابشن، 0 قصّات قبل الموافقة (SC-005)
- [ ] T042 [P] [US1] `scripts/acceptance/parity.ts` + `tests/integration/parity.test.ts`: 20 زمناً ببذرة ← hash تركيب المعاينة = hash تركيب التصدير؛ فك MP4 وPSNR/SSIM مع فحص ±1؛ `nb_read_frames` ضمن ±1 من `expectedFrames`؛ مدة الصوت ضمن إطار؛ ضابط بلا كابشن؛ تقرير JSON + 20 صورة هي نفسها ما يراجعه الإنسان (SC-002، research.md R3)

### Implementation for User Story 1

- [ ] T043 [P] [US1] `src/main/ffmpeg/audio.ts`: استخراج الصوت للرفع (`-map 0:a:0 -vn -sn -dn -ac 1 -ar 16000 -c:a libopus -b:a 32k -map_metadata -1` → `cache/audio.webm`) + `audioSha256`، والحذف بعد نجاح التفريغ (FR-017)
- [ ] T044 [P] [US1] `src/main/providers/http.ts` + `deepgram.ts` + `elevenlabs.ts`: REST بـ`fetch` من main، المفتاح يُفك لحظة الطلب، `mip_opt_out=true` دائماً، مهلة وإعادة محاولة 3 مرات، أخطاء مصنّفة (اتصال/مفتاح/رصيد/مزود) (FR-017)
- [ ] T045 [P] [US1] `src/core/transcript/providers/{deepgram,elevenlabs}.ts` + `normalize.ts`: التحويل إلى العقد الموحد (T037) والتطبيع (T036)
- [ ] T046 [US1] `src/renderer/screens/Settings.tsx` (مزود، نموذج، إدخال المفتاح → secrets، سجل الإرسالات، حذف المفتاح) و`src/renderer/screens/Disclosure.tsx` (ماذا يُرسَل/إلى من/بأي مفتاح، موافقة لكل مزود+مفتاح) وأمر `transcript.request` في `src/core/commands/transcript.request.ts` مع حالة `transcriptJob` واستئناف FR-016
- [ ] T047 [US1] `src/core/proposal/{silence,repeats,fillers,abandoned,totals}.ts` + `src/core/proposal/generate.ts` + أمر `proposal.request` (يقرأ النمط المثبّت، يعلّم `blocked` و`localOnly`)
- [ ] T048 [US1] `src/renderer/screens/Proposal.tsx`: قائمة البنود (زمن، نص، سبب، إجماليات لكل سبب والوقت الموفَّر)، استثناء بالنقر، **وضعا الاستماع** (تشغيل المشروع مع تخطّي المقترح + تشغيل البند وحده، القرار 22)، زر موافقة بتأكيد ← `proposal.apply`؛ وأمر `proposal.discard`
- [ ] T049 [US1] أوامر `clip.split/trim/move/delete` في `src/core/commands/clip.*.ts` + `src/renderer/screens/Timeline.tsx`: لقطات قابلة للسحب والقص والتمديد، مسار صوت متزامن، تحذير مرئي يبقى على اللقطة المخالفة (FR-009)، اختصارات (مسافة، الأسهم)
- [ ] T050 [US1] `src/renderer/export/encoder.ts` (WebCodecs `VideoEncoder` avc1 prefer-hardware → Annex-B) و`src/main/ffmpeg/mux.ts` (`-f h264 -r <fps> -i pipe:0` + صوت مقصوص حسب EDL بالثواني الكسرية + `-c:a aac -movflags +faststart -fps_mode cfr`) + المسار الاحتياطي `rawvideo` → مشفّر عتادي؛ فرع `-an` لمصدر بلا مسار صوت؛ مصادر HDR/10-bit: إن حوّلها Chromium تلقائياً (نتيجة T031 S4) تمر بالمسار الرئيسي، وإلا بالمسار الاحتياطي مع `zscale`؛ رسالة الرفض عند غياب مشفّر (القرار 14)
- [ ] T051 [US1] `src/renderer/screens/Export.tsx` + أمر `export.mp4`: اختيار المكان والاسم (افتراضي `<اسم المصدر>-edited.mp4` في مجلد المصدر)، تأكيد الاستبدال، تقدم وإلغاء يحذف الناقص، فحص التطابق بعد التصدير (T042) ونتيجته للمستخدم (FR-014)
- [ ] T052 [US1] الحالات الحدّية لـUS1: ملف بلا كلام (مقترح فارغ برسالة)، ملف بلا مسار صوت (تفريغ ومقترح معطّلان)، بلا اتصال (رسالة بما يحتاج اتصالاً)، إغلاق أثناء التفريغ (استئناف/إعادة)، نقل ملف المصدر (إعادة ربط بالبصمة) في `src/renderer/screens/Import.tsx` و`src/core/commands/transcript.request.ts`
- [ ] T053 [US1] مراجعة أمنية (`security-audit`، وضع التوجيه) لكود US1: إرسال الصوت فقط، المفتاح لا يغادر main، أسماء الملفات في وسائط FFmpeg، نص التفريغ كمدخل غير موثوق في الواجهة؛ تسجيل النتائج في `docs/security/us1.md`

**Checkpoint**: US1 تعمل من البداية للنهاية وتجتاز Q1/Q2/Q3/Q4/Q6 وsc-002/005/008/009 (بلا كابشن)

---

## Phase 4: User Story 2 — كابشن عربي صحيح أراجعه كحوار (Priority: P2)

**Goal**: كابشن كلمة-بكلمة من النمط، عربي صحيح (اتصال، RTL، خلط)، مراجعة الكلمات غير المؤكدة، حرق مطابق للمعاينة

**Independent Test**: quickstart Q5 على `talk-ar-2min-mixed.mp4` + Q6 مع الكابشن + `pnpm test:e2e --grep arabic`

### Tests for User Story 2 ⚠️

- [ ] T054 [P] [US2] `tests/unit/core/captions/chunking.test.ts`: مجموعات 3–5 كلمات (افتراضي)، كسر عند نهاية جملة أو وقفة ≥`breakAtPauseUs` أو حد الكلمات، مجموعة واحدة في وقت واحد، تفتح عند/قبل أول كلمة وتغلق عند/بعد آخرها، الربط بالموضع لا بالنص، حتمية (نفس المدخل = نفس المخرج)
- [ ] T055 [P] [US2] `tests/unit/core/captions/derive.test.ts`: `deriveCues` يعيد الاشتقاق عند تغيّر `transcript`/`timeline`/`style.captions`/`fps` (قاعدة الإبطال) ويحوّل الأزمنة إلى إطارات على شبكة المشروع، ويحذف الكلمات الواقعة في أجزاء مقصوصة
- [ ] T056 [P] [US2] `tests/e2e/arabic.spec.ts` (Playwright-Electron، فحوص دلالية، research.md R6): اتصال الحروف، ترتيب مستطيلات RTL، كلمة إنجليزية داخل الجملة في موضعها وبحروف LTR، أرقام لا تنقلب (25 لا 52، غربية ومشرقية)، لام-ألف مستطيل واحد، التفاف عند حد كلمة، إبراز كلمة في سطر مختلط، تشكيل لا يزحزح العرض
- [ ] T057 [P] [US2] `tests/unit/core/commands/transcript.test.ts`: `transcript.fixWord` يحفظ `original` ويعلّم `correctedBy=user` ويسجّل `correction.word_fix` ويعيد اشتقاق الكابشن؛ `captions.toggle` يرفض بلا تفريغ
- [ ] T058 [P] [US2] توسيع `tests/integration/parity.test.ts` ليشمل الكابشن المحروق: hash المعاينة = hash التصدير مع كابشن عربي مختلط، وعدم وجود إزاحة زمنية (أفضل إزاحة = 0)

### Implementation for User Story 2

- [ ] T059 [P] [US2] `src/renderer/fonts.ts`: تحميل خطوط `resources/fonts` بـ`FontFace` و`document.fonts.ready` قبل الإطار 0؛ منع خطوط النظام
- [ ] T060 [P] [US2] `src/core/captions/chunking.ts` (T054) و`src/core/captions/derive.ts` (T055) بإرجاع `CaptionCue{startFrame,endFrame,wordIds,lines,fontSizePx,activeWordRects}`
- [ ] T061 [US2] `src/core/captions/layout.ts`: `fitFontSize` (أساس 78، أدنى 42، خطوة 2، maxWidth 1600/900) ومستطيلات الكلمات عبر دالة قياس `measure(text, font, dir) → rects` **تُحقن من الـrenderer** (تنفيذها في `src/renderer/captions/measure.ts` بـ`Range.getClientRects()` على عنصر مخفي بنفس الخط والاتجاه، أو `TextMetrics.getSelectionRects()` إن توفر — حسب الـspike) حتى يبقى `core` بلا DOM (T003)، محسوبة مرة واحدة داخل الأمر
- [ ] T062 [US2] توسيع `src/core/captions/compose.ts`: رسم المجموعة كاملة `direction='rtl'` بلون النص، scrim حسب السطوع، ثم إعادة الرسم بلون الإبراز مقصوصاً على مستطيل الكلمة النشطة؛ **ممنوع** تقسيم النص حرفاً-حرفاً أو عكس السلاسل؛ الموضع من النمط والمنطقة الآمنة
- [ ] T063 [US2] أوامر `captions.toggle`، `transcript.fixWord` في `src/core/commands/` + ربط قاعدة الإبطال في كل أمر يغيّر التفريغ/التايم لاين/النمط
- [ ] T064 [US2] `src/renderer/screens/WordReview.tsx`: قائمة الكلمات منخفضة الثقة (عتبة ملف تعريف المزود؛ رسالة «هذا المزود لا يعطي ثقة لكل كلمة» عند null)، بدائل المزود إن وُجدت أو حقل كتابة، عدّاد الكلمات المصحَّحة والتراجع عن كل تصحيح، بلا تصحيح تلقائي (القرار 21)
- [ ] T065 [US2] عرض الكابشن في `src/renderer/player/preview.ts` متزامناً بالإطار مع إبراز الكلمة الحالية، ولوحة أسلوب الكابشن المصغّرة (خط/حجم/موضع/أسطر) تقرأ من النمط المثبّت
- [ ] T066 [US2] مراجعة أمنية (`security-audit`، وضع التوجيه) لكود US2: نص التفريغ والبدائل كمدخل غير موثوق في الرسم والواجهة (لا HTML injection عبر innerHTML في عنصر القياس)؛ `docs/security/us2.md`

**Checkpoint**: US1 + US2 تعملان؛ SC-004 يتحقق بعينة 200 كلمة بالتركيب المحدد في spec.md §Assumptions

---

## Phase 5: User Story 3 — نمط واحد أعدّله وأرى أثره، وتصحيحاتي تُلتقط (Priority: P3)

**Goal**: لوحة نمط بحقول منظّمة وإلزامي/تفضيل، إصدارات مرقّمة في مكتبة المستخدم، تثبيت في المشروع، اقتراح تحديث النمط من التصحيحات بموافقة

**Independent Test**: quickstart Q7: تغيير عتبة الصمت يغيّر المقترح وينشئ إصداراً؛ رفض 3 بنود بسبب واحد يُظهر اقتراح تحديث؛ القبول يُنشئ إصداراً `learned` والمشروع يبقى مثبّتاً حتى الترقية

### Tests for User Story 3 ⚠️

- [ ] T067 [P] [US3] `tests/unit/core/style/library.test.ts`: إنشاء إصدار جديد عند كل حفظ (لا تعديل في المكان)، `versions[]` مرتبة مع تاريخ وسبب، `style.rollback` يُنشئ إصداراً جديداً بمحتوى قديم، الإصدارات لا تُحذف بالتراجع
- [ ] T068 [P] [US3] `tests/unit/core/style/rules.test.ts`: `mandatory` يمنع بند المقترح ويعلّمه `blocked` مع `blockedBy`؛ `preference` يرجّح فقط؛ التعديل اليدوي المخالف يُسمح مع تصحيح `kind=manual_edit` وحقل `violates=ruleId`
- [ ] T069 [P] [US3] `tests/unit/core/style/learn.test.ts`: بعد `proposal.apply` مع ≥3 استثناءات بالسبب نفسه (حقل النمط `cut.repeatedRejectionThreshold`، افتراضي 3) يُنشأ `StyleUpdateProposal` بـ`trigger.correctionIds` و`diff` (مثل رفع `silenceMaxUs`) و`newPrecedents` (rule + quote + check + source)؛ أقل من 3 لا يُنشئ شيئاً لكن يُحتسب لاحقاً؛ القبول = إصدار `reason="learned"` + `basedOnCorrections`؛ الرفض لا يغيّر النمط (SC-007)
- [ ] T070 [P] [US3] `tests/unit/core/commands/style.test.ts`: `style.setField` (مسار `^(cut|captions)\.[a-zA-Z]+$`، إصدار جديد، تثبيت المشروع عليه، إعادة اشتقاق الكابشن إن كان المسار `captions.*`)، `project.upgradeStyle` (يلغي المقترح غير المطبَّق ويعيد الاشتقاق كأمر واحد)، إشعار وجود إصدار أحدث لا يغيّر شيئاً تلقائياً
- [ ] T071 [P] [US3] `tests/e2e/us3-style.spec.ts`: Q7 كاملاً

### Implementation for User Story 3

- [ ] T072 [P] [US3] `src/core/style/library.ts` (قراءة/إنشاء إصدارات عبر IPC storage، `currentVersion`، `availableVersion` عند الفتح) و`src/core/style/rules.ts` (تقييم `mandatory|preference`، دمج القيم في مولّد المقترح)
- [ ] T073 [US3] `src/core/style/learn.ts`: تجميع التصحيحات حسب `reason`/`ruleId`، حساب `diff` المقترح (قواعد بسيطة لكل سبب: صمت → رفع العتبة إلى أقصر صمت مرفوض؛ حشو → إزالة الكلمة من القائمة؛ إعادة → رفع `repeatsSimilarity`)، بناء `Precedent{rule, quote, check, source}`؛ ويُستدعى من `proposal.apply`
- [ ] T074 [US3] أوامر `style.setField`، `style.updateProposal.accept/reject`، `style.rollback`، `project.upgradeStyle` في `src/core/commands/`
- [ ] T075 [US3] `src/renderer/screens/StylePanel.tsx`: حقول `cut` و`captions` بأنواعها (مدة، نسبة، قائمة كلمات، خط، لون، موضع) مع مفتاح إلزامي/تفضيل لكل حقل وعرض `source` (افتراضي/أنت/متعلَّم) وسجل الإصدارات مع «رجوع» وإشعار «إصدار أحدث متاح — ترقية؟»
- [ ] T076 [US3] `src/renderer/screens/StyleUpdate.tsx`: عرض اقتراح التحديث (الفرق + التصحيحات الثلاثة المقتبسة + السوابق الجديدة) بزرّي قبول (تأكيد) ورفض
- [ ] T077 [US3] مراجعة أمنية (`security-audit`، وضع التوجيه) لكود US3: اقتباسات التصحيح كمدخل غير موثوق، مسارات ملفات الأنماط داخل `userData` فقط؛ `docs/security/us3.md`

**Checkpoint**: الفرضية المميزة تعمل: تصحيح ← اقتراح تحديث ← موافقة ← إصدار

---

## Phase 6: User Story 4 — كل شيء يُتراجَع عنه (Priority: P4)

**Goal**: تراجع/إعادة لكل تعديل (وكيل أو يدوي) بلقطات كاملة، سجل يبيّن الفاعل، يبقى بعد إعادة الفتح

**Independent Test**: quickstart Q8: 20 تعديلاً مختلطاً ثم 20 تراجعاً → hash المستند يطابق الحالة الأولى

### Tests for User Story 4 ⚠️

- [ ] T078 [P] [US4] `tests/unit/core/history/undo.test.ts`: ترتيب التراجع/الإعادة، أمر جديد بعد تراجع يمسح مكدس الإعادة، `history.undo/redo` غير `undoable`، تراجع `proposal.apply` يعيد اللقطات والتصحيحات والكابشن والتثبيت كلها
- [ ] T079 [P] [US4] `tests/e2e/undo.spec.ts`: 20 تعديلاً مختلطاً (وكيل: مقترح؛ يدوي: قص/تحريك/تصحيح كلمة/تغيير نمط) ثم 20 تراجعاً = الحالة الأولى (SC-006)؛ إغلاق وإعادة فتح يحتفظ بالسجل؛ الحد 200

### Implementation for User Story 4

- [ ] T080 [US4] أوامر `history.undo` و`history.redo` في `src/core/commands/` فوق `core/history/snapshots.ts` مع استعادة فورية للمعاينة (إعادة بناء cues من المستند المستعاد بلا اشتقاق)
- [ ] T081 [US4] `src/renderer/screens/History.tsx`: قائمة التعديلات (وقت، فاعل «أنا/الوكيل»، وصف)، أزرار تراجع/إعادة واختصارات ⌘Z/⇧⌘Z
- [ ] T082 [US4] حفظ السجل على القرص (`snapshots/`) واستعادته عند الفتح في `src/main/storage/projects.ts` و`src/renderer/commands/runtime.ts`
- [ ] T083 [US4] مراجعة أمنية (`security-audit`، وضع التوجيه) لكود US4: حجم اللقطات وDoS ذاتي، سلامة الاستعادة من ملفات معدَّلة يدوياً (التحقق بالمخطط قبل الاستعادة)؛ `docs/security/us4.md`

**Checkpoint**: القصص الأربع تعمل مستقلة

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: القياسات المنشورة، الحالات الحدّية المتبقية، القبول على macOS

- [ ] T084 [P] `scripts/wer/normalize.py` + `scripts/wer/run.py` (jiwer، تطوير فقط): تشغيل البروتوكول (research/A-transcription.md) على المرشحين الأربعة × 3 فئات، معايرة عتبة الثقة لكل مزود، تقرير في `specs/001-proof-of-concept/measurements.md`؛ تحديث الافتراضي في `resources/providers.json` إن فاز غير Deepgram (SC-003)
- [ ] T085 [P] تجهيز مجموعة الاختبار: تسجيلات المالك (≈20 دقيقة خليجي + مخلوط) + Common Voice Arabic (CC0) في `tests/fixtures/wer/` مع نصوص مرجعية (مسودة من الوكيل، مراجعة المالك) — القرار 20
- [ ] T086 [P] الحالات الحدّية المتبقية: الدوران من بيانات الجوال في `composeFrame`، HDR/10-bit → SDR في المسار الاحتياطي فقط (`zscale` على rawvideo في `src/main/ffmpeg/mux.ts`؛ المسار الرئيسي حسب نتيجة T031 S4)، تعدد مسارات الصوت (الأول)، VFR → أقرب معدل معياري مع `sourceIsVfr` (القرار 13)، تقدير المساحة المؤقتة (FR-019)
- [ ] T087 [P] وضع عدم الاتصال: فحص الشبكة قبل `transcript.request` فقط، رسائل واضحة لما يحتاج اتصالاً، كل المحلي يعمل (SC-008) في `src/renderer/screens/*.tsx`
- [ ] T088 [P] التقدم والإلغاء الموحّدان للتفريغ والتصدير (`src/renderer/components/Progress.tsx`) + تنظيف `cache/` عند الإلغاء والنجاح
- [ ] T089 [P] الواجهة: مراجعة RTL لكل الشاشات، التبديل للإنجليزية، تنسيق الأرقام/التواريخ، اختصارات لوحة المفاتيح الموثّقة في `docs/shortcuts.md`
- [ ] T090 قياسات الأداء المنشورة في `measurements.md`: SC-009 (10 دقائق على اتصال ≥5 Mbps)، زمن تصدير 10 دقائق، سلاسة المعاينة، ذاكرة 15 دقيقة، وعتبة PSNR/SSIM النهائية المنشورة لفحص التطابق (FR-014)
- [ ] T091 [P] `docs/licenses/INVENTORY.md` نهائي + `THIRD-PARTY.md` مولَّد + مصدر FFmpeg وسكربتات بنائه منشورة (التزام LGPL) + صفحة «حول/التراخيص» في `src/renderer/screens/About.tsx`
- [ ] T092 تشغيل quickstart.md كاملاً (Q1–Q9) على ماك القبول وتسجيل النتائج والصور في `specs/001-proof-of-concept/acceptance/`؛ جلسة SC-001 مع مستخدم غير مطوّر واحد على الأقل مسجّلة بالوقت
- [ ] T093 مراجعة أمنية ختامية (`security-audit`، وضع التوجيه) على الفرق الكامل للميزة قبل converge؛ `docs/security/001-final.md`
- [ ] T094 تحديث `خام/تشريح/_قرارات-مبدئية.md` بأي قرار اتُّخذ أثناء التنفيذ، وتحديث `docs/vision.md` §9 بحالة المرحلة 2

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: بلا اعتماد — T003–T010 وT095 بالتوازي بعد T001–T002 (T095 يحتاج موافقة المالك على المرشحين قبل T041/T056/T092)
- **Foundational (Phase 2)**: يعتمد على Phase 1؛ **يحجب كل القصص**؛ T034 (قرار استمرار) شرط للمرحلة 3
- **US1 (Phase 3)**: يعتمد على Phase 2 — **MVP**
- **US2 (Phase 4)**: يعتمد على Phase 2 + T045 (التفريغ) من US1؛ يمكن بدء T054–T056 وT059–T060 بالتوازي مع نهاية US1
- **US3 (Phase 5)**: يعتمد على Phase 2 + T047/T048 (المقترح) من US1؛ T067–T069 وT072 يمكن بدؤها بالتوازي مع US2
- **US4 (Phase 6)**: يعتمد على Phase 2 (اللقطات مبنية في T019/T020)؛ اختباره الكامل يحتاج US1–US3 لتوليد 20 تعديلاً مختلطاً
- **Polish (Phase 7)**: يعتمد على كل القصص؛ T084/T085 يمكن بدؤهما مبكراً (بعد T045)

### User Story Dependencies

- **US1 (P1)**: مستقلة بعد الأساس — تعمل بلا كابشن ولا تعلّم ولا تراجع من الواجهة
- **US2 (P2)**: تحتاج تفريغ US1؛ مستقلة في الاختبار بمقطع 2 دقيقة
- **US3 (P3)**: تحتاج مقترح US1؛ مستقلة في الاختبار بتغيير حقل ورفض 3 بنود
- **US4 (P4)**: البنية في الأساس؛ الواجهة والاختبار الكامل في النهاية

### Within Each User Story

- الاختبارات أولاً (تفشل) ← الطبقة النقية `core` ← `main`/IPC ← الواجهة ← الحالات الحدّية ← المراجعة الأمنية

### Parallel Opportunities

- Phase 1: T003–T010 وT095 (9 مهام) بالتوازي
- Phase 2: T011–T016 (6 اختبارات) بالتوازي؛ ثم T017/T018/T020/T021/T022/T023 بالتوازي؛ T031–T033 بالتوازي
- US1: T036–T042 (7 اختبارات) بالتوازي؛ ثم T043/T044/T045 بالتوازي
- US2: T054–T058 بالتوازي؛ T059/T060 بالتوازي
- US3: T067–T071 بالتوازي؛ T072 مع T073
- Polish: T084–T089 وT091 بالتوازي

---

## Parallel Example: User Story 1

```bash
# الاختبارات معاً (تفشل أولاً):
Task: "T036 normalize.test.ts"   Task: "T037 providers.test.ts"   Task: "T038 proposal/*.test.ts"
Task: "T039 commands/proposal.test.ts"   Task: "T040 commands/clip.test.ts"   Task: "T042 parity.ts"
# ثم الطبقة النقية والمزودون معاً:
Task: "T043 ffmpeg/audio.ts"   Task: "T044 providers/http.ts"   Task: "T045 transcript/providers/*.ts"
```

---

## Implementation Strategy

### MVP First (US1 فقط)

1. Phase 1 → Phase 2 (مع قرار استمرار في T034)
2. Phase 3 كاملة → **توقف وتحقق**: Q1/Q2/Q3/Q4/Q6 بلا كابشن + parity
3. عرض على المالك قبل US2

### Incremental Delivery

1. الأساس + Spike → قرار
2. US1 → MVP يعمل من البداية للنهاية
3. US2 → الكابشن العربي (الفجوة التنافسية)
4. US3 → النمط والتعلّم (الفرضية المميزة)
5. US4 → التراجع من الواجهة
6. Polish → القياسات المنشورة والقبول

### Notes

- كل مهمة اختبار تُكتب وتفشل قبل مهمة التنفيذ المقابلة
- بعد كل مرحلة تنفيذ: مراجعة أمنية بوضع التوجيه (T035، T053، T066، T077، T083، T093)
- أي قرار منتج/معمارية جديد أثناء التنفيذ يُسجَّل في `خام/تشريح/_قرارات-مبدئية.md` ويُسأل المالك إن أثّر على السلوك أو التكلفة
- commit بعد كل مهمة أو مجموعة منطقية على فرع `001-proof-of-concept`
