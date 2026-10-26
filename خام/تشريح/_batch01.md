# الدفعة 01 — المستودعات الستة المرشحة في وثيقة الرؤية (§10)

| الموضوع | الملف | الحكم | السبب في سطر |
|---|---|---|---|
| OpenChatCut | `openchatcut.md` | ⭐⭐⭐⭐⭐ | أقرب منتج قائم لرؤيتنا (وكيل + تايم لاين حقيقي + مقترحات بخيارات وموافقة + DesignStyle + مهارات + MCP)، لكنه AGPL والمهارات GPL، فهو للاستلهام فقط. والرابط الصحيح `0xsline/OpenChatCut` لا الـ fork |
| Timeline Studio | `timeline-studio.md` | ⭐⭐⭐⭐⭐ | أنضج عقد أوامر للوكيل (plan/diff/preview/apply/idempotent/baseRevision) وأعمق سير عمل لاستنساخ الأسلوب من مرجع (7 طبقات أدلة)، وكله MIT. والنماذج بتراخيص مختلطة |
| Cutaway | `cutaway.md` | ⭐⭐⭐⭐ | أفضل نموذج بيانات بترخيص MIT (إطارات صحيحة، `Animatable<T>`، مؤثرات مفتوحة، presets كـ JSON، مسار واحد للمعاينة والتصدير). لكن لا وكيل فيه والنضج ضعيف |
| MakeMyClip Editor | `makemyclip-editor.md` | ⭐⭐⭐ | أنظف مثال صغير لـ verbs ← ops ← inverse + MCP + Zod. لكن التصدير مسار فيديو واحد فقط، وبلا keyframes، و`main` متوقف منذ يونيو |
| LosslessCut | `losslesscut.md` | ⭐⭐⭐ | مرجع ناضج لـ smart cut وكشف الصمت والمشاهد وصيغ EDL/FCPXML/OTIO، لكنه ليس محرراً، وGPL-2.0 |
| OpenVideo Editor | `openvideo-react-video-editor.md` | ⭐⭐ | واجهة جميلة فوق محرك مغلق المصدر (404) بترخيص مقيِّد ومتناقض (≤3 موظفين، ومنع بيع المشتقات)، وبلا وكيل |

## أهم ما خرج من هذه الدفعة
- **لا يوجد أي مستودع فيه "نظام أنماط قابل للتعلّم"**، وهذه هي الفجوة التي تميّزنا فعلاً. لكن كل مستودع يملك قطعة: OpenChatCut عنده كائن نمط مطبَّق (`DesignStyle`: ألوان وخطوط بأدوار حرة + `styleGuide` نصي + 24 preset)، لكنه هوية بصرية فقط بلا قواعد قص أو إيقاع. وTimeline Studio عنده الجانب الاستنتاجي (`replication-workflow.md` + `analyze_replication.py`)، لكنه نص مهارة وسكربت تشخيصي بلا نموذج بيانات. وCutaway عنده البدائيات التي يمكن أن تُسلسَل فيها حزمة النمط.
- **سجل الأوامر الموحد (§6) له حلّان ناضجان بترخيص MIT:** MakeMyClip (verb ← op ← inverse، سجل بـ cursor/rev، `.describe()` كتوثيق للأداة)، وTimeline Studio (plan envelope + `baseRevision` + معرّف idempotent لكل عملية + `project.diff` إلزامي قبل `run`، ومحرك واحد وراء CLI وMCP وWebMCP).
- **نماذج الموافقة للمقارنة:** OpenChatCut (Proposal ← خيارات A/B/C ← عمليات، مع `baseDoc` لكشف التقادم، وجلسات manual/auto، ومنع أدوات الأثر الجانبي داخل المسودة)، وTimeline Studio (`stateToken` ← `previewId` ← `apply` ← `transactionId`). أما MakeMyClip فليس فيه موافقة، فقط تراجع بعد التنفيذ. "مختبر الأنماط A/B/C" في الرؤية يطابق خيارات Proposal في OpenChatCut.
- **التراجع: لقطات أم عكس؟** Cutaway يختار لقطات المستند (أأمن لأن العكس اليدوي قد يُفسد المشروع بصمت)، وMakeMyClip يختار `invertOp`. قرار يجب حسمه في الـ spec.
- **المعاينة والتصدير:** ثلاث مدارس: PixiJS + WebCodecs في المتصفح (Cutaway مفتوح بالكامل، وOpenVideo مغلق المحرك)، وRemotion + FFmpeg على خادم محلي (OpenChatCut، مع مخاطرة ترخيص Remotion للشركات)، وFFmpeg segment-and-concat (MakeMyClip، بسيط لكنه لا يركّب طبقات). ومعيار "تطابق المعاينة والتصدير" يتحقق فقط في Cutaway بمسار `resolveScene` واحد.
- **التراخيص:** القابل للبناء عليه فعلاً هو Cutaway وTimeline Studio (باستثناء أوزان النماذج البحثية) وMakeMyClip (مع GPL الخاص بثنائي FFmpeg). أما OpenChatCut (AGPL + GPL) وLosslessCut (GPL-2.0) فللاستلهام وإعادة الكتابة فقط. وOpenVideo غير مفتوح فعلياً.
- **تصحيح لوثيقة الرؤية:** رابط OpenChatCut في §10 و§15 يشير إلى fork متأخر (jeongpiano، 5 نجوم، أغسطس). الأصل `0xsline/OpenChatCut` (2689 نجمة، أكتوبر). ووصف OpenVideo على GitHub ("using remotion") قديم، والتطبيق الآن على PixiJS.
- **اقتراح عملي:** نموذج بيانات على طريقة Cutaway + عقد أوامر على طريقة Timeline Studio/MakeMyClip + تجربة المقترحات والموافقة على طريقة OpenChatCut. وتُكتب "مواصفة النمط" انطلاقاً من طبقات الأدلة السبع في Timeline Studio وكائن DesignStyle في OpenChatCut، مع إضافة القواعد الإلزامية مقابل التفضيلات.
