<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logos/display/logo_primary_dark.png">
    <img src="assets/logos/display/logo_primary_light.png" width="420" height="218" alt="نسج — NASJ">
  </picture>
</p>
<h1 align="center" dir="rtl">نسج — NASJ</h1>
<p align="center" dir="rtl"><strong>انسج بنيتك التحتية في صورة واضحة.</strong></p>
<p align="center" dir="rtl">حوّل إعدادات Nginx إلى خريطة تفاعلية للبنية التحتية، مع توثيق الملف ورقم السطر لكل علاقة.</p>
<p align="center">
  <a href="https://github.com/marawan6569/Nasj/actions/workflows/ci.yml"><img src="https://github.com/marawan6569/Nasj/actions/workflows/ci.yml/badge.svg?branch=main&amp;event=push" alt="فحوص Rust · main"></a>
</p>
<p align="center" dir="rtl">Rust · ترخيص MIT · جرى التحقق على Linux · <a href="README.md">English</a></p>

<div dir="rtl">

> **صدر NASJ v0.1.0 رسميًا.** [ملاحظات الإصدار والتنزيلات](https://github.com/marawan6569/Nasj/releases/tag/v0.1.0).
> تتوفر أرشيفات Linux التنفيذية وحزم Debian لمعمارِيّتَي x86_64 وARM64، والمصدر،
> مع بصمات SHA-256. لا تتوفر حزمة على crates.io.

قد تتوزع قواعد Nginx بين مضيفين افتراضيين ومسارات متداخلة وملفات تضمين متعددة.
يجمعها نسج في خريطة واحدة: تتبّع النطاق إلى الخادم ووجهة الوكيل العكسي، وافحص
مسارات الملفات والتحويلات الشرطية، ثم ارجع إلى مصدر كل علاقة في الإعدادات.
تظل المسارات التي تعجز الأداة عن حسمها مميزة بوضوح، دون افتراض وجهات غير مثبتة.

## الميزات المنفذة

- **أداة Rust لسطر الأوامر:** تحليل إعدادات Nginx ضمن حدود للموارد، مع التضمين المتكرر وأنماط الملفات.
- **خريطة للإعدادات المعلنة:** مضيفون افتراضيون يعملون عبر HTTP وHTTPS، وكتل المسارات، ومجموعات upstream وأعضاؤها، ووجهات الوكيل العكسي، وroot وalias، ومجموعة محددة من التحويلات الشرطية.
- **أربع صيغ للتصدير:** JSON ذي مخطط مرقّم، وGraphviz DOT، وSVG مستقل، وHTML تفاعلي.
- **تقرير HTML واحد يعمل دون إنترنت:** عرض مقروء للمضيف، وبحث يحتفظ بسياق العلاقات، وتصفية وتكبير وتحريك ولمس، ولوحة فحص، ومظهران فاتح وداكن.
- **مصادر وتشخيصات واضحة:** الملف ورقم السطر، ومستويات معلومات وتحذير وخطأ، وتمييز الإعدادات المعلنة عن بيانات العرض الاصطناعية.
- **قراءة فقط:** لا تعديل للإعدادات، ولا إعادة تحميل لـNginx، ولا رفع للصلاحيات، ولا قياس عن بُعد أو اكتشاف تلقائي عبر الشبكة.

## البدء السريع: ملف Linux تنفيذي جاهز (موصى به)

تتوفر الآن أرشيفات تنفيذية وحزم Debian لمعمارِيّتَي **x86_64 وARM64 (aarch64)**
في [الإصدار v0.1.0](https://github.com/marawan6569/Nasj/releases/tag/v0.1.0)، دون
الحاجة إلى Rust. اجتازت المعماريتان اختبارات تشغيل أصلية على **Ubuntu 22.04
وDebian 12**. الملفات مرتبطة ديناميكيًا بمكتبات GNU/Linux؛ يحتاج Linux Mint
والتوزيعات الأخرى إلى تحقق مستقل. راجع [التوزيع والبصمات](docs/DISTRIBUTION.md)
لمتطلبات التشغيل الدقيقة.

نزّل الأرشيف الموافق لجهازك وثبّته ضمن حسابك:

<div dir="ltr">

```sh
case "$(uname -m)" in
  x86_64) nasj_arch=x86_64 ;;
  aarch64|arm64) nasj_arch=aarch64 ;;
  *) echo "Unsupported architecture" >&2; exit 1 ;;
esac
nasj_download_dir=$(mktemp -d /tmp/nasj-download-XXXXXX)
cd "$nasj_download_dir"
nasj_release_url=https://github.com/marawan6569/Nasj/releases/download/v0.1.0
curl -fLO "$nasj_release_url/nasj-v0.1.0-linux-$nasj_arch.tar.gz"
curl -fLO "$nasj_release_url/SHA256SUMS-binaries"
sha256sum --ignore-missing --check SHA256SUMS-binaries
tar -xzf "nasj-v0.1.0-linux-$nasj_arch.tar.gz"
install -Dm755 "nasj-v0.1.0-linux-$nasj_arch/nasj" "$HOME/.local/bin/nasj"
"$HOME/.local/bin/nasj" --version
"$HOME/.local/bin/nasj" --help
```

</div>

نفّذ كل خطوة فقط بعد نجاح السابقة، وتأكد من ظهور `OK` بجانب الأرشيف المطلوب.
أضف `~/.local/bin` إلى `PATH` لتشغيل `nasj` مباشرة. احتفظ بإشعارات التراخيص عند
إعادة توزيع النسخ. تعمل الأداة وتقارير HTML دون اتصال؛ لا يحتاج التشغيل إلى
Graphviz أو Python أو Node.js أو Nginx يعمل فعليًا.

### حزمة Debian / Ubuntu

استخدم مجلدًا جديدًا واختر الحزمة الموافقة لنتيجة `dpkg --print-architecture`:

<div dir="ltr">

```sh
nasj_deb_arch=$(dpkg --print-architecture)
case "$nasj_deb_arch" in amd64|arm64) ;; *) echo "Unsupported architecture" >&2; exit 1 ;; esac
nasj_download_dir=$(mktemp -d /tmp/nasj-deb-XXXXXX)
cd "$nasj_download_dir"
nasj_release_url=https://github.com/marawan6569/Nasj/releases/download/v0.1.0
curl -fLO "$nasj_release_url/nasj_0.1.0_$nasj_deb_arch.deb"
curl -fLO "$nasj_release_url/SHA256SUMS-binaries"
sha256sum --ignore-missing --check SHA256SUMS-binaries
sudo apt install "./nasj_0.1.0_$nasj_deb_arch.deb"
nasj --version
# Remove when needed: sudo apt remove nasj
```

</div>

إصدار الحزمة `0.1.0-1`، ويعرض سطر الأوامر `nasj 0.1.0`. الاعتماديات هي
`libc6 (>= 2.34)` و`libgcc-s1 (>= 4.2)`. أقل إصدار glibc اختُبر فعليًا هو 2.35
على Ubuntu 22.04؛ لا تكفي متطلبات الرموز وحدها لإثبات التوافق على أنظمة أخرى.
يحتاج تثبيت الحزمة وإزالتها إلى صلاحيات الإدارة، بينما لا يحتاج تحليل الإعدادات
إليها. تتحقق البصمات من البايتات ولا تعني توقيع الملفات أو قابلية إعادة إنتاج البناء.

### التثبيت من المصدر

ثبّت [أدوات Rust المستقرة](https://rustup.rs) وأداة الربط الخاصة بنظامك.
لتثبيت الإصدار الثابت:

<div dir="ltr">

```sh
git clone --branch v0.1.0 https://github.com/marawan6569/Nasj.git Nasj-v0.1.0
cd Nasj-v0.1.0
cargo install --locked --path crates/nasj-cli
nasj --version
nasj map --config fixtures/nginx/multi-vhost.conf --strict --format html -o report.html
```

</div>

افتح `report.html` مباشرة في المتصفح. يستخدم المثال ملفات اختبار اصطناعية ويصدر
ملاحظتين معلوماتيتين لأنماط تضمين اختيارية فارغة. تأكد من وجود مجلد أدوات Cargo
في `PATH`. جرى التحقق من البناء باستخدام Rust 1.99.1 على معماريتَي Linux؛
لم يُتحقق من إصدارات Rust الأقدم أو الأنظمة الأخرى. قد يتطلب البناء تنزيل
الاعتماديات، بينما تعمل الأداة المثبتة دون اتصال.

للتطوير استخدم `--branch main` بدلًا من ذلك. يبقى `main` الفرع الافتراضي للتطوير،
ويبقى الوسم `v0.1.0` ثابتًا عند
`b60cb2e045fc9476034bffba7967b8674825fa18`.

## استكشاف الإعدادات

<div dir="ltr">

```sh
nasj map --config ./nginx.conf --format json -o topology.json
nasj map --config ./nginx.conf --format dot -o topology.dot
nasj map --config ./nginx.conf --format svg -o topology.svg
nasj map --config ./nginx.conf --format html -o report.html
```

</div>

اختر مسارات إخراج جديدة؛ ترفض الأداة الكتابة فوق الملفات والروابط الرمزية الموجودة.
عند غياب `-o`، تُرسل الصيغة المختارة وحدها إلى المخرج القياسي. ينتج `nasj demo`
عرضًا اصطناعيًا منفصلًا. تُحصر ملفات التضمين افتراضيًا داخل مجلد أساس الإعدادات؛
يمكن تحديده عبر `--prefix`، والسماح بالتضمين خارجه صراحة عبر `--allow-external-includes`.
يسمح `--strict` بالملاحظات المعلوماتية ويرفض التحذيرات والأخطاء، وتوقف أخطاء
الإدخال المطلوبة التحليل دائمًا دون إنشاء خريطة جزئية.

في تقرير HTML، اختر مضيفًا أو ابحث عن نطاق أو وجهة خلفية أو مسار أو ملف مصدر.
تُبرز العقد المطابقة مباشرة، وتحتفظ العقد ذات الحدود المتقطعة بسياق العلاقات.
اختر عقدة لفحص خصائصها وأدلتها. تُظهر نتائج البحث المحدودة تنبيهًا عند احتمال
نقص السياق، وتبقى خيارات ملاءمة العرض والمقياس المقروء متاحة.

[![تقرير اصطناعي يربط البحث عن الوجهة الخلفية بنطاقاتها ومضيفها ومسارها ومجموعة upstream](docs/images/report-preview.png)](docs/images/report-preview.png)

*أُنشئت المعاينة من ملفات الاختبار في المستودع، مع توحيد مسارات المصادر للنشر.
لم تُستخدم إعدادات أو تقارير من بيئة إنتاج.*

## النطاق والأمان

يصف نسج **الإعدادات المعلنة**، ولا يؤكد أن الخدمات تعمل أو أن طلبًا فعليًا سيسلك
مسارًا معينًا. تبقى المتغيرات رمزية، وتبقى الشروط غير المدعومة وسلوك إعادة الكتابة
والمعالجات غير الخاصة بـHTTP غير محسومة. لا يحاكي نسج تنفيذ الطلبات بالكامل،
ولا يستبدل `nginx -t`. راجع [حدود التحليل المدعوم](docs/ANALYSIS.md).

تؤمّن التقارير ترميز المحتوى غير الموثوق وتحجب الحقول الحساسة المعروفة، لكن أسماء
المضيفين ومسارات الملفات تظل ظاهرة. لا يوجد ضمان لاكتشاف جميع الأسرار؛ راجع التقرير
قبل مشاركته. يحتوي HTML على جميع الموارد والشعارات المعتمدة محليًا، ويستخدم سياسة
أمان محتوى مقيدة دون طلبات خارجية. اقرأ [سياسة الأمان](SECURITY.md).

## التوثيق

| الدليل | المحتوى |
| --- | --- |
| [المعمارية](docs/ARCHITECTURE.md) | حدود النواة والمصدّرات وسطر الأوامر |
| [التحليل والصياغة](docs/ANALYSIS.md) | التضمين والتوجيه المدعوم وحدود اليقين |
| [مخطط JSON 0.2](docs/JSON_FORMAT.md) | البنية المرجعية والأدلة والتوافق |
| [التقارير](docs/REPORTS.md) | الصيغ والتفاعل والأمان واختبارات المتصفح |
| [ملفات الهوية الرسمية](assets/logos/README.md) | الأصول المعتمدة ونسخ العرض ومصدرها |
| [جاهزية الإصدار](docs/RELEASE_READINESS.md) و[قائمته](docs/RELEASE_CHECKLIST.md) | أدلة الدمج والنشر والتحقق |
| [ملاحظات v0.1.0](docs/RELEASE_NOTES_v0.1.0.md) و[التوزيع](docs/DISTRIBUTION.md) | حزم Linux والمصدر والتحقق |
| [المواصفات](docs/SPEC.md) و[خطة التنفيذ](docs/IMPLEMENTATION_PLAN.md) | المتطلبات وسجل التنفيذ |

## الخطة والمساهمة

يوفر **v0.1.0** التحليل الثابت والتقارير دون إنترنت؛ ويستمر التطوير على `main`.
يُخطط في **v0.2** لربط اختياري بحاويات Docker وخدمات systemd والعمليات مع حفظ الأدلة،
وفي **v0.3** لخادم محلي اختياري. **الاكتشاف والخادم غير منفذين.** راجع [الخطة](docs/ROADMAP.md).

نرحب بتقارير الأخطاء وملفات الاختبار الاصطناعية وطلبات الدمج المحددة النطاق.
اقرأ [دليل المساهمة](CONTRIBUTING.md)، ولا تنشر إعدادات خاصة أو بيانات اعتماد أو
تقارير تشغيل في المسائل العامة. يعتمد المشرفون عمليات الدمج والإصدارات.
تُسجل التغييرات في [سجل التغييرات](CHANGELOG.md).

المشروع مرخص وفق [MIT](LICENSE)، وتتوفر تصريحات تراخيص الاعتماديات في
[الجرد](docs/DEPENDENCY_LICENSES.md). نسج مشروع مستقل ولا يتبع F5 أو NGINX.

</div>
