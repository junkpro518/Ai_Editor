# Anime.js (v4)

**المصادر في خام:** `مستندات-Raw/animejs-repo.md`, `مستندات-Raw/tweet-Sn0wbrave-2084365389761298763.md`  
**الرابط الأصلي:** https://github.com/juliangarnier/anime · https://animejs.com/documentation  
**النوع:** مكتبة  
**الترخيص:** MIT · **النجوم:** 73,885 · **آخر تحديث:** 2026-08-21 (الإصدار 4.5.0) · **اللغة/الحزمة:** JavaScript (ESM) / `animejs`  
**تحقق من المصدر الأصلي:** نعم (README + استنساخ المستودع وقراءة: `src/timeline/{timeline,position}.js`, `src/easings/**`, `src/utils/stagger.js`, `src/animation/animation.js`, `src/adapters/three/*`, `src/adapters/registry.js`, `src/engine/engine.js`, `package.json`)

## ما هو
محرّك أنيميشن JavaScript خفيف، يحرّك خصائص CSS وSVG وسمات DOM وكائنات JS عادية، وبالإصدار 4 صار يحرّك كائنات Three.js مباشرة عبر "adapter". التغريدة وصفته بأنه "API بسيط"، لكن الكود يكشف نظام حركة كامل: timeline بمواضع نسبية وlabels، ونظام easing غني، وkeyframes، وstagger بشبكات وفوضى (jitter)، وspring فيزيائي، وscroll وdraggable. هذا أهم عنصر في الدفعة لأن نظام الأنماط عندنا يحتاج "مفردات حركة" جاهزة.

## الأفكار
- كل شيء يُحرَّك بدالة واحدة: `animate(targets, params)`؛ والتجميع بـ `createTimeline()`.
- الزمن كيان قابل للبحث فيه (`seek`) والعكس (`reverse`) والتمديد (`stretch`) — أي إنه يُعامل كخط زمن لا كـ"تشغيل وانتهى".
- الموضع على التايم لاين يُكتب كنص نسبي (`'<'`, `'<<'`, `'+=200'`, `'label-=100'`) وهذا أقرب ما يكون للغة وصف مونتاج.
- الـ stagger "ينشر" قيمة (تأخير، دوران، لون...) على مجموعة عناصر حسب نمط (من المركز، من الآخر، شبكة).
- الـ adapters: سجلّ يعلّم المحرّك كيف يقرأ ويكتب خصائص أي نوع كائن (Three.js مثالاً) دون تعديل النواة.
- في الكود خطاف `globals.editor` (يُستدعى من `timeline.add/call/label/sync`) يوحي بأن مؤلف المكتبة يبني محرّراً مرئياً فوق نفس النموذج.

## المميزات (من الكود)
- **Timeline** (`src/timeline/timeline.js`, 389 سطر): `add(targets, params, position)`، `add(timerParams, position)`، `sync(otherAnim, position)` (إدخال أنيميشن/WAAPI موجود داخل التايم لاين)، `set(targets, params, position)`، `call(fn, position)` (مدة صفر)، `label(name, position)`، `remove(targets, prop)`، `stretch(newDuration)` (يُعيد قياس الأبناء والـ labels معاً)، `refresh()`, `revert()`، و`.then()` (Promise).
- **صيغة الموضع** (`position.js`): رقم مطلق؛ `'<'` = نهاية الطفل السابق؛ `'<<'` = بداية الطفل السابق؛ `'+=n'`/`'-=n'`/`'*=n'` نسبي؛ `'labelName'`؛ `'labelName+=n'`. دون موضع = نهاية التايم لاين (تسلسل).
- **Easing** (`src/easings/`):
  - مدمجة بالاسم: `linear`, و`in/out/inOut/outIn` × (`Quad, Cubic, Quart, Quint, Sine, Circ, Expo, Bounce, Back, Elastic`) والقوة العامة `inPower(1.68)`؛ مع معاملات نصية مثل `'outBack(2)'`, `'outElastic(1, .3)'`.
  - دوال تُستورد وتُمرَّر مباشرة (صيغة النص القديمة أُزيلت من النواة): `cubicBezier(x1,y1,x2,y2)`, `steps(n, fromStart)`, `linear(0, '0.25 50%', 1)` (منحنى متعدد النقاط يطابق CSS `linear()`), `irregular(length, randomness)` (قيم عشوائية متدرجة لحركة "آلة كتابة"), و`spring({bounce, duration, mass, stiffness, damping, velocity})`.
  - الـ spring حلّال فيزيائي (underdamped / critically / overdamped) مع مفهوم "perceived duration" مأخوذ من SwiftUI؛ ومدة الأنيميشن تُحسب من زمن الاستقرار (`settlingDuration`) تلقائياً.
  - `playbackEase` منفصل عن `ease`: يشوّه زمن التشغيل الكلي لا قيم الخصائص.
- **Keyframes** (`animation.js: generateKeyframes`): ثلاث صيغ: (1) مصفوفة قيم لكل خاصية `x: [0, 100, 50]`؛ (2) مصفوفة كائنات `keyframes: [{x: 100, ease:'out'}, {y: 50, duration: 400}]` تُحوَّل داخلياً إلى tweens لكل خاصية؛ (3) نسب مئوية مثل CSS `keyframes: {'0%': {x: 0}, '50%': {x: 100}, '100%': {x: 0}}` وتُحوَّل لمدد نسبةً إلى `duration`. كل keyframe يقبل `ease`, `duration`, `composition` خاصاً به. وإن لم تُحدَّد مدة كل keyframe فتُقسَّم المدة الكلية بالتساوي.
- **Stagger** (`utils/stagger.js`, 294 سطر): `stagger(val | [from,to], {from: 'first'|'last'|'center'|'random'|index|[x,y(,z)], reversed, ease, grid:[cols,rows(,depth)] | true (يقيس مواقع DOM/الكائنات تلقائياً), axis:'x'|'y'|'z', start, total, use: prop|fn, seed, jitter})`. يصلح للتأخير (`delay: stagger(65)`) ولأي خاصية، ويقبل range وunits، وseed لعشوائية قابلة للإعادة (مهم لتصدير حتمي).
- **Composition** لكل tween: `replace` (الافتراضي) / `none` / `blend` — ماذا يحدث حين يتعارض أنيميشنان على نفس الخاصية؛ ويُضبط تلقائياً `none` عند أكثر من 1000 هدف للسرعة.
- **Timer/Engine**: `engine.speed`, `fps`, `timeUnit` (ثواني بدل ميلي)، `precision`، `pauseOnDocumentHidden`، و`useDefaultMainLoop=false` لتشغيل يدوي (أي يمكن تغذية الزمن من محرّك خارجي — مهم للمعاينة وللتصدير إطاراً إطاراً).
- **أخرى**: `splitText`/`scramble` (حرف/كلمة/سطر)، `svg.drawable/morphTo/createMotionPath`، `createDraggable`، `onScroll`، `createScope` (تنظيف + media queries)، `createLayout` (انتقالات layout)، `waapi.animate` (نسخة WAAPI خفيفة)، `createAnimatable` (تتبّع المؤشر بسلاسة).
- **Three.js adapter** (`import 'animejs/adapters/three'`، أثر جانبي): يسجّل `threeAdapter = registerAdapter(detect)` ثم `registerTargetAdapter(t => t instanceof Object3D)` ثم `registerProperty(name, getter, setter, gate)`. الخصائص المربوطة: `x/y/z`، `rotateX/Y/Z` (بالدرجات، ترتيب Euler 'XYZ')، `scaleX/Y/Z/scale`، `opacity` (يكتب في `material.opacity` ويقلب `visible` عند الصفر)، `color`، `visible`؛ وللكاميرا `fov/aspect/near/far/zoom/focalLength`؛ وللإضاءة `intensity/color/groundColor`؛ وللصوت `volume`؛ وأي خاصية رقمية/لونية على `material` تُكتشف تلقائياً (`metalness`, `roughness`, `emissive`...)؛ وTSL uniforms مدعومة؛ و`getInstances(mesh)` لـ InstancedMesh/BatchedMesh؛ و`registerPropertyResolver` لخصائص ديناميكية. مثال: `animate(mesh, {x:100, rotateY:360, opacity:.3, color:'#f0a'})`.

## التقنيات والبنية
- الحزم/المكتبات: بلا اعتماديات تشغيل (three اختياري للـ adapter)؛ بناء Rollup؛ يُصدَّر كوحدات فرعية (`animejs/timeline`, `/animation`, `/timer`, `/engine`, `/adapters/three`...) مع `sideEffects` معلنة للـ adapters فقط (يسمح بالـ tree-shaking).
- المعمارية: شجرة `Tickable` (Timer ← JSAnimation ← Timeline)؛ التايم لاين قائمة أبناء مرتبطة (`_tail`, `_offset`, `_delay`)؛ كل خاصية = سلسلة tweens؛ المحرّك حلقة rAF واحدة تغذّي الكل بـ `requestTick`.
- أمثلة ملموسة:
```js
const tl = createTimeline({ defaults: { ease: 'outExpo', duration: 600 } });
tl.label('intro')
  .add('.title', { y: [40, 0], opacity: [0, 1] }, 'intro')
  .add('.card', { scale: [0.8, 1], delay: stagger(80, { from: 'center' }) }, '<<+=100')
  .call(() => console.log('done'), '+=0');
animate(el, { keyframes: { '0%': {x: 0}, '60%': {x: 120, ease: 'outBack'}, '100%': {x: 100} }, duration: 800 });
animate(mesh, { rotateY: 360, ease: spring({ bounce: .4 }) }); // بعد import 'animejs/adapters/three'
```

## أشياء نأخذها لمشروعنا
- **مفردات الحركة لنظام الأنماط**: نعتمد نفس تقسيم الـ easing (in/out/inOut/outIn × عائلات + back/elastic بمعاملات + spring + steps + cubic-bezier + linear متعدد النقاط) كقاموس ثابت اسمه معياري، فيكتب الوكيل `ease: "outBack(1.7)"` والستايل يخزّنه نصاً قابلاً للقراءة. يخدم: نظام الأنماط + الوكيل.
- **صيغة الموضع النسبي** (`<`, `<<`, `+=`, `label`) كلغة وصف داخل ملف النمط لحركات النصوص/الانتقالات: "ابدأ مع بداية المقطع السابق + 100ms". أنسب للوكيل من إحداثيات مطلقة، ولا تنكسر عند تغيّر مدة المقطع. يخدم: الوكيل + المحرر.
- **stagger كمفهوم أول-صنف** للعناوين المتحركة (حرف/كلمة/سطر) مع `from`, `reversed`, `ease`, `seed`. seed يعطي حتمية بين المعاينة والتصدير. يخدم: التوليد + التصدير.
- **keyframes بالنسب %** كصيغة تخزين حركة جاهزة في الأنماط (قوالب "pop-in"، "shake") لأنها تستقل عن المدة.
- **`stretch()` يعيد قياس الأبناء والـ labels معاً**: نفس سلوك "ملاءمة حركة لطول المقطع" عندنا.
- **فكرة registry للـ adapters** (`detect` + `registerProperty(get,set,gate)`): نمط جيد لجعل أي نوع عنصر على التايم لاين (نص، شكل، لوحة 3D، فلتر) قابلاً للحركة بنفس الواجهة. ونفس الشيء لربط خصائص ثلاثية الأبعاد بخصائص الطبقات.
- **`engine.useDefaultMainLoop=false` + `timeUnit`** يعني إمكان تشغيل المكتبة كمحرّك رسم حتمي يُغذّى بإطار الفيديو الحالي، فنعرض overlays متحركة على الفيديو بدقة إطار (ويحتاج تجربة).
- **spring بمعاملات (bounce, duration)** بدل (stiffness, damping): أنسب للمستخدم غير التقني ولاختيار الوكيل.
- ملاحظة اختيار: للتصدير نحتاج رسم كل إطار بالزمن الصريح؛ الأولى فحص `seek(time)` على timeline ثم قراءة الحالة. الحزمة مناسبة لطبقة overlays (نصوص/أشكال/Canvas) لا لمعالجة الفيديو نفسه.

## استلهامات
- README قصير ومثال مقارن بجانبه GIF يوضّح الناتج مباشرة؛ التوثيق الطويل في موقع مستقل.
- تمويل بالرعاة (Platinum/Silver) مع "100% free" — نموذج استدامة لمكتبة نواة قد نحتاجه لو فتحنا مكتبة الأنماط.
- 25+ مثالاً تفاعلياً (`examples/`) منها `threejs`, `stagger`, `timeline-seamless-loop`: الأمثلة هي التسويق.
- جمهور التغريدة (إعجابات قليلة، حفظ أكثر نسبياً: 21 bookmark مقابل 11 like) يدل أن الناس تحفظه كمرجع لا تتفاعل معه.

## تحذيرات ومخاطر
- v4 كسر التوافق مع v3 (دليل ترحيل)، وصيغ نصية قديمة للـ easing (`'cubicBezier(...)'`) تُرفض بتحذير؛ يجب تثبيت الإصدار وكتابة الأنماط بالصيغة الجديدة.
- يركّز على DOM/SVG/Canvas/Three؛ ليس محرّك مونتاج: لا يعرف الفيديو ولا الصوت ولا الإطار (بل زمن ميلي/ثانية).
- سلوك `opacity` و`scale=0` في adapter Three يقلبان `visible` ضمنياً (قيد معروف في تعليقات الكود).
- حلقة rAF افتراضية تتوقف عند إخفاء الصفحة (`pauseOnDocumentHidden`) — يجب تعطيلها عند التصدير.
- مطوّر فرد؛ استدامة معتمدة على الرعاة (آخر push في 2026-08-21).

## أسئلة مفتوحة
- هل نُدمج المكتبة نفسها أم نستعير النموذج ونكتب محرّكنا (لتحكم أدق بالإطارات والتصدير)؟
- كيف نربط `seek` بمؤشر التشغيل في timeline المحرر دون ازدواج ساعتين؟
- هل `globals.editor` موثّق/مستقر، أم تجربة داخلية؟ (لم نجد وثيقة له في المستودع.)
- كيف نعرض easing/spring كمنحنى قابل للتعديل في واجهة تحرير النمط؟

## الحكم: ⭐⭐⭐⭐⭐ — أغنى مرجع في الدفعة لمفردات الحركة؛ ترخيص MIT واضح وكود نظيف يمكن اقتباس نموذجه (timeline/easing/stagger/adapters) مباشرة.
