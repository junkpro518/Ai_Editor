# Implementation Plan: إثبات تقني — مونتاج مقطع خام واحد بنمط واحد

**Branch**: `001-proof-of-concept` | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-proof-of-concept/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

تطبيق سطح مكتب (Electron) يستورد مقطع «حديث للكاميرا» ≤15 دقيقة، يستخرج الصوت فقط ويرسله لمزود تفريغ سحابي بمفتاح المستخدم (Deepgram `nova-3` مبدئياً حتى قياس WER)، يولّد مقترح قص مبرَّراً من التفريغ والنمط، يطبّقه بموافقة المستخدم كتايم لاين قابل للتعديل، يعرض كابشن عربياً متزامناً بالكلمة، ويصدّر MP4 يطابق المعاينة. المسار التقني: **دالة تركيب نقية واحدة** `composeFrame` ترسم المعاينة والتصدير في Chromium (WebCodecs + Canvas 2D)؛ FFmpeg LGPL كعملية منفصلة للتحليل والصوت والدمج؛ مستند مشروع JSON واحد بمخططات؛ سجل أوامر موحد بـ21 أمراً؛ تراجع بلقطات كاملة؛ نمط JSON بإصدارات في مكتبة المستخدم. التفاصيل والبدائل في [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5.x (strict) على Node المضمّن في Electron 45.x؛ الواجهة React 19 + Vite (electron-vite).

**Primary Dependencies**: electron (MIT)، electron-builder (MIT)، react (MIT)، mp4box.js (BSD-3، demux لـWebCodecs)، ajv (MIT، تحقق المخططات)، write-file-atomic (ISC)، ulid (MIT). ثنائيات منفصلة: FFmpeg/ffprobe بناء LGPLv3 مشحون داخل التطبيق (BtbN `win64-lgpl` لويندوز؛ بناء ذاتي في CI لماك). خطوط OFL مشحونة (IBM Plex Sans Arabic افتراضياً). خدمات سحابية BYOK: Deepgram (افتراضي مؤقت)، ElevenLabs (بديل). الجرد الكامل بالتراخيص: research.md §R11.

**Storage**: ملفات JSON في `app.getPath('userData')`: `projects/<id>/{project.json, snapshots/, cache/}` و`styles/<id>/v<n>.json` و`settings.json`؛ مفاتيح API مشفّرة بـ`safeStorage` في ملف منفصل؛ الوسائط مراجع بمسار + بصمة (لا نسخ، لا كتابة بجانبها).

**Testing**: vitest (وحدات + عقود: المخططات، الأوامر النقية، مولّد المقترح، مشتق الكابشن، التطبيع العربي)؛ Playwright (Electron: اختبارات العربية الدلالية، تطابق hash المعاينة/التصدير، التراجع 20 تعديلاً)؛ سكربت قبول `scripts/acceptance/parity.ts` (R3) يعمل على ماك (ثم ويندوز)؛ `scripts/wer/` (Python + jiwer، تطوير فقط) لـSC-003. اختبارات تُكتب قبل الكود (الدستور، سير العمل).

**Target Platform**: macOS 13+ (arm64 + x64) للقبول الآن؛ Windows 10/11 x64 فور توفر الجهاز وقبل الإطلاق؛ Linux للتطوير وCI فقط. أي اعتمادية لا تعمل على النظامين تُرفض (FR-021).

**Project Type**: desktop-app (Electron: main + preload + renderer) مع طبقة `core` نقية مستقلة عن الواجهة وعن Electron.

**Performance Goals**: (أهداف تُقاس لا تُفترض — المبدأ VIII) تجهيز مقطع 10 دقائق (تفريغ + مقترح) ≤3 دقائق سحابياً (SC-009)؛ تصدير 1080p بسرعة ≥1.0× الزمن الحقيقي على ماك التطوير (عتبة القياس R10/S10)؛ استيراد وعرض أول إطار خلال ثوانٍ (FR-001)؛ تراجع فوري (<100ms هدف) لمستند بحجم 15 دقيقة.

**Constraints**: الفيديو لا يغادر الجهاز، الصوت فقط للتفريغ بعد إفصاح (FR-017)؛ بلا اتصال: استيراد/معاينة/قص يدوي/كابشن/تراجع/تصدير تعمل؛ لا كود GPL/AGPL مضمّن، FFmpeg LGPL عملية منفصلة، لا x264/x265/libfdk_aac؛ `composeFrame` نقية بدقة المصدر، لا `Date.now`/`Math.random` بلا بذرة/`requestAnimationFrame` في التصدير؛ المشروع ≤15 دقيقة (FR-019)؛ نسبة الأبعاد ثابتة (FR-020)؛ MP4 H.264/AAC بدقة المصدر ≤1080p وCFR (FR-022)؛ واجهة عربية RTL مع تبديل للإنجليزية (FR-018).

**Scale/Scope**: مستخدم واحد، مشروع بمصدر واحد ومسار واحد، نمط افتراضي واحد (+ إصداراته)، 21 أمراً، ~12 شاشة/لوحة (استيراد، تايم لاين، مقترح، مراجعة كلمات، لوحة النمط، اقتراح تحديث النمط، سجل، إعدادات/إفصاح، تصدير). لا شات، لا MCP، لا تنزيل من روابط، لا B-roll، لا إعادة تأطير.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| المبدأ | البوابة | الحالة قبل البحث | بعد التصميم |
|---|---|---|---|
| I النمط أولاً | قدرات القص والكابشن معبَّر عنها كقواعد في النمط؛ schema + إصدارات؛ إلزامي/تفضيل؛ قواعد اختيار؛ `styleGuide` | ✅ `style.schema.json` (cut + captions كقواعد، precedents، styleGuide) | ✅ بلا تغيير |
| II التعلّم بموافقة | كل تصحيح = سابقة (اقتباس + قاعدة + فحص)؛ تحديث النمط بموافقة فقط؛ المعرفة تحمل مصدرها | ✅ Correction.quote → Precedent؛ StyleUpdateProposal pending→accepted؛ `source` في كل قاعدة | ✅ |
| III المستخدم يملك القرار | خطة←diff←معاينة←تطبيق؛ لا تعديل للمصدر؛ تراجع بلقطات كاملة؛ فاعل في السجل؛ تأكيد منفصل للحساس | ✅ Proposal→exclude→apply؛ `undoable`/`confirm`/`actors` في سجل الأوامر؛ snapshots | ✅ |
| IV مشروع قابل للتحرير + حتمية | مستند واحد؛ معاينة = تصدير بنفس الدالة؛ `render(t, params)` نقية؛ بذرة | ⚠️ كان مفتوحاً (محرك المعاينة/التصدير) | ✅ R2: `composeFrame` واحدة، Chromium فقط، cues محسوبة مرة؛ R3 فحص ±1 |
| V محلي أولاً، عربي أولاً | الفيديو محلي؛ الصوت فقط للسحابة بإفصاح؛ وضع محلي لاحق؛ تشكيل عربي مختبر؛ WER مقاس قبل الاعتماد | ⚠️ المزود والمحرك غير محسومين | ✅ R5 (مزود مؤقت + بروتوكول WER إلزامي قبل الإغلاق)، R6 (خط OFL + اختبارات دلالية)، R9 (إفصاح) |
| VI الترخيص | متساهل فقط؛ GPL نتعلم؛ FFmpeg LGPL منفصل؛ جرد | ⚠️ libass/mediabunny/HyperFrames أسئلة | ✅ R2/R4/R11: libass وmediabunny وHyperFrames-كمحرك مرفوضون؛ openh264 قرار للمالك غير مشحون |
| VII سجل أوامر موحد | سجل واحد بمخططات؛ أوامر ذرّية قابلة للتحقق والعكس | ✅ `commands.schema.json` (21) | ✅ |
| VIII البساطة والقياس | أصغر مسار كامل؛ لا تجريدات غير مطلوبة؛ الأرقام تُقاس | ✅ لا PixiJS، لا SQLite، لا monorepo، لا SDKs؛ R10 مهمة قياس أولى | ✅ |
| القيود التقنية | Electron مرشح أول يُحسم بقياس؛ مفاتيح في مخزن آمن؛ محتوى الفيديو مدخل غير موثوق | ⚠️ | ✅ R1 + R10 فيتو؛ R9 safeStorage (تفسير يحتاج تأكيداً)؛ نص التفريغ لا يدخل أي وسيط إلا عبر مخطط أمر |

**النتيجة:** لا مخالفات. ثلاثة تفسيرات تحتاج تأكيد المالك (research.md §R12: safeStorage، VFR، openh264) ولا تمنع بدء التنفيذ.

## Project Structure

### Documentation (this feature)

```text
specs/001-proof-of-concept/
├── plan.md              # هذا الملف
├── research.md          # Phase 0 (موحّد) + research/{A,B,C}-*.md (الملاحق)
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1: project/style/transcript/commands.schema.json + README
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — لا يُنشأ هنا)
```

### Source Code (repository root)

```text
package.json                 # حزمة واحدة (لا monorepo في 001)
electron.vite.config.ts
src/
├── core/                    # منطق نقي: لا Electron، لا DOM (إلا أنواع OffscreenCanvas)
│   ├── contracts/           # الأنواع المولَّدة من specs/001/contracts + ajv validators
│   ├── time.ts              # us ↔ frame، كسر fps، أقرب معدل معياري
│   ├── commands/            # registry.ts + تنفيذ نقي لكل أمر (project, params) → project'
│   ├── proposal/            # silence.ts, repeats.ts, fillers.ts, abandoned.ts (سحابي اختياري), totals.ts
│   ├── captions/            # chunking.ts (مرة واحدة)، layout.ts (fit + rects)، compose.ts (composeFrame)
│   ├── style/               # library.ts (إصدارات)، rules.ts (mandatory/preference)، learn.ts (StyleUpdateProposal)
│   ├── history/             # snapshots, undo/redo
│   └── transcript/          # providers/{deepgram,elevenlabs}.ts (تحويل → العقد)، normalize.ts (عربي)
├── main/                    # Electron main: ipc (أوامر فقط)، ffmpeg/{probe,audio,mux,encoders}.ts، storage/، secrets.ts (safeStorage)، providers/http.ts
├── preload/                 # contextBridge: invokeCommand, subscribe
└── renderer/                # React RTL: screens/{Import,Timeline,Proposal,WordReview,StylePanel,StyleUpdate,History,Settings,Export}، player/ (WebCodecs + mp4box)، i18n/{ar,en}.json
resources/
├── ffmpeg/{darwin-arm64,darwin-x64,win32-x64}/   # LGPL + SHA-256 + LICENSES
├── fonts/                   # IBM Plex Sans Arabic وبقية OFL
└── styles/default-v1.json   # النمط الافتراضي
tests/
├── unit/                    # core: time, commands, proposal, chunking, normalize, style versions
├── contract/                # المخططات ضد fixtures + استجابات مزودين مسجّلة (بلا مفاتيح)
├── integration/             # ffmpeg probe/audio/mux على عينات صغيرة (Linux CI)
└── e2e/                     # Playwright-Electron: العربية الدلالية، parity hash، undo×20، offline
scripts/
├── acceptance/parity.ts     # R3 كاملة + تقرير وصور للمراجع
├── wer/                     # normalize.py, run.py (jiwer)، تطوير فقط
└── ffmpeg-build/            # سكربتات بناء ماك LGPL + تثبيت BtbN بالبصمة
docs/licenses/INVENTORY.md   # جرد التراخيص (المبدأ VI)
```

**Structure Decision**: حزمة واحدة مع حدود مجلدات مفروضة بقاعدة ESLint (`src/core` لا يستورد من `electron`/`react`/`src/main`/`src/renderer`). هذا يحقق «المنطق في طبقة مستقلة عن الواجهة» بلا تعقيد monorepo (المبدأ VIII). كل تنفيذ أمر دالة نقية في `core/commands` تستدعيها `main` عبر IPC؛ الواجهة لا تحوي منطق مونتاج. `composeFrame` في `core/captions/compose.ts` تُستدعى من `renderer` (معاينة وتصدير معاً).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| وحدتا زمن (ميكروثانية للتفريغ، إطارات للتايم لاين) | حدود الإطار عند 30000/1001 ليست ميكروثانية صحيحة؛ فحص ±1 إطار يجب أن يكون عدّاً | وحدة واحدة (us أو ms) تجعل ±1 إطار تقريباً لا عدّاً؛ الإطارات للتفريغ تربط الصوت بمعدل الفيديو وهو خطأ. التحويل في مكان واحد `core/time.ts` |

## Phase 0: Research — مكتمل

`research.md` يحسم: R1 Electron، R2 محرك Chromium بدالة واحدة + FFmpeg منفصل، R3 فحص التطابق، R4 FFmpeg LGPL وترميز عتادي، R5 مزود مؤقت + بروتوكول WER، R6 العربية، R7 ملفات النمط/المشروع، R8 سجل الأوامر، R9 التخزين والمفاتيح والإفصاح، R10 مهمة القياس، R11 الجرد، R12 أسئلة المالك. لا «NEEDS CLARIFICATION» متبقٍ في السياق التقني؛ ما بقي هو قياسات مجدولة (R10) وتأكيدات (R12).

## Phase 1: Design — مكتمل

- `data-model.md`: 11 كياناً، العلاقات، الحالات، قواعد التحقق.
- `contracts/`: `project.schema.json`، `style.schema.json`، `transcript.schema.json`، `commands.schema.json` (21 أمراً)، `README.md`.
- `quickstart.md`: 9 سيناريوهات تحقق تغطي US1–US4 وSC-001..SC-009.

**إعادة فحص الدستور بعد التصميم:** الجدول أعلاه (العمود الأخير) — ✅ كله.

## Assumptions (تفاصيل تنفيذية صغيرة لم تغطها المواصفة)

- VFR: معدل المشروع = أقرب معدل معياري لـ`avg_frame_rate`؛ يُعلَّم `sourceIsVfr` (R12-1).
- عند غياب مشفّر H.264 عتادي وبرمجي: التصدير يفشل برسالة واضحة تذكر السبب (R12-2)، حتى يقرر المالك.
- الخط الافتراضي IBM Plex Sans Arabic بحجم أساس 78px لـ1080p، 3–5 كلمات للمجموعة، كسر عند وقفة ≥150ms؛ كلها حقول في النمط الافتراضي وقابلة للتعديل.
- كشف الإعادات محلياً: تشابه جمل متتالية بعد التطبيع العربي (Jaccard على الكلمات ≥ `repeatsSimilarity`، افتراضي 0.8)؛ الحشو من قائمة افتراضية (يعني، اه، امم، أقصد) قابلة للتعديل في النمط؛ «الجملة المتروكة» تحتاج المزود السحابي (نموذج نصي عبر نفس المفتاح إن وُجد) وإلا تُحذف من الأسباب مع `localOnly=true` (FR-003).
- اللقطة المصغّرة للمعاينة تُعرض بـ`drawImage` من OffscreenCanvas بدقة المصدر؛ إن ثبت ثقلها تُقاس قبل أي تغيير (R2).
- الحد الأدنى الافتراضي لطول اللقطة 500ms؛ عتبة الصمت الافتراضية 700ms؛ حماية حواف الجمل 120ms — قيم في النمط الافتراضي تُراجع بعد الاستخدام.
