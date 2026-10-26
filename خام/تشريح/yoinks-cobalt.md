# yoinks + Cobalt (تنزيل فيديو من رابط)

**المصادر في خام:** `مستندات/0xMarioNawfal (@RoundtableSpace) on X (9).txt` (yoinks), `مستندات/‏عادل مبرمج (@AdelDeveloperX) on X (2).txt` (Cobalt)  
**الرابط الأصلي:** https://github.com/pablostanley/yoinks · https://github.com/imputnet/cobalt · https://cobalt.tools  
**النوع:** مستودع (أداتان)  
**الترخيص:** yoinks: MIT · Cobalt: API = AGPL-3.0، الواجهة web = CC-BY-NC-SA-4.0 (غير تجاري) + العلامة محمية · **النجوم:** yoinks 6,279 · Cobalt 45,500 · **آخر تحديث:** yoinks 2026-07-17 · Cobalt 2026-04-06 · **اللغة/الحزمة:** yoinks TypeScript (npm) · Cobalt JS (Express) + Svelte  
**تحقق من المصدر الأصلي:** نعم (README للاثنين + docs/api.md + api/README + web/README + قائمة الملفات)

## ما هو (3–6 أسطر)
أداتان تحمّلان فيديو من رابط (YouTube وInstagram وTikTok وX…). **yoinks** واجهة طرفية (TUI) فوق `yt-dlp`: تلصق الرابط، تختار الدقة أو mp3، ويُحفظ الملف في `~/Downloads`. **Cobalt** خدمة مستقلة: API + واجهة ويب، تستخرج الرابط المباشر وتعمل كـ«بروكسي ذكي» (tunnel) أو تحوّل/تدمج الصوت والفيديو. التويتات تبالغ بعبارة «أي فيديو» و«مجاناً»؛ الواقع أن الاثنين يعتمدان على فك تشفير مواقع قد تتغير في أي وقت.

## الأفكار (قائمة)
- «الصق الرابط ← حمّل» بلا تسجيل ولا إعلانات: تجربة بسيطة جداً تصلح لزر «استيراد فيديو مرجعي من رابط».
- Cobalt يفصل `localProcessing`: الخادم يمرّر الملفات فقط والمعالجة (remux/merge) تتم عند العميل بـ libav.js.
- yoinks يعتمد على yt-dlp الموجود أو يحمّله تلقائياً إلى `~/.yoinks/bin`، فلا يطلب من المستخدم تثبيت شيء.

## المميزات (قائمة، ما يفعله فعلاً)
- yoinks: 1,800+ موقع (عبر yt-dlp)، قائمة صيغ مع تقدير الحجم، صوت mp3 فقط، سمات ألوان، يعمل بالفأرة. خريطته (Roadmap) فيها بعد: `--best/--mp3` للسكربت، `-o` لمجلد الإخراج، قوائم التشغيل — يعني **غير قابل للأتمتة بعد**.
- Cobalt: خدمات مدعومة بحسب `api/src/processing/services`: bilibili, bluesky, dailymotion, facebook, instagram, loom, newgrounds, ok, pinterest, reddit, rutube, snapchat, soundcloud, streamable, tiktok, tumblr, twitch, twitter, vimeo, vk, youtube.
- Cobalt API: `POST /` بجسم JSON فيه `url` (مطلوب) و`videoQuality` (144..4320/max، الافتراضي 1080) و`downloadMode` (auto/audio/mute) و`audioFormat` (mp3/ogg/wav/opus/best) و`youtubeVideoCodec` (h264/av1/vp9) و`localProcessing` (disabled/preferred/forced) و`subtitleLang`. الرد `status` من: tunnel / local-processing / redirect / picker / error. رؤوس RateLimit-* والمصادقة Api-Key أو Bearer(JWT).

## التقنيات والبنية
- الحزم/المكتبات: yoinks = Node 18+، Ink (React للطرفية)، tsup، yt-dlp، ffmpeg/ffmpeg-static. Cobalt = pnpm monorepo (`api/` Express، `web/` Svelte، `packages/`)، ffmpeg، libav.js، Docker.
- المعمارية: yoinks محلي بالكامل (يستدعي yt-dlp كعملية فرعية، ملفات `src/lib/ytdlp.ts` و`platforms.ts`). Cobalt خادم يمكن استضافته ذاتياً (`docs/run-an-instance.md`)؛ لا يخزّن المحتوى مؤقتاً (يقول: «fancy proxy»).
- أمثلة ملموسة: `npx yoinks <url>`؛ طلب Cobalt: `{"url":"…","videoQuality":"1080","downloadMode":"auto"}`.

## أشياء نأخذها لمشروعنا (قائمة)
- **استيراد مرجع من رابط (vision §3):** الأنسب تشغيل `yt-dlp` محلياً كعملية فرعية داخل تطبيق سطح المكتب (نمط yoinks: يحمّل الثنائي عند أول تشغيل إلى مجلد التطبيق). يخدم: نظام الأنماط (مرجع لاستنتاج النمط) + التشغيل.
- **نمط `status: tunnel/local-processing/picker` من Cobalt** كتصميم لواجهة داخلية: المستورد يعيد «عدة عناصر» فيعرض picker (مثلاً كاروسيل Instagram). يخدم: المحرر.
- **استضافة Cobalt ذاتياً كخيار** للنسخة السحابية/الهجينة، لكن لا نعتمد عليه افتراضياً (انظر الترخيص).
- حفظ مصدر الرابط والتاريخ كبيانات وصفية للمرجع (مصدر النمط) داخل المشروع. يخدم: نظام الأنماط.

## استلهامات (تجربة المستخدم، التسويق…)
- رسالة yoinks «no shady ads» وCobalt «doesn't piss you off»: الجمهور يحب الأداة التي تقول «لا إعلانات، لا تسجيل». تغريدة Cobalt حصدت اهتماماً بمجرد ذكر «+42 ألف نجمة».
- ملاحظة «fair use» الصريحة في README: صيغة قانونية جاهزة للاقتباس في واجهتنا.

## تحذيرات ومخاطر (ترخيص، نضج، قانوني)
- **الشروط (ToS):** yoinks يقول صراحة: التنزيل «قد يخالف شروط المنصة» — «نزّل فقط ما لك حق حفظه». Cobalt يقول «zero liability» والمستخدم هو المسؤول، ويزعم أنه لا يحمّل إلا المحتوى العام. لا أحد منهما يحميك قانونياً؛ منتج تجاري يوزّع هذه الوظيفة يتحمل مخاطرة أعلى بكثير من أداة شخصية. (هذا وصف لما ورد في READMEs وليس استشارة قانونية.)
- **ترخيص Cobalt:** AGPL-3.0 للـAPI (أي استخدام كخدمة شبكية يلزم بنشر التعديلات)؛ واجهة web غير تجارية CC-BY-NC-SA ولا يجوز استعمال العلامة. فلا ندمج كوده في منتج مغلق. yoinks MIT آمن لكنه مجرد غلاف لـ yt-dlp (Unlicense).
- **API العامة:** `api.cobalt.tools` محمية ببوت ولا يُسمح بها في مشاريع أخرى دون إذن؛ المطلوب استضافتك الخاصة.
- هشاشة: خدمات المنصات تُكسر باستمرار (آخر دفعة Cobalt أبريل 2026 رغم 45 ألف نجمة). تحتاج تحديث yt-dlp دورياً.
- Instagram وTikTok يحجبان الخوادم عادة؛ التنزيل من جهاز المستخدم (IP منزلي) أنجح من السحابة.

## أسئلة مفتوحة
- هل يكفي «استيراد بمسؤولية المستخدم» أم نقصر الاستيراد على رفع ملف + لصق رابط يعالجه جهاز المستخدم فقط؟
- هل نشحن yt-dlp مع التطبيق أم نحمّله عند الطلب (أخف قانونياً)؟
- هل نريد إتاحة تنزيل الصوت فقط لتحليل الإيقاع من مرجع؟

## الحكم: ⭐⭐⭐⭐ (4) — الفكرة والحل التقني (yt-dlp محلي) مفيدان جداً لاستيراد المراجع، لكن الجانب القانوني والترخيص (AGPL/NC لـ Cobalt) يفرضان الحذر
