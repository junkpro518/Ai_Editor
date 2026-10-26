# OpenCut

**المصادر في خام:** `مستندات/0xMarioNawfal (@RoundtableSpace) on X (17).txt`, `مستندات/Mo Elgaraihy (@EngMoElgaraihy) on X.txt`  
**الرابط الأصلي:** https://github.com/OpenCut-app/OpenCut (إعادة الكتابة) · https://github.com/OpenCut-app/opencut-classic (الكود الفعلي)  
**النوع:** مستودع (محرر فيديو مفتوح، ويب + سطح مكتب)  
**الترخيص:** MIT · **النجوم:** OpenCut 96,323 / opencut-classic 287 · **آخر تحديث:** OpenCut 2026-09-24 / classic 2026-05-17 · **اللغة/الحزمة:** TypeScript (Next.js 16, React 19) + Rust (WASM، GPUI للسطح المكتب)، bun، moon  
**تحقق من المصدر الأصلي:** نعم — استنساخ المستودعين؛ قرأت README وCargo.toml وشجرة `apps/desktop/src` في OpenCut، وفي classic: `AGENTS.md`، `notes/primitives-vs-domains.md`، `apps/web/src/timeline/types.ts`، `project/types.ts`، `commands/base-command.ts` وشجرة `commands/`، `transcription/{types,caption}.ts`، `services/transcription/worker.ts`، `export/index.ts`، `services/renderer/scene-exporter.ts`، `wasm/media-time.ts`، `package.json`.

## ما هو (3–6 أسطر)
"البديل المفتوح لـCapCut": محرر متعدد المسارات يعمل في المتصفح محلياً (الملفات في IndexedDB/OPFS)، مع ترجمة تلقائية بـWhisper داخل المتصفح وتصدير MP4/WebM. **المستودع الرئيسي الآن إعادة كتابة من الصفر** (~424 سطر Rust بـGPUI ولوحات فارغة) ويعد بـEditor API وإضافات وMCP ووضع headless — كلها وعود. الكود الفعلي الصالح اليوم في `opencut-classic`، وهو ما يشغّل opencut.app.

## الأفكار (قائمة)
- كل منطق الأعمال يهاجر إلى `rust/` (crates: time, compositor, effects, gpu, masks, bridge)، والتطبيقات قشرة UI فقط قابلة للاستبدال.
- معمارية "plugin-first" وMCP للوكلاء ووضع headless للأتمتة (في إعادة الكتابة).
- زمن صحيح بالـticks (`MediaTime` = عدد صحيح i64) بدل ثواني عشرية.
- كل تعديل Command قابل للتراجع.

## المميزات (قائمة، ما يفعله فعلاً لا ما يدّعيه التويت)
- (classic) تايم لاين متعدد المسارات: video/text/audio/graphic/effect، مشاهد Scenes متعددة، bookmarks، snapping، تحريك مجموعات، keyframes ومحرر منحنيات، masks، تحكم بالسرعة مع الحفاظ على الطبقة، مستوى صوت، ملصقات، خلفية لون/ضبابية.
- ترجمة تلقائية محلية: whisper tiny/small/medium/large-v3-turbo (onnx-community) عبر `@huggingface/transformers` في Web Worker.
- تصدير mp4/webm بأربع جودات عبر `mediabunny` (CanvasSource + AudioBufferSource) داخل المتصفح.
- لا يوجد وكيل ذكاء ولا MCP في classic — التويت ("AI agents, automations, plugins") يصف خطة إعادة الكتابة لا الموجود.

## التقنيات والبنية
- الحزم/المكتبات: Next.js 16، React 19، radix/shadcn، `mediabunny`، `@huggingface/transformers`، `opencut-wasm`، `soundtouchjs`، drizzle + Postgres + better-auth (للحسابات/الموقع لا للمشاريع)، Cloudflare (opennext). إعادة الكتابة: GPUI 0.2.2.
- المعمارية: `TProject { metadata, scenes: TScene[], currentSceneId, settings{fps, canvasSize, background}, version }` → `TScene { tracks: SceneTracks{ overlay: OverlayTrack[], main: VideoTrack, audio: AudioTrack[] }, bookmarks }` → عناصر union مميّزة بـ`type`: video/image/text/sticker/graphic/effect/audio، كلها ترث `{id, name, startTime, duration, trimStart, trimEnd, sourceDuration?, animations?, params}`؛ و`effects[]`، `masks[]`، `retime{rate, maintainPitch}`. مسار رئيسي main منفصل عن overlays (مثل CapCut).
- الأوامر: `abstract class Command { execute(); undo(); redo() }` + `BatchCommand`، مجلدات `commands/{media,project,scene,timeline/{element,track,clipboard}}`.
- الكابشن: `buildCaptionChunks` يقسم نص كل segment إلى مجموعات بعدد كلمات ثابت ويوزّع الزمن **خطياً** حسب الكلمات/الثانية — لا توقيت كلمة حقيقي.
- محلي بالكامل (المتصفح)؛ لا خادم للمعالجة.
- أمثلة ملموسة: `apps/web/src/timeline/types.ts`، `services/renderer/scene-exporter.ts`، `MediaTime` في `rust/crates/time/src/media_time.rs`.

## أشياء نأخذها لمشروعنا
- **مخطط المشروع (Project → Scenes → main/overlay/audio tracks → عناصر union مع trim/params/effects/masks/animations)**: مرجع جاهز لنموذج بياناتنا متعدد المسارات — **المحرر**.
- **زمن صحيح بالـticks** بدل float: يمنع انجراف التوقيت بعد قصّ متكرر وتطبيق الوكيل — **المحرر/التصدير**.
- **نمط Command + Batch + undo**: كل عملية من الوكيل = BatchCommand واحد يُلغى دفعة — **الوكيل** (التراجع وسجل العمليات في الرؤية).
- **Whisper في Worker داخل المتصفح/التطبيق**: إثبات أن التفريغ المحلي ممكن بلا خادم — **التشغيل**.
- **فصل المنطق في Rust عن الواجهة** (قاعدة AGENTS.md): يسهّل لاحقاً واجهة MCP/headless من نفس النواة — **التشغيل/MCP**.

## استلهامات
- التموضع "free CapCut alternative, no watermark, no subscription" يجذب جمهوراً ضخماً (96K نجمة) حتى قبل وجود ذكاء اصطناعي فعلي.
- سجل تغييرات بلغة المستخدم (changelog/0.3.0.md) — مثال جيد.
- راعٍ واحد (fal.ai) يموّل المشروع المفتوح.
- رد في التويت يطلب دعم لغات متعددة — الطلب على تعدد اللغات حاضر.

## تحذيرات ومخاطر
- المستودع الشهير شبه فارغ الآن ("being rewritten from the ground up"، لا يقبل مساهمات)؛ أي اعتماد عليه = رهان على جدول غير معلوم.
- classic: 287 نجمة، آخر دفع 2026-05-17 — شبه متوقف.
- ادعاءات التويتات (AI agents, automations, plugins) غير موجودة في الكود الحالي.
- الكابشن تقريبي (توزيع خطي) — لا يصلح لكابشن كلمة بكلمة.
- التصدير داخل المتصفح محدود الأداء للفيديو الطويل/عالي الدقة.

## أسئلة مفتوحة
- متى يصدر Editor API وخادم MCP، وما شكله؟
- هل نواة Rust (time/compositor/effects) قابلة لإعادة الاستخدام كمكتبة مستقلة (MIT)؟

## الحكم: ⭐⭐⭐ (3) — نموذج بيانات وأوامر ممتاز للاقتباس وترخيص MIT، لكن لا وكيل ولا MCP فعلياً والمستودع الرئيسي قيد إعادة كتابة شبه فارغة.
