/**
 * The copy of /occupations (the Australian occupation hub), kept apart from the page so it can be tested. Every migration statement is either taken from
 * the Department of Home Affairs skilled occupation list as held in the repository (public/Skilled Occupation List.md: the list each occupation sits on,
 * the visa subclasses shown for it, and its ANZSCO-version labels) or is a plain description of what a page does. Nothing here says that a person qualifies,
 * recommends an occupation or visa, or predicts an outcome.
 */
import { HOME_AFFAIRS_SOL_URL, OCCUPATION_DATASET_DATE } from "./page-content";

export { HOME_AFFAIRS_SOL_URL, OCCUPATION_DATASET_DATE };

/** The LogiVisa-compiled reference PDF: the file, the page that delivers it (email form), and the date printed on its cover (scripts/test-occupation-hub.tsx checks the PDF says so). */
export const OCCUPATION_PDF = {
  file: "/australia-skilled-occupation-list-2026.pdf",
  resourcePath: "/resources/occupation-list",
  compiledOn: "2026-10-08",
} as const;

export const ABS_ANZSCO_URL = "https://www.abs.gov.au/statistics/classifications/australian-and-new-zealand-standard-classification-occupation-anzsco";

type T3 = (en: string, tr: string, zh: string) => string;

export function hubMeta(t: T3) {
  return {
    // The occupation hub owns search / browse / ANZSCO intent; the PDF intent belongs to /resources/occupation-list, so no "PDF" in the title.
    title: t(
      "Australia Skilled Occupation List 2026 | Search ANZSCO Codes",
      "Avustralya Kalifiye Meslek Listesi 2026 | ANZSCO Kodu Arama",
      "澳大利亚技术职业清单 2026 | 搜索 ANZSCO 代码",
    ),
    description: t(
      "Search Australian occupations by ANZSCO code or title and see list placement, assessing authority and sources. Home Affairs remains the official source.",
      "Avustralya mesleklerini ANZSCO kodu veya unvanla arayın; kalifiye meslek listesindeki yeri, değerlendirme kurumu ve kaynaklara göz atın. Resmî kaynak İçişleri Bakanlığı'dır.",
      "按 ANZSCO 代码或职业名搜索澳大利亚职业，浏览技术职业清单归属、评估机构和来源。官方来源仍为内政部。",
    ),
    h1: t("Australia Skilled Occupation List 2026", "Avustralya Kalifiye Meslek Listesi 2026", "澳大利亚技术职业清单 2026"),
  };
}

export function hubCopy(t: T3, total: number) {
  return {
    intro: t(
      "Search LogiVisa’s source-dated Australian occupation data by occupation title or ANZSCO code. The page brings together the occupation-list references used across skilled visa research, with links to official sources and a downloadable dated reference.",
      "LogiVisa’nın kaynak tarihli Avustralya meslek verilerini meslek unvanı veya ANZSCO koduyla arayın. Sayfa, nitelikli vize araştırmasında kullanılan meslek listesi referanslarını resmî kaynaklara bağlantılar ve indirilebilir tarihli bir referansla bir araya getirir.",
      "按职业名称或 ANZSCO 代码搜索 LogiVisa 带来源日期的澳大利亚职业数据。本页汇集技术签证研究中使用的职业清单参考，并提供官方来源链接和可下载的带日期参考文件。",
    ),
    lists: t(
      "Australia does not use one single occupation list for every skilled visa. Different lists apply to different visas, and Home Affairs currently references the CSOL, MLTSSL, STSOL and ROL. Being on a list is not personal visa eligibility.",
      "Avustralya her nitelikli vize için tek bir meslek listesi kullanmaz. Farklı vizeler için farklı listeler geçerlidir ve İçişleri Bakanlığı şu anda CSOL, MLTSSL, STSOL ve ROL’a atıf yapar. Bir listede yer almak kişisel vize uygunluğu anlamına gelmez.",
      "澳大利亚并非对所有技术签证使用同一份职业清单。不同签证适用不同清单，内政部目前提及 CSOL、MLTSSL、STSOL 和 ROL。列入清单并不等于个人具备签证资格。",
    ),
    count: t(
      `${total} occupations with source-dated information. Each page names its sources and the date they were checked; none states whether an individual qualifies.`,
      `Kaynak tarihli bilgi içeren ${total} meslek. Her sayfa kaynaklarını ve kontrol tarihini belirtir; hiçbiri bir kişinin uygunluğunu belirtmez.`,
      `共 ${total} 个职业，信息均注明来源与核对日期；页面不对任何个人是否符合条件作出说明。`,
    ),
    searchTitle: t("Search by occupation or ANZSCO code", "Meslek veya ANZSCO koduyla arayın", "按职业或 ANZSCO 代码搜索"),
    searchLabel: t("Occupation title or ANZSCO code", "Meslek unvanı veya ANZSCO kodu", "职业名称或 ANZSCO 代码"),
    searchPlaceholder: t("e.g. Software Engineer or 261313", "ör. Yazılım Mühendisi veya 261313", "例如 软件工程师 或 261313"),
    searchButton: t("Search occupations", "Meslek ara", "搜索职业"),
    pdfTitle: t("Need a downloadable, dated reference?", "İndirilebilir, tarihli bir referansa mı ihtiyacınız var?", "需要可下载的带日期参考资料？"),
    pdfBody: (compiled: string, dataDate: string) =>
      t(
        `The Department of Home Affairs maintains the current skilled occupation list information, including the relevant legislative instruments, on its website. LogiVisa’s PDF is a separate reference: a dated snapshot compiled by LogiVisa from Home Affairs list data (compiled ${compiled}; occupation data dated ${dataDate}). It is not an official government document, so verify current information with Home Affairs.`,
        `İçişleri Bakanlığı, güncel kalifiye meslek listesi bilgilerini ve ilgili yasal belgeleri web sitesinde yürütür. LogiVisa’nın PDF’i ayrı bir referanstır: LogiVisa’nın İçişleri Bakanlığı liste verilerinden derlediği tarihli bir görüntüdür (derleme tarihi ${compiled}; meslek verisi tarihi ${dataDate}). Resmî bir devlet belgesi değildir; güncel bilgiyi İçişleri Bakanlığı’ndan doğrulayın.`,
        `澳大利亚内政部在其网站上维护当前的技术职业清单信息及相关立法文件。LogiVisa 的 PDF 是另一份参考资料：由 LogiVisa 根据内政部清单数据整理的带日期快照（整理于 ${compiled}；职业数据日期 ${dataDate}）。它不是政府官方文件，请向内政部核实当前信息。`,
      ),
    officialLink: t("Open the official Home Affairs skilled occupation list", "Resmî İçişleri Bakanlığı kalifiye meslek listesini açın", "打开内政部官方技术职业清单"),
    pdfLink: (_compiled: string) =>
      t(
        "Download the 2026 occupation list PDF",
        "2026 meslek listesi PDF’ini indirin",
        "下载 2026 年职业清单 PDF",
      ),
    pdfNote: (compiled: string) =>
      t(
        `LogiVisa-compiled reference (compiled ${compiled}; free, sent by email), not an official government PDF.`,
        `LogiVisa tarafından derlenmiş referans (derleme ${compiled}; ücretsiz, e-postayla), resmî devlet PDF’i değildir.`,
        `LogiVisa 整理的参考资料（整理于 ${compiled}；免费，通过邮件发送），不是政府官方 PDF。`,
      ),
    whichTitle: t("Which skilled occupation list applies?", "Hangi kalifiye meslek listesi geçerli?", "适用哪份技术职业清单？"),
    whichIntro: t(
      "On the Home Affairs list each occupation shows the list or lists it sits on and the visa subclasses shown for it. In summary, as the list shows them:",
      "İçişleri Bakanlığı listesinde her meslek, yer aldığı liste veya listeleri ve kendisi için gösterilen vize alt sınıflarını belirtir. Listenin gösterdiği şekliyle özet:",
      "内政部清单列明每个职业所属的清单及其对应的签证子类。按清单所示，概括如下：",
    ),
    lists_: [
      {
        code: "CSOL",
        name: t("Core Skills Occupation List", "Core Skills Occupation List", "核心技能职业清单"),
        text: t(
          "Entries relate to the Skills in Demand visa (subclass 482, Core Skills stream) and the Employer Nomination Scheme visa (subclass 186, Direct Entry).",
          "Kayıtlar Skills in Demand vizesi (subclass 482, Core Skills akışı) ve İşveren Aday Gösterme Programı vizesi (subclass 186, Direct Entry) ile ilgilidir.",
          "条目对应技能紧缺签证（482 类别，核心技能流）和雇主提名计划签证（186 类别，直接入境）。",
        ),
      },
      {
        code: "MLTSSL",
        name: t("Medium and Long-term Strategic Skills List", "Medium and Long-term Strategic Skills List", "中长期战略技能清单"),
        text: t(
          "Entries relate to points-tested and nominated skilled visas such as subclasses 189, 190 and 491, among the other subclasses the list shows.",
          "Kayıtlar, listenin gösterdiği diğer alt sınıfların yanı sıra 189, 190 ve 491 gibi puan testli ve aday gösterilen nitelikli vizelerle ilgilidir.",
          "条目对应 189、190、491 等积分制和提名技术签证，以及清单所示的其他子类。",
        ),
      },
      {
        code: "STSOL",
        name: t("Short-term Skilled Occupation List", "Short-term Skilled Occupation List", "短期技术职业清单"),
        text: t(
          "Entries relate to a narrower set of nominated and regional skilled visas, such as subclasses 190 and 491.",
          "Kayıtlar, 190 ve 491 gibi daha dar bir aday gösterilen ve bölgesel nitelikli vize grubuyla ilgilidir.",
          "条目对应范围较窄的提名和偏远地区技术签证，例如 190 和 491 类别。",
        ),
      },
      {
        code: "ROL",
        name: t("Regional Occupation List", "Regional Occupation List", "偏远地区职业清单"),
        text: t(
          "Entries relate to regional visas, including subclass 494 (Skilled Employer Sponsored Regional).",
          "Kayıtlar, subclass 494 (Skilled Employer Sponsored Regional) dahil bölgesel vizelerle ilgilidir.",
          "条目对应偏远地区签证，包括 494 类别（技术雇主担保偏远地区）。",
        ),
      },
    ],
    anzsco: t(
      "ANZSCO versions: the Home Affairs list labels ANZSCO 2022 for subclass 186 and 482, and ANZSCO 2013 for all other visas on the list. Check the version shown for the visa you are researching.",
      "ANZSCO sürümleri: İçişleri Bakanlığı listesi, subclass 186 ve 482 için ANZSCO 2022’yi, listedeki diğer tüm vizeler için ANZSCO 2013’ü belirtir. Araştırdığınız vize için gösterilen sürümü kontrol edin.",
      "ANZSCO 版本：内政部清单对 186 和 482 类别标注 ANZSCO 2022，对清单上的其他所有签证标注 ANZSCO 2013。请核对您所研究签证对应的版本。",
    ),
    notEligibility: t(
      "A list shows where an occupation is placed. It does not say whether a person qualifies for a visa.",
      "Bir liste, mesleğin nerede yer aldığını gösterir. Bir kişinin vizeye uygun olup olmadığını söylemez.",
      "清单只显示职业的归属位置，并不说明某人是否符合签证条件。",
    ),
    toolsTitle: t("Related research tools", "İlgili araştırma araçları", "相关研究工具"),
    skillsLink: t("Skills Assessment Finder", "Beceri Değerlendirme Bulucu", "技能评估查询"),
    pointsLink: t("Australia Points Calculator", "Avustralya Puan Hesaplayıcı", "澳大利亚积分计算器"),
    indexTitle: t("Browse the occupation index", "Meslek dizinine göz atın", "浏览职业索引"),
    featuredTitle: t("Occupations with the most published detail", "En fazla yayımlanmış ayrıntıya sahip meslekler", "已公布信息最丰富的职业"),
    featuredNote: t(
      "Chosen by data completeness (authority, fee, list and state entries, invitation data), not by popularity.",
      "Veri bütünlüğüne göre seçilmiştir (kurum, ücret, liste ve eyalet kayıtları, davet verileri); popülerliğe göre değil.",
      "按数据完整度选取（机构、费用、清单与州条目、邀请数据），而非按热度。",
    ),
    faqTitle: t("Frequently asked questions", "Sık sorulan sorular", "常见问题"),
    faq: [
      {
        q: t("What is the Australian Skilled Occupation List?", "Avustralya Kalifiye Meslek Listesi nedir?", "澳大利亚技术职业清单是什么？"),
        a: t(
          "It is the Department of Home Affairs list that shows, for each ANZSCO occupation, which skilled occupation list or lists it sits on, the visa subclasses shown for it and its assessing authority.",
          "İçişleri Bakanlığı’nın, her ANZSCO mesleği için hangi kalifiye meslek listesinde yer aldığını, kendisi için gösterilen vize alt sınıflarını ve değerlendirme kurumunu gösteren listesidir.",
          "这是内政部的清单，针对每个 ANZSCO 职业列出其所属的技术职业清单、对应的签证子类及评估机构。",
        ),
      },
      {
        q: t("Is there an official Australian Skilled Occupation List 2026 PDF?", "Resmî bir 2026 Avustralya Kalifiye Meslek Listesi PDF’i var mı?", "是否有官方的 2026 年澳大利亚技术职业清单 PDF？"),
        a: t(
          "Home Affairs publishes the current list information on its Skilled Occupation List page, so check that page for the current official version and any documents it provides. LogiVisa’s PDF is its own dated compilation from that data, not an official document.",
          "İçişleri Bakanlığı güncel liste bilgilerini Skilled Occupation List sayfasında yayımlar; güncel resmî sürüm ve sunduğu belgeler için o sayfaya bakın. LogiVisa’nın PDF’i, bu verilerden derlenmiş kendi tarihli derlemesidir, resmî belge değildir.",
          "内政部在其“技术职业清单”页面发布当前清单信息，请查看该页面获取当前官方版本及其提供的文件。LogiVisa 的 PDF 是根据这些数据自行整理的带日期汇编，不是官方文件。",
        ),
      },
      {
        q: t("What are CSOL, MLTSSL, STSOL and ROL?", "CSOL, MLTSSL, STSOL ve ROL nedir?", "CSOL、MLTSSL、STSOL 和 ROL 是什么？"),
        a: t(
          "They are the Core Skills Occupation List, the Medium and Long-term Strategic Skills List, the Short-term Skilled Occupation List and the Regional Occupation List. Different lists relate to different visa subclasses, as summarised above.",
          "Sırasıyla Core Skills Occupation List, Medium and Long-term Strategic Skills List, Short-term Skilled Occupation List ve Regional Occupation List’tir. Yukarıda özetlendiği gibi farklı listeler farklı vize alt sınıflarıyla ilgilidir.",
          "分别是核心技能职业清单、中长期战略技能清单、短期技术职业清单和偏远地区职业清单。如上所述，不同清单对应不同的签证子类。",
        ),
      },
      {
        q: t("Which ANZSCO version does Australia use?", "Avustralya hangi ANZSCO sürümünü kullanır?", "澳大利亚使用哪个 ANZSCO 版本？"),
        a: t(
          "The Home Affairs list labels ANZSCO 2022 for subclass 186 and 482 and ANZSCO 2013 for all other visas on the list. Use the version shown for the visa you are researching.",
          "İçişleri Bakanlığı listesi subclass 186 ve 482 için ANZSCO 2022’yi, listedeki diğer tüm vizeler için ANZSCO 2013’ü belirtir. Araştırdığınız vize için gösterilen sürümü kullanın.",
          "内政部清单对 186 和 482 类别标注 ANZSCO 2022，对清单上的其他所有签证标注 ANZSCO 2013。请使用您所研究签证对应的版本。",
        ),
      },
      {
        q: t("Does being on a skilled occupation list mean I qualify for a visa?", "Bir kalifiye meslek listesinde olmak vizeye uygun olduğum anlamına gelir mi?", "职业在技术职业清单上是否意味着我符合签证条件？"),
        a: t(
          "No. A list shows where an occupation is placed; it does not decide eligibility. Visa requirements, skills assessment and any nomination are separate and are set out by Home Affairs and the relevant authorities.",
          "Hayır. Bir liste mesleğin yerini gösterir; uygunluğu belirlemez. Vize şartları, beceri değerlendirmesi ve olası aday gösterme ayrıdır ve İçişleri Bakanlığı ile ilgili kurumlarca belirlenir.",
          "不是。清单只显示职业的归属位置，并不决定资格。签证要求、技能评估和任何提名都是独立的，由内政部和相关机构规定。",
        ),
      },
      {
        q: t("How do I find my ANZSCO code?", "ANZSCO kodumu nasıl bulurum?", "如何查找我的 ANZSCO 代码？"),
        a: t(
          "Search the occupation title or code above, or use the ANZSCO finder. Each occupation page shows the ANZSCO code and title from the ABS classification with its source and date; check that the description matches the work described.",
          "Yukarıda meslek unvanını veya kodunu arayın ya da ANZSCO bulucuyu kullanın. Her meslek sayfası, ABS sınıflandırmasındaki ANZSCO kodunu ve unvanını kaynağı ve tarihiyle gösterir; tanımın anlatılan işle uyuştuğunu kontrol edin.",
          "在上方搜索职业名称或代码，或使用 ANZSCO 查询工具。每个职业页面会显示 ABS 分类中的 ANZSCO 代码和名称及其来源与日期；请核对描述是否与所从事的工作相符。",
        ),
      },
    ],
    sourcesTitle: t("Sources and dates", "Kaynaklar ve tarihler", "来源与日期"),
    sourcesLine: (dataDate: string, compiled: string) =>
      t(
        `LogiVisa occupation data is dated ${dataDate}; the reference PDF was compiled on ${compiled}. Official information is held by the Department of Home Affairs, and ANZSCO titles by the Australian Bureau of Statistics.`,
        `LogiVisa meslek verisinin tarihi ${dataDate}; referans PDF ${compiled} tarihinde derlendi. Resmî bilgiler İçişleri Bakanlığı’nda, ANZSCO unvanları Avustralya İstatistik Bürosu’ndadır.`,
        `LogiVisa 职业数据日期为 ${dataDate}；参考 PDF 整理于 ${compiled}。官方信息由澳大利亚内政部掌握，ANZSCO 名称由澳大利亚统计局掌握。`,
      ),
    homeAffairsSource: t("Department of Home Affairs — Skilled Occupation List", "İçişleri Bakanlığı — Skilled Occupation List", "内政部 — 技术职业清单"),
    absSource: t("Australian Bureau of Statistics — ANZSCO", "Avustralya İstatistik Bürosu — ANZSCO", "澳大利亚统计局 — ANZSCO"),
    assessmentPrompt: t("Want a structured report based on the information you enter?", "Girdiğiniz bilgilere dayalı yapılandırılmış bir rapor ister misiniz?", "想要基于您所填信息的结构化报告吗？"),
    assessmentLink: t("Start Assessment", "Değerlendirmeyi başlat", "开始评估"),
  };
}
