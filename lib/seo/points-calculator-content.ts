/**
 * Visible copy of /tools/points-calculator/australia (SEO Sprint 4). Every statement paraphrases the Department of Home Affairs pages for
 * subclasses 189, 190 and 491, the points table, the SkillSelect EOI pages and the invitation-rounds page (checked 2026-10-26; the visa pages are the
 * 23 September 2026 versions). It states published rules; it never predicts an invitation, quotes a generic cutoff or fixes a round frequency.
 * The calculator is arithmetic on the inputs the visitor enters.
 */
export const POINTS_CALC_CHECKED = "2026-10-26";

const HA = "https://immi.homeaffairs.gov.au";
export const POINTS_CALC_SOURCES = {
  pointsTable: `${HA}/visas/getting-a-visa/visa-listing/skilled-independent-189/points-table`,
  eoi: `${HA}/visas/working-in-australia/skillselect/expression-of-interest`,
  rounds: `${HA}/visas/working-in-australia/skillselect/invitation-rounds`,
  v189: `${HA}/visas/getting-a-visa/visa-listing/skilled-independent-189/points-tested`,
  v190: `${HA}/visas/getting-a-visa/visa-listing/skilled-nominated-190`,
  v491: `${HA}/visas/getting-a-visa/visa-listing/skilled-work-regional-provisional-491`,
} as const;

export interface PointsCalcContent {
  meta: { title: string; description: string };
  h1: string;
  /** Concise visible intro under the H1. */
  intro: string;
  differ: { heading: string; intro: string; items: Array<{ subclass: "189" | "190" | "491"; title: string; text: string }>; note: string };
  factors: { heading: string; intro: string; items: Array<{ name: string; text: string }> };
  enough: { heading: string; paragraphs: string[] };
  eoi: { heading: string; items: string[] };
  faqTitle: string;
  faqs: Array<{ q: string; a: string }>;
  links: { heading: string; items: Array<{ label: string; path: string; destination?: string }> };
  sources: { heading: string; checked: string; items: Array<{ label: string; url: string }> };
  cta: { text: string; button: string };
}

const content: Record<string, PointsCalcContent> = {
  en: {
    meta: {
      title: "Australia Visa Points Calculator 2026 | 189, 190 & 491",
      description:
        "Adds the published points for age, English, skilled employment, education, partner factors, Australian study and nomination where applicable (189, 190, 491). An estimate from your inputs; it does not determine an invitation or visa outcome.",
    },
    h1: "Australia Visa Points Calculator 2026",
    intro:
      "This calculator adds the published points factors used for subclass 189, 190 and 491 from the details you enter, including when you use it as a 491 visa points calculator. 65 points is the published points threshold; meeting it does not guarantee an invitation. The result is an estimate based on your inputs and does not determine an invitation or visa outcome.",
    differ: {
      heading: "How points differ for 189, 190 and 491",
      intro: "The points table is the same for all three; only the nomination or sponsorship factor differs.",
      items: [
        { subclass: "189", title: "Subclass 189 (Skilled Independent)", text: "No state or territory nomination points. Home Affairs periodically runs invitation rounds and ranks the EOIs in SkillSelect." },
        { subclass: "190", title: "Subclass 190 (Skilled Nominated)", text: "A state or territory nomination contributes 5 points when it applies. State and territory agencies consider EOIs and decide whether to nominate; a nomination in SkillSelect triggers an invitation." },
        { subclass: "491", title: "Subclass 491 (Skilled Work Regional)", text: "A nomination by a state or territory agency, or sponsorship by a relative in a designated regional area, contributes 15 points according to the published points table. State and territory agencies decide on their own nominations; family-sponsored EOIs are invited by Home Affairs in rounds." },
      ],
      note: "The calculator adds nomination points only when you select that factor. A nomination is never assumed, and these are not the same national ranking process for all three subclasses.",
    },
    factors: {
      heading: "What contributes to the score",
      intro: "The factors the calculator uses, with the published points range for each:",
      items: [
        { name: "Age", text: "up to 30 points (ages 25–32); fewer points in other bands up to 44, none from 45." },
        { name: "English language", text: "0 for Competent, 10 for Proficient, 20 for Superior." },
        { name: "Skilled employment outside Australia", text: "up to 15 points, by years in the nominated occupation." },
        { name: "Skilled employment in Australia", text: "up to 20 points, by years in the nominated occupation." },
        { name: "Combined employment cap", text: "overseas and Australian employment together count for at most 20 points." },
        { name: "Educational qualifications", text: "up to 20 points for a doctorate, 15 for a bachelor's or master's degree, 10 for a diploma or trade qualification." },
        { name: "Australian study requirement", text: "5 points for study in Australia that meets the published requirement." },
        { name: "Specialist educational qualification", text: "10 points for a master's by research or doctorate in a STEM field from an Australian institution." },
        { name: "Credentialled community language", text: "5 points." },
        { name: "Study in regional Australia", text: "5 points." },
        { name: "Partner skills", text: "up to 10 points, depending on the partner's skills assessment and English, or on having no partner." },
        { name: "Professional Year in Australia", text: "5 points." },
        { name: "Nomination or sponsorship", text: "5 points for a state or territory nomination (190); 15 points for a nomination or family sponsorship (491)." },
      ],
    },
    enough: {
      heading: "Is 65 points enough for an Australian skilled visa?",
      paragraphs: [
        "65 points is the published points threshold for subclass 189, 190 and 491. Meeting it does not guarantee an invitation: Home Affairs says not everyone who submits an EOI receives one.",
        "Invitation outcomes depend on the program and process. For subclass 189, outcomes can vary between rounds and occupations. For subclass 190 and nominated 491, states and territories control their own nomination processes.",
        "This page gives no personal probability and no generic cutoff range. Published results of past rounds are on the invitation rounds page.",
      ],
    },
    eoi: {
      heading: "Points calculator vs SkillSelect EOI",
      items: [
        "This LogiVisa tool is only a calculator. It does not submit an EOI and has no link to your EOI.",
        "An EOI is submitted through the Australian Government's SkillSelect.",
        "The official process expects a skills assessment for the nominated occupation before the EOI is submitted.",
        "SkillSelect gives an indicative points score based on the claims entered in the EOI.",
        "An EOI stays active for up to 2 years unless another event removes it.",
      ],
    },
    faqTitle: "Frequently asked questions",
    faqs: [
      { q: "What is the Australian skilled migration points test?", a: "It is the points table used for subclass 189, 190 and 491. It awards points for factors such as age, English, skilled employment, education and, where it applies, nomination or sponsorship. SkillSelect gives an indicative score based on the claims in an EOI." },
      { q: "What is the minimum points threshold for 189, 190 and 491?", a: "The published threshold is 65 points for all three. Home Affairs says it will not invite an EOI below 65 points. An invitation states the points that must be scored when the application is assessed, which can be higher than 65 depending on the claims." },
      { q: "Does 65 points guarantee an invitation?", a: "No. 65 points is a threshold, not a guarantee. Home Affairs says not everyone who submits an EOI receives an invitation, and outcomes depend on the program and process." },
      { q: "How many points does subclass 190 nomination add?", a: "A state or territory nomination adds 5 points for subclass 190 when it applies. The calculator adds them only when you select the nomination factor." },
      { q: "How many points does subclass 491 nomination add?", a: "A nomination by a state or territory agency, or family sponsorship in a designated regional area, adds 15 points for subclass 491 according to the published points table. The calculator adds them only when you select that factor." },
      { q: "Do I need a skills assessment before submitting an EOI?", a: "The official process expects a skills assessment for the nominated occupation before the EOI is submitted, and the EOI records the assessment details. A suitable assessment must also still be valid when an invitation is issued." },
      { q: "How long does an EOI stay active?", a: "An EOI stays active for up to 2 years from submission unless another event removes it. Home Affairs says an invitation could be received up to 2 years after submitting an EOI." },
      { q: "Can my points change after I submit an EOI?", a: "An EOI can be updated in SkillSelect before an invitation, for example after a new qualification, new work experience or a change in circumstances. SkillSelect updates the indicative score, and the claims must be supported with evidence if an invitation is issued." },
      { q: "Does this calculator decide whether I will get a visa?", a: "No. It adds published points values to the details you enter. It does not assess evidence, check an occupation list or skills assessment, or decide an invitation or visa outcome. Home Affairs and state and territory agencies make those decisions." },
      { q: "Does the calculator include subclass 482 or 186?", a: "No. Subclass 482 and 186 are employer-sponsored visas and are not points-tested in the way 189, 190 and 491 are." },
    ],
    links: {
      heading: "Related research",
      items: [
        { label: "Skilled occupation list", path: "/occupations", destination: "occupation_list" },
        { label: "Skills Assessment Finder", path: "/tools/skills-assessment", destination: "skills_assessment" },
        { label: "ANZSCO Finder", path: "/tools/anzsco-finder", destination: "anzsco_finder" },
        { label: "Visa comparison", path: "/tools/visa-comparison", destination: "visa_comparison" },
        { label: "State nomination research", path: "/tools/state-nomination", destination: "state_nomination" },
        { label: "Invitation rounds", path: "/tools/invitation-rounds", destination: "invitation_rounds" },
        { label: "Subclass 189 information", path: "/visas/189" },
        { label: "Subclass 190 information", path: "/visas/190" },
        { label: "Subclass 491 information", path: "/visas/491" },
      ],
    },
    sources: {
      heading: "Official sources",
      checked: "Checked",
      items: [
        { label: "Home Affairs points table", url: POINTS_CALC_SOURCES.pointsTable },
        { label: "SkillSelect expression of interest", url: POINTS_CALC_SOURCES.eoi },
        { label: "SkillSelect invitation rounds", url: POINTS_CALC_SOURCES.rounds },
        { label: "Subclass 189", url: POINTS_CALC_SOURCES.v189 },
        { label: "Subclass 190", url: POINTS_CALC_SOURCES.v190 },
        { label: "Subclass 491", url: POINTS_CALC_SOURCES.v491 },
      ],
    },
    cta: { text: "Create a structured report based on the information you enter.", button: "Start Assessment" },
  },

  tr: {
    meta: {
      title: "Avustralya Vize Puan Hesaplayıcı 2026 | 189, 190 ve 491",
      description:
        "Yaş, İngilizce, nitelikli iş deneyimi, eğitim, eş, Avustralya'da eğitim ve geçerliyse aday gösterme için yayımlanmış puanları toplar (189, 190, 491). Girdilerinize dayalı bir tahmindir; davet veya vize sonucunu belirlemez.",
    },
    h1: "Avustralya Vize Puan Hesaplayıcı 2026",
    intro:
      "Bu hesaplayıcı, girdiğiniz bilgilerle 189, 190 ve 491 alt sınıfları için kullanılan yayımlanmış puan faktörlerini toplar; 491 vizesi puan hesaplayıcısı olarak da kullanılabilir. 65 puan yayımlanmış puan eşiğidir; eşiği karşılamak davet almayı garanti etmez. Sonuç, girdilerinize dayalı bir tahmindir ve davet veya vize sonucunu belirlemez.",
    differ: {
      heading: "189, 190 ve 491 için puanlar nasıl farklılaşır?",
      intro: "Puan tablosu üçü için aynıdır; yalnızca aday gösterme veya sponsorluk faktörü farklıdır.",
      items: [
        { subclass: "189", title: "Alt sınıf 189 (Skilled Independent)", text: "Eyalet veya bölge adaylığı puanı yoktur. İçişleri Bakanlığı (Home Affairs) zaman zaman davet rauntları düzenler ve SkillSelect'teki EOI'leri sıralar." },
        { subclass: "190", title: "Alt sınıf 190 (Skilled Nominated)", text: "Eyalet veya bölge adaylığı, geçerli olduğunda 5 puan sağlar. Eyalet ve bölge kurumları EOI'leri değerlendirir ve aday gösterip göstermeyeceğine karar verir; SkillSelect'te bir aday gösterme davetin başlamasını sağlar." },
        { subclass: "491", title: "Alt sınıf 491 (Skilled Work Regional)", text: "Bir eyalet veya bölge kurumunun adaylığı ya da belirlenmiş bölgesel alandaki bir akrabanın sponsorluğu, yayımlanmış puan tablosuna göre 15 puan sağlar. Eyalet ve bölge kurumları kendi adaylıklarına karar verir; aile sponsorluğundaki EOI'leri Home Affairs raundlarda davet eder." },
      ],
      note: "Hesaplayıcı aday gösterme puanlarını yalnızca bu faktörü seçtiğinizde ekler. Aday gösterme hiçbir zaman varsayılmaz ve üç alt sınıf aynı ulusal sıralama sürecini kullanmaz.",
    },
    factors: {
      heading: "Puana neler katkı yapar?",
      intro: "Hesaplayıcının kullandığı faktörler ve her biri için yayımlanmış puan aralığı:",
      items: [
        { name: "Yaş", text: "en fazla 30 puan (25–32 yaş); diğer bantlarda 44 yaşına kadar daha az, 45 yaşından itibaren puan yok." },
        { name: "İngilizce", text: "Competent için 0, Proficient için 10, Superior için 20." },
        { name: "Avustralya dışında nitelikli iş deneyimi", text: "aday gösterilen meslekte yıla göre en fazla 15 puan." },
        { name: "Avustralya'da nitelikli iş deneyimi", text: "aday gösterilen meslekte yıla göre en fazla 20 puan." },
        { name: "Birleşik iş deneyimi sınırı", text: "yurt dışı ve Avustralya deneyimi birlikte en fazla 20 puan sayılır." },
        { name: "Eğitim nitelikleri", text: "doktora için en fazla 20, lisans veya yüksek lisans için 15, diploma veya meslek niteliği için 10 puan." },
        { name: "Avustralya'da eğitim koşulu", text: "yayımlanmış koşulu karşılayan Avustralya'daki eğitim için 5 puan." },
        { name: "Uzmanlık eğitim niteliği", text: "Avustralya'daki bir kurumdan STEM alanında araştırmaya dayalı yüksek lisans veya doktora için 10 puan." },
        { name: "Belgelendirilmiş toplum dili", text: "5 puan." },
        { name: "Bölgesel Avustralya'da eğitim", text: "5 puan." },
        { name: "Eşin becerileri", text: "eşin beceri değerlendirmesine ve İngilizcesine veya eşin bulunmamasına bağlı olarak en fazla 10 puan." },
        { name: "Avustralya'da Professional Year", text: "5 puan." },
        { name: "Aday gösterme veya sponsorluk", text: "eyalet veya bölge adaylığı (190) için 5 puan; aday gösterme veya aile sponsorluğu (491) için 15 puan." },
      ],
    },
    enough: {
      heading: "65 puan, Avustralya nitelikli vizesi için yeterli mi?",
      paragraphs: [
        "65 puan, 189, 190 ve 491 alt sınıfları için yayımlanmış puan eşiğidir. Eşiği karşılamak davet almayı garanti etmez: Home Affairs, EOI sunan herkesin davet almadığını belirtir.",
        "Davet sonuçları programa ve sürece bağlıdır. 189 alt sınıfında sonuçlar raundlara ve mesleklere göre değişebilir. 190 ve aday gösterilen 491 için eyaletler ve bölgeler kendi aday gösterme süreçlerini yönetir.",
        "Bu sayfa kişiye özel bir olasılık veya genel bir kesim puanı aralığı vermez. Geçmiş raundların yayımlanmış sonuçları davet rauntları sayfasındadır.",
      ],
    },
    eoi: {
      heading: "Puan hesaplayıcı ile SkillSelect EOI farkı",
      items: [
        "Bu LogiVisa aracı yalnızca bir hesaplayıcıdır. EOI sunmaz ve EOI'nizle bağlantısı yoktur.",
        "EOI, Avustralya Hükümeti'nin SkillSelect sistemi üzerinden sunulur.",
        "Resmî süreç, EOI sunulmadan önce aday gösterilen meslek için bir beceri değerlendirmesi bekler.",
        "SkillSelect, EOI'de girilen beyanlara göre gösterge niteliğinde bir puan verir.",
        "Bir EOI, başka bir olay onu kaldırmadıkça en fazla 2 yıl boyunca aktif kalır.",
      ],
    },
    faqTitle: "Sık sorulan sorular",
    faqs: [
      { q: "Avustralya nitelikli göçmenlik puan testi nedir?", a: "189, 190 ve 491 alt sınıfları için kullanılan puan tablosudur. Yaş, İngilizce, nitelikli iş deneyimi, eğitim ve geçerliyse aday gösterme veya sponsorluk gibi faktörlere puan verir. SkillSelect, EOI'deki beyanlara göre gösterge niteliğinde bir puan verir." },
      { q: "189, 190 ve 491 için asgari puan eşiği nedir?", a: "Yayımlanmış eşik üçü için de 65 puandır. Home Affairs, 65 puanın altındaki bir EOI'yi davet etmeyeceğini belirtir. Davet, başvuru değerlendirilirken alınması gereken puanı belirtir; bu puan beyanlara bağlı olarak 65'ten yüksek olabilir." },
      { q: "65 puan davet almayı garanti eder mi?", a: "Hayır. 65 puan bir eşiktir, garanti değildir. Home Affairs, EOI sunan herkesin davet almadığını belirtir; sonuçlar programa ve sürece bağlıdır." },
      { q: "190 aday gösterme kaç puan ekler?", a: "Bir eyalet veya bölge adaylığı, geçerli olduğunda 190 alt sınıfı için 5 puan ekler. Hesaplayıcı bu puanları yalnızca aday gösterme faktörünü seçtiğinizde ekler." },
      { q: "491 aday gösterme kaç puan ekler?", a: "Bir eyalet veya bölge kurumunun adaylığı ya da belirlenmiş bölgesel alanda aile sponsorluğu, yayımlanmış puan tablosuna göre 491 alt sınıfı için 15 puan ekler. Hesaplayıcı bu puanları yalnızca o faktörü seçtiğinizde ekler." },
      { q: "EOI sunmadan önce beceri değerlendirmesi gerekir mi?", a: "Resmî süreç, EOI sunulmadan önce aday gösterilen meslek için bir beceri değerlendirmesi bekler ve EOI değerlendirme bilgilerini kaydeder. Uygun bir değerlendirme, davet verildiğinde de geçerli olmalıdır." },
      { q: "Bir EOI ne kadar süre aktif kalır?", a: "Bir EOI, başka bir olay onu kaldırmadıkça sunulduğu tarihten itibaren en fazla 2 yıl aktif kalır. Home Affairs, EOI sunulduktan sonra en fazla 2 yıl içinde davet alınabileceğini belirtir." },
      { q: "EOI sunduktan sonra puanlarım değişebilir mi?", a: "EOI, davetten önce SkillSelect üzerinden güncellenebilir; örneğin yeni bir nitelik, yeni iş deneyimi veya koşullarda değişiklik olduğunda. SkillSelect gösterge puanı günceller ve davet verilirse beyanların kanıtlarla desteklenmesi gerekir." },
      { q: "Bu hesaplayıcı vize alıp almayacağımı belirler mi?", a: "Hayır. Girdiğiniz bilgilere yayımlanmış puan değerlerini ekler. Kanıtları değerlendirmez, meslek listesini veya beceri değerlendirmesini denetlemez, davet veya vize sonucunu belirlemez. Bu kararları Home Affairs ile eyalet ve bölge kurumları verir." },
      { q: "Hesaplayıcı 482 veya 186 alt sınıfını kapsıyor mu?", a: "Hayır. 482 ve 186 işveren sponsorluğundaki vizelerdir ve 189, 190 ve 491 gibi puan testine tabi değildir." },
    ],
    links: {
      heading: "İlgili araştırmalar",
      items: [
        { label: "Nitelikli meslek listesi", path: "/occupations", destination: "occupation_list" },
        { label: "Beceri Değerlendirme Bulucu", path: "/tools/skills-assessment", destination: "skills_assessment" },
        { label: "ANZSCO Bulucu", path: "/tools/anzsco-finder", destination: "anzsco_finder" },
        { label: "Vize karşılaştırması", path: "/tools/visa-comparison", destination: "visa_comparison" },
        { label: "Eyalet adaylığı araştırması", path: "/tools/state-nomination", destination: "state_nomination" },
        { label: "Davet rauntları", path: "/tools/invitation-rounds", destination: "invitation_rounds" },
        { label: "Alt sınıf 189 bilgileri", path: "/visas/189" },
        { label: "Alt sınıf 190 bilgileri", path: "/visas/190" },
        { label: "Alt sınıf 491 bilgileri", path: "/visas/491" },
      ],
    },
    sources: {
      heading: "Resmî kaynaklar",
      checked: "Kontrol",
      items: [
        { label: "Home Affairs puan tablosu", url: POINTS_CALC_SOURCES.pointsTable },
        { label: "SkillSelect EOI", url: POINTS_CALC_SOURCES.eoi },
        { label: "SkillSelect davet rauntları", url: POINTS_CALC_SOURCES.rounds },
        { label: "Alt sınıf 189", url: POINTS_CALC_SOURCES.v189 },
        { label: "Alt sınıf 190", url: POINTS_CALC_SOURCES.v190 },
        { label: "Alt sınıf 491", url: POINTS_CALC_SOURCES.v491 },
      ],
    },
    cta: { text: "Girdiğiniz bilgilere dayalı yapılandırılmış bir rapor oluşturun.", button: "Değerlendirme Başlat" },
  },

  "zh-Hans": {
    meta: {
      title: "澳大利亚签证积分计算器 2026 | 189、190 和 491",
      description:
        "累加年龄、英语、技术工作经验、学历、配偶因素、澳大利亚学习以及适用时的提名所对应的已公布积分（189、190、491）。结果是基于您所填信息的估算，不决定邀请或签证结果。",
    },
    h1: "澳大利亚签证积分计算器 2026",
    intro:
      "本计算器根据您填写的信息，累加 189、190 和 491 子类所使用的已公布积分项目，也可用作 491 签证积分计算器。65 分是已公布的积分门槛；达到门槛并不保证获得邀请。结果是基于您所填信息的估算，不决定邀请或签证结果。",
    differ: {
      heading: "189、190 和 491 的积分有何不同",
      intro: "三者使用同一张积分表，只有提名或担保项目不同。",
      items: [
        { subclass: "189", title: "189 子类（Skilled Independent）", text: "没有州或领地提名积分。内政部（Home Affairs）定期举行邀请轮次，并对 SkillSelect 中的 EOI 排序。" },
        { subclass: "190", title: "190 子类（Skilled Nominated）", text: "州或领地提名在适用时计 5 分。州和领地机构审议 EOI 并决定是否提名；SkillSelect 中的提名会触发邀请。" },
        { subclass: "491", title: "491 子类（Skilled Work Regional）", text: "州或领地机构的提名，或指定地区亲属的担保，按已公布的积分表计 15 分。州和领地机构自行决定其提名；家庭担保的 EOI 由内政部在邀请轮次中发出邀请。" },
      ],
      note: "只有当您选择该项目时，计算器才会加上提名积分。提名从不被默认假设，三个子类也并不使用同一个全国性的排序流程。",
    },
    factors: {
      heading: "哪些项目计入积分",
      intro: "计算器使用的项目及各自已公布的积分范围：",
      items: [
        { name: "年龄", text: "最高 30 分（25–32 岁）；其他年龄段至 44 岁分数较低，45 岁起不计分。" },
        { name: "英语", text: "Competent 0 分，Proficient 10 分，Superior 20 分。" },
        { name: "澳大利亚境外技术工作经验", text: "按提名职业的年限，最高 15 分。" },
        { name: "澳大利亚境内技术工作经验", text: "按提名职业的年限，最高 20 分。" },
        { name: "工作经验合计上限", text: "境外与澳大利亚工作经验合计最多计 20 分。" },
        { name: "学历", text: "博士最高 20 分，学士或硕士 15 分，文凭或职业资质 10 分。" },
        { name: "澳大利亚学习要求", text: "满足已公布要求的澳大利亚学习计 5 分。" },
        { name: "专业学历", text: "澳大利亚院校 STEM 领域的研究型硕士或博士计 10 分。" },
        { name: "认证社区语言", text: "5 分。" },
        { name: "在澳大利亚地区学习", text: "5 分。" },
        { name: "配偶技能", text: "根据配偶的技能评估和英语水平，或无配偶，最高 10 分。" },
        { name: "澳大利亚 Professional Year", text: "5 分。" },
        { name: "提名或担保", text: "州或领地提名（190）5 分；提名或家庭担保（491）15 分。" },
      ],
    },
    enough: {
      heading: "65 分够申请澳大利亚技术签证吗？",
      paragraphs: [
        "65 分是 189、190 和 491 子类已公布的积分门槛。达到门槛并不保证获得邀请：内政部表示，并非每位提交 EOI 的人都会收到邀请。",
        "邀请结果取决于具体项目和流程。189 子类的结果可能因轮次和职业而异。对于 190 以及获提名的 491，各州和领地自行掌握其提名流程。",
        "本页不提供个人概率，也不给出通用的分数线范围。以往轮次的已公布结果见邀请轮次页面。",
      ],
    },
    eoi: {
      heading: "积分计算器与 SkillSelect EOI 的区别",
      items: [
        "LogiVisa 的这个工具只是一个计算器，不会提交 EOI，也与您的 EOI 没有关联。",
        "EOI 通过澳大利亚政府的 SkillSelect 提交。",
        "官方流程要求在提交 EOI 之前，已有针对所提名职业的技能评估。",
        "SkillSelect 会根据 EOI 中填写的声明给出一个参考性积分。",
        "除非有其他情形将其移除，EOI 最长保持有效 2 年。",
      ],
    },
    faqTitle: "常见问题",
    faqs: [
      { q: "什么是澳大利亚技术移民积分测试？", a: "它是 189、190 和 491 子类使用的积分表，对年龄、英语、技术工作经验、学历以及适用时的提名或担保等项目计分。SkillSelect 会根据 EOI 中的声明给出一个参考性积分。" },
      { q: "189、190 和 491 的最低积分门槛是多少？", a: "三者已公布的门槛均为 65 分。内政部表示不会邀请低于 65 分的 EOI。邀请函会写明申请审理时必须达到的分数，视声明内容可能高于 65 分。" },
      { q: "65 分能保证获得邀请吗？", a: "不能。65 分是门槛，而不是保证。内政部表示，并非每位提交 EOI 的人都会收到邀请，结果取决于具体项目和流程。" },
      { q: "190 的提名加多少分？", a: "州或领地提名在适用时为 190 子类加 5 分。只有当您选择提名项目时，计算器才会加上这些分数。" },
      { q: "491 的提名加多少分？", a: "按已公布的积分表，州或领地机构的提名或指定地区的家庭担保为 491 子类加 15 分。只有当您选择该项目时，计算器才会加上这些分数。" },
      { q: "提交 EOI 之前需要先有技能评估吗？", a: "官方流程要求在提交 EOI 之前，已有针对所提名职业的技能评估，EOI 会记录评估的相关信息。发出邀请时，合适的评估也必须仍然有效。" },
      { q: "EOI 能保持有效多久？", a: "除非有其他情形将其移除，EOI 自提交之日起最长保持有效 2 年。内政部表示，在提交 EOI 后最长 2 年内都可能收到邀请。" },
      { q: "提交 EOI 后我的积分会变化吗？", a: "在收到邀请之前，可以通过 SkillSelect 更新 EOI，例如取得新学历、积累新的工作经验或情况发生变化。SkillSelect 会更新参考积分；如果获得邀请，声明必须有证据支持。" },
      { q: "这个计算器能决定我是否会获得签证吗？", a: "不能。它只是把已公布的积分值加到您填写的信息上，不评估证据，不核对职业清单或技能评估，也不决定邀请或签证结果。这些决定由内政部以及各州和领地机构作出。" },
      { q: "计算器包含 482 或 186 子类吗？", a: "不包含。482 和 186 是雇主担保签证，不像 189、190 和 491 那样进行积分测试。" },
    ],
    links: {
      heading: "相关研究",
      items: [
        { label: "技术职业清单", path: "/occupations", destination: "occupation_list" },
        { label: "技能评估查询", path: "/tools/skills-assessment", destination: "skills_assessment" },
        { label: "ANZSCO 查询", path: "/tools/anzsco-finder", destination: "anzsco_finder" },
        { label: "签证对比", path: "/tools/visa-comparison", destination: "visa_comparison" },
        { label: "州担保研究", path: "/tools/state-nomination", destination: "state_nomination" },
        { label: "邀请轮次", path: "/tools/invitation-rounds", destination: "invitation_rounds" },
        { label: "189 子类信息", path: "/visas/189" },
        { label: "190 子类信息", path: "/visas/190" },
        { label: "491 子类信息", path: "/visas/491" },
      ],
    },
    sources: {
      heading: "官方来源",
      checked: "核对",
      items: [
        { label: "内政部积分表", url: POINTS_CALC_SOURCES.pointsTable },
        { label: "SkillSelect 意向表达（EOI）", url: POINTS_CALC_SOURCES.eoi },
        { label: "SkillSelect 邀请轮次", url: POINTS_CALC_SOURCES.rounds },
        { label: "189 子类", url: POINTS_CALC_SOURCES.v189 },
        { label: "190 子类", url: POINTS_CALC_SOURCES.v190 },
        { label: "491 子类", url: POINTS_CALC_SOURCES.v491 },
      ],
    },
    cta: { text: "根据您输入的信息生成结构化报告。", button: "开始评估" },
  },
};

export function getPointsCalcSeoContent(locale: string): PointsCalcContent {
  return content[locale] ?? content.en;
}

export function buildPointsCalcSchema(locale: string): string {
  const c = getPointsCalcSeoContent(locale);
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  });
}
