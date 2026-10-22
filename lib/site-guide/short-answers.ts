/**
 * Concise, fixed answers for keyword-style input ("190", "software engineer", "Canada", "points"). Each entry is an alias list, a one-to-three
 * sentence factual description of a page LogiVisa already publishes, and the registry destinations to open. Nothing here concludes anything about
 * the person: no eligibility, recommendation, ranking or prediction.
 */
import type { GuideCountry, L3 } from "./types";

const t = (en: string, tr: string, zh: string): L3 => ({ en, tr, "zh-Hans": zh });

export type LinkSpec = { id: string; path?: string; query?: string; title?: L3 };
export type ShortAnswer = {
  aliases: string[];
  country: GuideCountry | "ANY";
  message: L3;
  links: LinkSpec[];
};

const OCC = (code: string, slug: string, en: string): LinkSpec => ({ id: "au-occupations", path: `/occupations/${code}-${slug}`, title: t(en, en, en) });
const FINDER_TITLE = t("Skills Assessment Finder", "Beceri Değerlendirme Bulucu", "技能评估查询");

export const SHORT_ANSWERS: ShortAnswer[] = [
  // ── Australian visas ───────────────────────────────────────────────────────
  { aliases: ["190", "subclass 190", "skilled nominated", "skilled nominated visa", "190 visa", "visa 190"], country: "AU",
    message: t("Subclass 190 is a permanent skilled visa that requires nomination by an Australian state or territory. It is points-tested and requires an invitation to apply.",
      "190 alt sınıfı, bir Avustralya eyaleti veya bölgesi tarafından aday gösterilmeyi gerektiren kalıcı bir nitelikli vizedir. Puan testine tabidir ve başvuru için davet gerekir.",
      "190 子类是需要澳大利亚州或领地提名的永久技术签证，需通过积分测试并获得邀请后方可申请。"),
    links: [{ id: "au-visa-190", title: t("View subclass 190", "190 alt sınıfını görüntüle", "查看 190 子类") }, { id: "au-visa-comparison", path: "/tools/visa-comparison/189-vs-190", title: t("Compare 189 and 190", "189 ve 190 karşılaştırması", "对比 189 与 190") }, { id: "au-points-calculator", title: t("Check points", "Puanları kontrol et", "查看积分") }] },
  { aliases: ["189", "subclass 189", "skilled independent", "skilled independent visa", "189 visa", "visa 189"], country: "AU",
    message: t("Subclass 189 is a permanent skilled visa that is points-tested and needs an invitation, with no state or employer nomination.",
      "189 alt sınıfı, puan testine tabi ve davet gerektiren; eyalet veya işveren adaylığı gerektirmeyen kalıcı bir nitelikli vizedir.",
      "189 子类是需通过积分测试并获得邀请的永久技术签证，无需州或雇主提名。"),
    links: [{ id: "au-visa-189", title: t("View subclass 189", "189 alt sınıfını görüntüle", "查看 189 子类") }, { id: "au-visa-comparison", path: "/tools/visa-comparison/189-vs-190", title: t("Compare 189 and 190", "189 ve 190 karşılaştırması", "对比 189 与 190") }, { id: "au-points-calculator", title: t("Check points", "Puanları kontrol et", "查看积分") }] },
  { aliases: ["491", "subclass 491", "skilled work regional", "skilled work regional visa", "491 visa", "visa 491"], country: "AU",
    message: t("Subclass 491 is a provisional skilled regional visa. It requires nomination by a state or territory, or sponsorship by an eligible relative.",
      "491 alt sınıfı, geçici bir bölgesel nitelikli vizedir. Bir eyalet veya bölge tarafından aday gösterilmeyi ya da uygun bir akraba sponsorluğunu gerektirir.",
      "491 子类是临时技术类偏远地区签证，需要州或领地提名，或合资格亲属担保。"),
    links: [{ id: "au-visa-491", title: t("View subclass 491", "491 alt sınıfını görüntüle", "查看 491 子类") }, { id: "au-state-nomination" }, { id: "au-points-calculator", title: t("Check points", "Puanları kontrol et", "查看积分") }] },
  { aliases: ["482", "subclass 482", "482 visa", "visa 482", "employer sponsored", "employer sponsored visa"], country: "AU",
    message: t("Subclass 482 is a temporary skills visa for employer-sponsored work in Australia.",
      "482 alt sınıfı, Avustralya'da işveren sponsorluğuyla çalışmak için geçici bir beceri vizesidir.",
      "482 子类是在澳大利亚由雇主担保工作的临时技术签证。"),
    links: [{ id: "au-visa-482", title: t("View subclass 482", "482 alt sınıfını görüntüle", "查看 482 子类") }, { id: "au-visa-comparison" }] },
  { aliases: ["485", "subclass 485", "485 visa", "visa 485", "graduate visa", "temporary graduate"], country: "AU",
    message: t("Subclass 485 is a temporary graduate visa for eligible people who recently finished study in Australia.",
      "485 alt sınıfı, Avustralya'da yakın zamanda eğitimini tamamlayan uygun kişiler için geçici bir mezun vizesidir.",
      "485 子类是面向近期在澳大利亚完成学业者的临时毕业生签证。"),
    links: [{ id: "au-visa-485", title: t("View subclass 485", "485 alt sınıfını görüntüle", "查看 485 子类") }, { id: "au-visa-comparison" }] },
  { aliases: ["500", "subclass 500", "500 visa", "visa 500", "student visa"], country: "AU",
    message: t("Subclass 500 is the Australian student visa for full-time study with a registered provider.",
      "500 alt sınıfı, kayıtlı bir kurumda tam zamanlı eğitim için Avustralya öğrenci vizesidir.",
      "500 子类是在注册院校全日制学习的澳大利亚学生签证。"),
    links: [{ id: "au-visa-500", title: t("View subclass 500", "500 alt sınıfını görüntüle", "查看 500 子类") }] },

  // ── Australian occupations and tools ───────────────────────────────────────
  { aliases: ["software engineer", "261313", "software developer", "software engineers", "yazılım mühendisi", "软件工程师"], country: "AU",
    message: t("Software Engineer is ANZSCO 261313 in LogiVisa’s Australian occupation research. You can also view the relevant skills-assessment information.",
      "Yazılım Mühendisi, LogiVisa'nın Avustralya meslek araştırmasında ANZSCO 261313'tür. İlgili beceri değerlendirme bilgilerine de bakabilirsiniz.",
      "软件工程师在 LogiVisa 的澳大利亚职业研究中对应 ANZSCO 261313，您也可以查看相关技能评估信息。"),
    links: [OCC("261313", "software-engineer", "Software Engineer"), { id: "au-skills-assessment", query: "?q=261313", title: FINDER_TITLE }, { id: "au-visas-hub", title: t("Visa research", "Vize araştırması", "签证研究") }] },
  { aliases: ["chef", "351311", "şef", "厨师"], country: "AU",
    message: t("LogiVisa has occupation and skills-assessment research for Chef.",
      "LogiVisa'nın Aşçı/Şef için meslek ve beceri değerlendirme araştırması var.",
      "LogiVisa 提供厨师的职业与技能评估研究。"),
    links: [OCC("351311", "chef", "Chef occupation"), { id: "au-skills-assessment", query: "?q=chef", title: FINDER_TITLE }, { id: "au-guide-chef-vs-cook", title: t("Chef vs Cook guide", "Şef ve Aşçı rehberi", "厨师与厨工指南") }] },
  { aliases: ["skills assessment", "skill assessment", "skills assessments", "assessing authority", "beceri değerlendirmesi", "技能评估"], country: "AU",
    message: t("A skills assessment is an assessing authority’s check of skills against an occupation. LogiVisa shows the published authority for each occupation.",
      "Beceri değerlendirmesi, bir değerlendirme kurumunun becerileri bir meslekle karşılaştırarak incelemesidir. LogiVisa her meslek için yayımlanmış kurumu gösterir.",
      "技能评估是评估机构依据某职业对技能进行的审核。LogiVisa 展示每个职业已公布的评估机构。"),
    links: [{ id: "au-skills-assessment" }, { id: "au-anzsco-finder", title: t("Find my occupation", "Mesleğimi bul", "查找我的职业") }, { id: "au-guide-skills-assessment-vs-eligibility" }] },
  { aliases: ["state nomination", "state sponsorship", "nomination", "eyalet adaylığı", "州担保"], country: "AU",
    message: t("State and territory nomination is how an Australian state or territory nominates skilled applicants for visas such as 190 and 491.",
      "Eyalet ve bölge adaylığı, bir Avustralya eyaletinin veya bölgesinin 190 ve 491 gibi vizeler için nitelikli başvuru sahiplerini aday göstermesidir.",
      "州或领地提名是澳大利亚各州或领地为 190、491 等签证提名技术申请人的方式。"),
    links: [{ id: "au-state-nomination" }, { id: "au-visa-190", title: t("View subclass 190", "190 alt sınıfını görüntüle", "查看 190 子类") }, { id: "au-guide-state-list-vs-nomination" }] },

  // ── Canada ─────────────────────────────────────────────────────────────────
  { aliases: ["canada", "canadian", "kanada", "加拿大"], country: "CA",
    message: t("LogiVisa provides research for Canadian programs including Express Entry and provincial nomination.",
      "LogiVisa, Express Entry ve eyalet adaylığı dahil Kanada programları için araştırma sunar.",
      "LogiVisa 提供包括快速通道和省提名在内的加拿大项目研究。"),
    links: [{ id: "ca-visas-hub", title: t("Canada visa research", "Kanada vize araştırması", "加拿大签证研究") }, { id: "ca-points-calculator", title: t("CRS calculator", "CRS hesaplayıcı", "CRS 计算器") }, { id: "ca-pnp", title: t("PNP research", "PNP araştırması", "省提名研究") }] },
  { aliases: ["express entry", "ee", "crs", "comprehensive ranking system", "快速通道"], country: "CA",
    message: t("Express Entry is Canada’s online system for managing applications for certain economic programs, using a points-based Comprehensive Ranking System (CRS).",
      "Express Entry, bazı ekonomik programlara yapılan başvuruları yöneten ve puan tabanlı Kapsamlı Sıralama Sistemi'ni (CRS) kullanan Kanada'nın çevrimiçi sistemidir.",
      "快速通道是加拿大管理部分经济类项目申请的在线系统，采用基于积分的综合排名系统（CRS）。"),
    links: [{ id: "ca-visas-hub", title: t("Canada visa research", "Kanada vize araştırması", "加拿大签证研究") }, { id: "ca-points-calculator", title: t("CRS calculator", "CRS hesaplayıcı", "CRS 计算器") }] },
  { aliases: ["pnp", "provincial nominee", "provincial nominee program", "provincial nominee programs", "provincial nomination", "省提名"], country: "CA",
    message: t("Provincial Nominee Programs let Canadian provinces and territories nominate people for permanent residence.",
      "Eyalet Aday Programları, Kanada eyalet ve bölgelerinin kalıcı oturum için kişileri aday göstermesine olanak tanır.",
      "省提名项目允许加拿大各省和地区提名人员申请永久居留。"),
    links: [{ id: "ca-pnp", title: t("PNP research", "PNP araştırması", "省提名研究") }, { id: "ca-visas-hub", title: t("Canada visa research", "Kanada vize araştırması", "加拿大签证研究") }] },

  // ── Generic words: scoped when a country is known ──────────────────────────
  { aliases: ["points", "point", "puan", "puanlar", "积分"], country: "AU",
    message: t("LogiVisa has a tool for published Australian points-table calculations.", "LogiVisa'nın yayımlanmış Avustralya puan tablosu hesaplamaları için bir aracı var.", "LogiVisa 提供基于已公布澳大利亚积分表的计算工具。"),
    links: [{ id: "au-points-calculator", title: t("Check points", "Puanları kontrol et", "查看积分") }, { id: "au-visa-comparison" }] },
  { aliases: ["points", "point", "puan", "puanlar", "积分"], country: "CA",
    message: t("LogiVisa has a tool for Canadian CRS research.", "LogiVisa'nın Kanada CRS araştırması için bir aracı var.", "LogiVisa 提供加拿大 CRS 研究工具。"),
    links: [{ id: "ca-points-calculator", title: t("CRS calculator", "CRS hesaplayıcı", "CRS 计算器") }] },
  { aliases: ["visa", "visas", "vize", "vizeler", "签证"], country: "AU",
    message: t("I can help you find published Australian visa information.", "Yayımlanmış Avustralya vize bilgilerini bulmanıza yardımcı olabilirim.", "我可以帮您找到已公布的澳大利亚签证信息。"),
    links: [{ id: "au-visas-hub", title: t("Australia visas", "Avustralya vizeleri", "澳大利亚签证") }, { id: "au-visa-comparison", title: t("Compare visas", "Vizeleri karşılaştır", "对比签证") }] },
  { aliases: ["visa", "visas", "vize", "vizeler", "签证"], country: "CA",
    message: t("I can help you find published Canadian visa and program information.", "Yayımlanmış Kanada vize ve program bilgilerini bulmanıza yardımcı olabilirim.", "我可以帮您找到已公布的加拿大签证和项目信息。"),
    links: [{ id: "ca-visas-hub", title: t("Canada visas", "Kanada vizeleri", "加拿大签证") }, { id: "ca-pnp", title: t("PNP research", "PNP araştırması", "省提名研究") }] },
  { aliases: ["visa", "visas", "vize", "vizeler", "签证"], country: "ANY",
    message: t("I can help you find published visa information for Australia or Canada.", "Avustralya veya Kanada için yayımlanmış vize bilgilerini bulmanıza yardımcı olabilirim.", "我可以帮您找到澳大利亚或加拿大已公布的签证信息。"),
    links: [{ id: "au-visas-hub", title: t("Australia visas", "Avustralya vizeleri", "澳大利亚签证") }, { id: "ca-visas-hub", title: t("Canada visas", "Kanada vizeleri", "加拿大签证") }, { id: "au-visa-comparison", title: t("Compare visas", "Vizeleri karşılaştır", "对比签证") }] },
];

/** Strips leading filler ("what is", "tell me about") and punctuation so "What is 190?" and "190" resolve to the same entry. */
export function shortKey(normalised: string): string {
  return normalised
    .replace(/[?!.,;:"“”]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(?:what(?:'s| is| are)|tell me about|info(?:rmation)? (?:on|about)|about|show me|the|a|an)\s+/, "")
    .replace(/\s+(?:please|visa information|information)$/, "")
    .trim();
}

/** The entries whose alias equals the whole (short) input, one per country at most. */
export function matchShortAnswers(normalised: string): ShortAnswer[] {
  const key = shortKey(normalised);
  if (!key || key.split(" ").length > 4) return [];
  return SHORT_ANSWERS.filter((e) => e.aliases.includes(key));
}
