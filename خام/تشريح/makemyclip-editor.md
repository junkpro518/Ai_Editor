# MakeMyClip Editor

**المصادر في خام:** `مستودعات-الوثيقة/MakeMyClip-editor.md`  
**الرابط الأصلي:** https://github.com/MakeMyClip/editor — npm: `@makemyclip/editor`  
**النوع:** مستودع + مهارة Claude Code + خادم MCP + CLI  
**الترخيص:** MIT (ملف LICENSE فعلي "Copyright (c) 2026 MakeMyClip")، وثنائي FFmpeg المضمَّن عبر `ffmpeg-static` بترخيص GPL · **النجوم:** 5 · **آخر تحديث:** pushed_at 2026-10-09، لكن آخر commit على `main` في 2026-06-18 · **اللغة/الحزمة:** TypeScript (Node 24+)، Zod 4، Hono، Vite + React 19  
**تحقق من المصدر الأصلي:** نعم (README + SKILL.md + ~8 ملفات: timeline/{schema,composition,ops,verbs,doc-op-log,compile}.ts، mcp/server.ts، package.json، وقائمة الفروع)

## ما هو (3–6 أسطر)
"FFmpeg تستطيع أن تكلّمه": 19 أداة FFmpeg حتمية (trim/split/concat/transition/add_text/add_captions/zoom_pan/silence_remove/chroma_key/stabilize/render…) لها مدخلات بمخطط Zod. وتُعرض عبر أربع واجهات تشترك في نفس السجل: مهارة Claude Code، وCLI باسم `clip`، وواجهة متصفح محلية `clip ui`، وخادم MCP عبر stdio (`clip mcp`). المحرر نفسه لا يستدعي أي نموذج، والوكيل هو Claude أو أي عميل MCP خارجي. فيه طبقتا حالة: `composition.json` (تايم لاين غير هدّام) مع سجل عمليات للتراجع والإعادة، و`session.json` (سجل append-only لكل استدعاء أداة).

## الأفكار (قائمة)
- **طبقة Verbs فوق Ops:** الوكيل يرسل "أفعالاً" قريبة من اللغة الطبيعية (`add_media`، `add_text`، `add_color`، `trim`، `move`، `split`، `remove`، `transition`)، فتُخفَّض (`lowerVerb`) إلى `CompositionOp` سلكية يطبقها reducer نقي (`applyOp`). الأجزاء غير النقية (فحص الملف، توليد المعرّفات، اختيار نقطة الإلحاق) تبقى خارج الـ reducer.
- **كل op له عكس محسوب:** `invertOp(comp, op)`. وسجل التراجع `DocOpLog { rev, cursor, entries[{id,label,forward[],inverse[]}] }` محفوظ في ملف منفصل عن المستند، مع `rev` لاكتشاف عدم الاتساق بعد انهيار.
- **وصف الحقول `.describe()` في Zod هو نفسه توثيق الأداة للنموذج.** مخطط واحد يخدم التحقق والتوثيق معاً.
- **دفعة أفعال = خطوة تراجع واحدة:** `timeline_edit({verbs:[…]})`.
- **أداة قراءة تُرجع "قابلية التصدير":** `timeline_show` يُرجع `exportable + blockers` حتى لا يكتشف الوكيل الخلل وقت التصدير فقط.
- **mediaId حتمي:** `m_` + sha1(المسار)[:12]، فالاستيراد المكرر لا ينشئ عنصراً جديداً (idempotent).
- **المعرّفات قابلة للإشارة داخل نفس الدفعة:** الوكيل يمرر `id` اختيارياً ثم يشير إليه في فعل لاحق من نفس الدفعة.

## المميزات (قائمة، ما يفعله فعلاً لا ما يدّعيه التويت)
- 19 أداة تعمل على ملف واحد، تستدعي FFmpeg كعملية فرعية عبر `execa` (المعاملات مصفوفة بلا shell)، ومع stream-copy للقص بدون فقد حيث أمكن.
- خادم MCP فيه 5 أدوات فقط: `timeline_show` و`timeline_edit` و`timeline_undo` و`timeline_redo` و`timeline_export`. والوسائط محصورة داخل `MAKEMYCLIP_WORKSPACE`.
- مخطط المستند (`composition.ts`): canvas + مسارات video/audio، ومقاطع `media|text|color`، و`Transform {scale,x,y,rotationDeg,opacity}`، ومكدس `effects` (adjust/speed/volume/chromaKey/fadeIn/fadeOut)، و12 نوع انتقال من عائلة xfade. **بدون keyframes عن قصد في v1.**
- **التصدير محدود فعلاً:** `compile.ts` يقول صراحة إن v1 يدعم تسلسلاً واحداً من مقاطع متلاصقة على مسار فيديو واحد (segment-and-concat). أي مسارات متعددة مأهولة، أو transform غير محايد، أو chromaKey، أو فجوات أو تداخلات ← `CompileError`. إذن "متعدد المسارات" صحيح للمستند وغير صحيح للتصدير.
- المعاينة: FFmpeg يرسم إطاراً عند رأس التشغيل (preview frame)، ولا يوجد محرك معاينة حي.
- 542 اختباراً (حسب الـ README)، وزمن تحويل الوسائط الطويلة غير مضبوط بعد (+30 دقيقة).

## التقنيات والبنية
- الحزم/المكتبات: `@modelcontextprotocol/sdk` 1.29، `zod` 4، `execa` 9، `ffmpeg-static`، `hono` + `@hono/node-server`، Vite + React 19 للواجهة، Biome، semantic-release.
- المعمارية: `Claude Code skill → npx @makemyclip/editor <tool>` | `Browser UI → /api/tools/:name, /api/timeline/verbs` | `clip mcp (stdio)` ← كلها تصل إلى registry + verb layer ← tool handlers ← FFmpeg. المعالجة محلية بالكامل، ولا يوجد اتصال شبكي ولا telemetry.
- أمثلة ملموسة:
  - `src/timeline/verbs.ts` (`EditableVerbSchema`، `applyVerbs`)، `ops.ts` (`applyOp`، `invertOp`، `applyOpsTracked`)، `doc-op-log.ts`، `compile.ts` (`compileTimeline`، `checkExportable`، `CompileError`)، `mcp/server.ts` (`buildMcpServer`).
  - تكوين MCP: `{"command":"npx","args":["-y","@makemyclip/editor","mcp"],"env":{"MAKEMYCLIP_WORKSPACE":"…"}}`
  - CLI: `clip timeline new | add-media | transition <id> fade 0.5 | show | at <sec> | frame <sec> | undo | redo | log | export`
  - إضافة أداة: ملف `src/tools/<name>.ts` يصدّر مخطط Zod ومعالجاً، ثم يُسجَّل في `src/ui/tool-registry.ts`.

## أشياء نأخذها لمشروعنا (قائمة، كل بند: ماذا + لماذا + أين يخدم الرؤية)
- **سلسلة Verb → Op → Inverse + سجل منفصل بـ cursor/rev:** هذا أوضح تطبيق لـ"سجل أوامر موحد تستدعيه كل الواجهات" (§6). والـ `forward/inverse` يسهّل لاحقاً عرض "الفرق" قبل الموافقة. ← **الوكيل / المحرر**.
- **مخطط Zod مع `.describe()` كتوثيق للأداة:** مصدر واحد للحقيقة لكل من MCP والشات المدمج والتحقق. ← **الوكيل / MCP**.
- **`timeline_show` يُرجع blockers:** نمط "أرض نفسك قبل التعديل وتحقق بعده" مكتوب في وصف الأداة نفسه. ← **الوكيل**.
- **mediaId حتمي من المسار (أو الأفضل من hash المحتوى):** استيراد idempotent يمنع تكرار الأصول عند إعادة تشغيل الوكيل. ← **المحرر**.
- **حصر الوسائط داخل workspace:** يطابق بند الأمان في §12 (منع وصول غير مقيد لملفات الجهاز). ← **التشغيل / الأمان**.
- **فكرة `session.json` append-only:** أساس جيد لـ"تعلم التفضيلات من التصحيحات" (§4.2)، لأنه يحفظ ما فعله الوكيل وما عدّله المستخدم بعده. ← **نظام الأنماط**.

## استلهامات (تجربة المستخدم، التسويق، التسعير، الطريقة التي شرحوا بها المنتج)
- العنوان «FFmpeg you can talk to» وعبارة «No generative AI rewriting your audio» تموضع ذكي ضد Descript وRunway.
- مصفوفة مقارنة صادقة (ميزات وحالات استخدام بعلامات ✅⚠️❌)، فيها اعتراف بما لا يناسبه («ليس للتايم لاين الثقيل»).
- نموذج عمل واضح: المحرر MIT ومجاني إلى الأبد، والتوليد المدفوع لاحقاً في حزمة منفصلة `@makemyclip/generation` على makemyclip.com، والمستند مشترك بينهما. قريب من نموذج "محلي + خدمات اختيارية" في §8.
- `llms.txt` في جذر المستودع، والتثبيت بسطر واحد `npx skills add`.

## تحذيرات ومخاطر (ترخيص، نضج، اعتماد على API مدفوع، ادعاءات غير مثبتة)
- **النضج:** 5 نجوم، و`main` متوقف منذ 2026-06-18، والعمل موزع على فروع `feat/*` و`chore/*` غير مدمجة. وAPI قبل 1.0 والمخططات قد تتغير.
- **ادعاء "multi-track" مضلل للتصدير:** المترجم يرفض أي تركيب حقيقي متعدد الطبقات. هذا عائق مباشر أمام نمط فيه overlays أو B-roll أو موشن.
- لا keyframes ولا معاينة حية، فلا يصلح محرراً يدوياً حقيقياً بمعايير §5.
- FFmpeg المضمَّن GPL (معزول كعملية فرعية، لكنه يحتاج مراجعة قانونية عند التوزيع داخل تطبيق سطح مكتب).
- لا يوجد وضع "اقتراح ثم موافقة". التراجع فقط بعد التنفيذ.

## أسئلة مفتوحة
- هل نتبنى نهج "FFmpeg segment-and-concat" للتصدير الأولي (بسيط ومجرَّب) أم نذهب مباشرة لمركّب إطاري مثل Cutaway/Remotion؟
- هل نعرّف للنمط Verbs خاصة (مثل `apply_style_rule`) أم نجعل النمط يولّد verbs عادية؟
- هل العكس المحسوب (`invertOp`) آمن بما يكفي، أم نجمع بينه وبين لقطات دورية (Cutaway)؟

## الحكم: ⭐⭐⭐ (3/5) — أنظف مثال صغير لطبقة أوامر الوكيل (verbs/ops/inverse + MCP + Zod)، لكن المحرر والتصدير محدودان جداً والمشروع شبه متوقف.
