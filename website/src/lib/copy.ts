import type { Locale } from "./paths";
// Trusted, reviewable W0 editorial copy only. Never pass configuration or user input here.
const arabic = {
    Features: "الميزات",
    Demo: "العرض التفاعلي",
    Installation: "التثبيت",
    Documentation: "التوثيق",
    "Main navigation": "التنقل الرئيسي",
    "v0.1.0 is here": "صدر <bdi>v0.1.0</bdi>",
    "Open source · Built with Rust": "مفتوح المصدر · بلغة <bdi>Rust</bdi>",
    "Weave your<br>infrastructure<br><span>into clarity.</span>":
        "انسج بنيتك<br>التحتية في<br><span>صورة واضحة.</span>",
    "Turn Nginx configuration into an explorable topology. <br>Follow every relationship back to its <strong>source file and line.</strong>":
        "حوّل إعدادات <bdi>Nginx</bdi> إلى خريطة تفاعلية للبنية التحتية.<br>تتبّع كل علاقة إلى <strong>ملف المصدر ورقم السطر.</strong>",
    "Explore Demo": "استكشف العرض",
    "Install NASJ": "ثبّت <bdi>NASJ</bdi>",
    "Read-only analysis": "تحليل للقراءة فقط",
    "Offline reports": "تقارير دون إنترنت",
    "No runtime discovery": "دون اكتشاف حيّ",
    "NGINX / INPUT": "NGINX / إعدادات",
    "ONE COMMAND TO CONNECT THE DOTS": "أمر واحد يكشف العلاقات",
    "Static analysis": "تحليل ثابت",
    "FROM CONFIGURATION TO CLARITY": "من الإعدادات إلى الصورة الواضحة",
    "Find the route. Follow the evidence.": "اعثر على المسار. وتتبّع الدليل.",
    "Open the actual report": "افتح التقرير الفعلي",
    "English report viewer · Cropped details on mobile. Open the actual report to explore every connection.":
        "عارض التقرير باللغة الإنجليزية · تفاصيل مقتطعة على الهاتف. افتح التقرير الفعلي لاستكشاف جميع العلاقات.",
    "Actual NASJ v0.1.0 output · Synthetic Nginx fixture":
        "تقرير فعلي من <bdi>NASJ v0.1.0</bdi> · إعدادات <bdi>Nginx</bdi> اصطناعية",
    "Configured relationships. Runtime reachability is not verified.":
        "علاقات معلنة في الإعدادات. لم يُتحقّق من تشغيل الخدمات.",
    "Every connection has a source.": "لكل علاقة مصدر.",
    "Select a node to inspect its configuration, relationships, and file-and-line evidence.":
        "اختر عقدة لفحص إعداداتها وعلاقاتها وأدلتها من الملفات والأسطر.",
    "A SMALL COMMAND. A CLEARER PICTURE.": "أمر بسيط. صورة أوضح.",
    "From scattered files to a shared understanding.":
        "من ملفات متفرقة إلى فهم مشترك.",
    "Keep your existing workflow.<br>NASJ brings the connections into view.":
        "واصل العمل بأدواتك المعتادة.<br>يكشف نسج العلاقات بينها.",
    "01 / READ": "01 / اقرأ",
    "02 / MAP": "02 / ارسم",
    "03 / UNDERSTAND": "03 / افهم",
    "Start with your configuration.": "ابدأ بملفات الإعدادات.",
    "Point NASJ at an Nginx configuration. It follows declared includes and preserves their original sources.":
        "حدّد ملف إعدادات <bdi>Nginx</bdi>. يتتبّع نسج ملفات التضمين المعلنة ويحفظ مصادرها الأصلية.",
    "Make the relationships visible.": "اجعل العلاقات مرئية.",
    "Explore virtual hosts, locations, upstreams, and static paths. Unresolved routing stays explicitly unresolved.":
        "استكشف المضيفين الافتراضيين والمسارات والخوادم الخلفية. تبقى العلاقات غير المحسومة مميزة بوضوح.",
    "Get back to the source.": "عُد إلى المصدر.",
    "Search a backend, inspect its connected context, and trace configured relationships to a file and line.":
        "ابحث عن خادم خلفي وافحص سياق علاقاته، ثم ارجع إلى الملف والسطر اللذين يعرّفان كل علاقة.",
    "One topology. Four useful formats.": "خريطة واحدة. أربع صيغ مفيدة.",
    "Export formats": "صيغ التصدير",
    "Structured data": "بيانات منظمة",
    "Graphviz workflows": "لأدوات Graphviz",
    "Standalone diagrams": "رسوم مستقلة",
    "Offline exploration": "استكشاف دون إنترنت",
    "CLARITY WITHOUT SIDE EFFECTS": "وضوح دون تغيير الإعدادات",
    "Understand your infrastructure.<br>Leave it running as it is.":
        "افهم بنيتك التحتية.<br>ودعها تعمل كما هي.",
    "NASJ describes configured intent. It does not simulate requests, verify live services, or replace <code>nginx -t</code>.":
        "يصف نسج ما تعلنه الإعدادات. لا يحاكي الطلبات، ولا يؤكد تشغيل الخدمات، ولا يستبدل <bdi><code>nginx -t</code></bdi>.",
    "Read-only by design": "مصمّم للقراءة فقط",
    "No configuration edits, Nginx reloads, or elevated privileges for mapping.":
        "لا تعديل للإعدادات، ولا إعادة تحميل لـ<bdi>Nginx</bdi>، ولا رفع للصلاحيات أثناء التحليل.",
    "A report you can take with you": "تقرير يمكنك أخذه معك",
    "One self-contained HTML file. No server or internet connection required.":
        "ملف <bdi>HTML</bdi> واحد مستقل. لا يحتاج إلى خادم أو اتصال بالإنترنت.",
    "Honest about uncertainty": "واضح بشأن حدود اليقين",
    "Dynamic routes stay unresolved. Review diagnostics and reports before sharing.":
        "تبقى المسارات الديناميكية غير محسومة. راجع التشخيصات والتقارير قبل مشاركتها.",
    "Your configuration has a story. See it.": "إعداداتك تروي قصة. اكتشفها.",
    "Get NASJ for Linux x86_64 or ARM64. Archives, Debian packages, and source.":
        "نزّل نسج لنظام <bdi>Linux</bdi> بمعماريتَي <bdi>x86_64</bdi> و<bdi>ARM64</bdi>. أرشيفات وحزم <bdi>Debian</bdi> ومصدر.",
    "v0.1.0 · SHA-256 checksums available":
        "<bdi>v0.1.0</bdi> · بصمات <bdi>SHA-256</bdi> متاحة",
    "Weave your infrastructure into clarity.":
        "انسج بنيتك التحتية في صورة واضحة.",
    "Open source. Licensed under MIT.": "مفتوح المصدر. بترخيص <bdi>MIT</bdi>.",
    Contribute: "ساهم في المشروع",
    "Independent of F5 and NGINX.": "مستقل عن <bdi>F5</bdi> و<bdi>NGINX</bdi>.",
    "Preview report": "عاين التقرير",
} as const;
export const translator =
    (locale: Locale) =>
    (text: keyof typeof arabic): string =>
        locale === "ar" ? arabic[text] : text;
