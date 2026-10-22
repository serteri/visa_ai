import { researchText } from "@/lib/marketing/research-journey";

/**
 * Source-backed research content for ANZSCO 149311 Conference and Event Organiser (SEO Sprint 2). Every statement paraphrases the
 * VETASSESS occupation page, the ANZSCO description or the published lists; nothing says whether a person qualifies, which visa
 * applies or what will happen. The role names are VETASSESS's own titles and stay in English in every locale.
 */
export const RESEARCH_149311_CODE = "149311";
export const VETASSESS_149311_URL = "https://www.vetassess.com.au/check-my-occupation/professional-occupations/conference-and-event-organiser";
/** The day the VETASSESS page was read for this content; the page itself carries no review date. */
export const RESEARCH_149311_CHECKED = "2026-10-22";

export const SUITABLE_ROLES_149311 = ["Event Manager or Planner", "Exhibition Organiser", "Wedding Coordinator"] as const;
export const NOT_CONSIDERED_ROLES_149311 = [
  "Marketing Specialist",
  "Public Relations Professional",
  "Food and Beverage Manager",
  "Personal Assistant",
  "Venue Sales Manager",
  "Event Sales Manager",
  "Venue Banquet Manager",
] as const;

export type Faq149311 = { q: string; a: string };
export type Research149311 = {
  title: string;
  description: string;
  h1: string;
  intro: string;
  duties: string[];
  faqs: Faq149311[];
};

export function research149311(code: string, locale: string): Research149311 | null {
  if (code !== RESEARCH_149311_CODE) return null;
  const t = (en: string, tr: string, zh: string) => researchText(locale, en, tr, zh);
  return {
    title: t(
      "Conference and Event Organiser ANZSCO 149311 | Skills Assessment",
      "Conference and Event Organiser ANZSCO 149311 | Beceri Değerlendirmesi",
      "Conference and Event Organiser ANZSCO 149311 | 技能评估",
    ),
    description: t(
      "ANZSCO 149311 Conference and Event Organiser: the occupation description, VETASSESS skills assessment information and published occupation-list placement, from sourced research with check dates.",
      "ANZSCO 149311 Conference and Event Organiser: meslek tanımı, VETASSESS beceri değerlendirmesi bilgileri ve yayımlanmış meslek listesi yeri; kaynaklı araştırma ve kontrol tarihleriyle.",
      "ANZSCO 149311 Conference and Event Organiser：职业描述、VETASSESS 技能评估信息和已公布的职业清单归属，基于有来源的研究并标注核对日期。",
    ),
    h1: "Conference and Event Organiser (ANZSCO 149311)",
    intro: t(
      "ANZSCO 149311 covers people who organise and coordinate services for conferences, events, functions, banquets and seminars. This page sets out what VETASSESS and the published occupation lists say about it, with source dates.",
      "ANZSCO 149311, konferans, etkinlik, resepsiyon, ziyafet ve seminer hizmetlerini organize eden ve koordine eden kişileri kapsar. Bu sayfa, VETASSESS'in ve yayımlanmış meslek listelerinin bu meslek hakkında söylediklerini kaynak tarihleriyle sunar.",
      "ANZSCO 149311 涵盖组织和协调会议、活动、宴会、研讨会等服务的人员。本页列出 VETASSESS 和已公布的职业清单对该职业的说明，并标注来源日期。",
    ),
    duties: [
      t(
        "Meet clients or organisers to establish the purpose, scale, budget and timeline of a conference or event.",
        "Konferans veya etkinliğin amacını, ölçeğini, bütçesini ve takvimini belirlemek için müşteri veya organizatörlerle görüşmek.",
        "与客户或主办方沟通，确定会议或活动的目的、规模、预算和时间安排。",
      ),
      t(
        "Plan and coordinate venues, suppliers, catering, accommodation, transport and technical or audiovisual services.",
        "Mekân, tedarikçi, yemek hizmeti, konaklama, ulaşım ve teknik veya görsel-işitsel hizmetleri planlamak ve koordine etmek.",
        "规划并协调场地、供应商、餐饮、住宿、交通以及技术或视听服务。",
      ),
      t(
        "Prepare and manage event budgets, contracts and quotes, and monitor spending against them.",
        "Etkinlik bütçelerini, sözleşmeleri ve teklifleri hazırlamak ve yönetmek, harcamaları bunlara göre izlemek.",
        "编制并管理活动预算、合同和报价，并对照预算监控支出。",
      ),
      t(
        "Coordinate programs, speakers, registrations and staff or volunteers before and during the event.",
        "Etkinlik öncesinde ve sırasında programları, konuşmacıları, kayıtları ve personeli veya gönüllüleri koordine etmek.",
        "在活动前和活动期间协调议程、演讲嘉宾、注册报名以及工作人员或志愿者。",
      ),
      t(
        "Review the event afterwards, reconcile accounts and report to the client or organiser.",
        "Etkinlik sonrasında değerlendirme yapmak, hesapları kapatmak ve müşteriye veya organizatöre raporlamak.",
        "活动结束后进行复盘、核对账目，并向客户或主办方汇报。",
      ),
    ],
    faqs: [
      {
        q: t("What is ANZSCO 149311?", "ANZSCO 149311 nedir?", "什么是 ANZSCO 149311？"),
        a: t(
          "ANZSCO 149311 is the Conference and Event Organiser occupation in the Australian and New Zealand Standard Classification of Occupations. It describes people who organise and coordinate services for conferences, events, functions, banquets and seminars.",
          "ANZSCO 149311, Avustralya ve Yeni Zelanda Standart Meslek Sınıflandırması'ndaki Conference and Event Organiser mesleğidir. Konferans, etkinlik, resepsiyon, ziyafet ve seminer hizmetlerini organize eden ve koordine eden kişileri tanımlar.",
          "ANZSCO 149311 是澳大利亚和新西兰标准职业分类中的 Conference and Event Organiser 职业，描述组织和协调会议、活动、宴会、研讨会等服务的人员。",
        ),
      },
      {
        q: t("Who assesses it?", "Kim değerlendirir?", "由谁评估？"),
        a: t(
          "VETASSESS lists ANZSCO 149311 among its professional occupations, in Group C. Its page sets out the assessment requirements; this page does not decide how an individual would be assessed.",
          "VETASSESS, ANZSCO 149311'i C Grubu'ndaki mesleki meslekleri arasında listeler. Değerlendirme gereklilikleri VETASSESS sayfasında yer alır; bu sayfa bir kişinin nasıl değerlendirileceğini belirlemez.",
          "VETASSESS 将 ANZSCO 149311 列在其专业类职业的 C 组中。评估要求见 VETASSESS 页面；本页不确定个人将如何被评估。",
        ),
      },
      {
        q: t("Is Event Manager included?", "Event Manager dahil mi?", "Event Manager 是否包含在内？"),
        a: t(
          "VETASSESS names Event Manager or Planner among the job titles it identifies as suitable under ANZSCO 149311. Whether a particular person's work matches is a matter for the assessing authority.",
          "VETASSESS, Event Manager or Planner unvanını ANZSCO 149311 kapsamında uygun olarak belirlediği unvanlar arasında sayar. Belirli bir kişinin işinin uyup uymadığı değerlendirme kurumunun konusudur.",
          "VETASSESS 将 Event Manager or Planner 列为其认定适用于 ANZSCO 149311 的职位名称之一。个人工作是否相符，由评估机构判断。",
        ),
      },
      {
        q: t("Is Wedding Coordinator included?", "Wedding Coordinator dahil mi?", "Wedding Coordinator 是否包含在内？"),
        a: t(
          "VETASSESS also names Wedding Coordinator among the suitable job titles under ANZSCO 149311, alongside Exhibition Organiser. The assessing authority decides how any individual's work is treated.",
          "VETASSESS, Wedding Coordinator unvanını da Exhibition Organiser ile birlikte ANZSCO 149311 kapsamında uygun unvanlar arasında sayar. Bir kişinin işinin nasıl değerlendirileceğine değerlendirme kurumu karar verir.",
          "VETASSESS 也将 Wedding Coordinator 与 Exhibition Organiser 一并列为适用于 ANZSCO 149311 的职位名称。个人工作如何认定，由评估机构决定。",
        ),
      },
      {
        q: t("Is Marketing Specialist the same occupation?", "Marketing Specialist aynı meslek mi?", "Marketing Specialist 是同一个职业吗？"),
        a: t(
          "VETASSESS lists Marketing Specialist among the roles it does not consider under ANZSCO 149311; such roles are classified elsewhere in ANZSCO. A separate occupation page covers that classification.",
          "VETASSESS, Marketing Specialist'i ANZSCO 149311 kapsamında değerlendirmediği roller arasında sayar; bu tür roller ANZSCO'da başka yerde sınıflandırılır.",
          "VETASSESS 将 Marketing Specialist 列为其不在 ANZSCO 149311 下考虑的职位之一；此类职位在 ANZSCO 中归入其他分类。",
        ),
      },
      {
        q: t("What qualification does VETASSESS reference?", "VETASSESS hangi nitelik düzeyine atıf yapar?", "VETASSESS 提到什么学历层次？"),
        a: t(
          "VETASSESS states that this occupation requires a qualification comparable to an AQF Diploma or higher, with Event Management among the fields it describes as highly relevant. It assesses the qualification's level and content and relevant employment.",
          "VETASSESS, bu meslek için AQF Diploma veya daha yüksek düzeyde bir niteliğin gerektiğini belirtir; Event Management çok ilgili alanlar arasında anılır. Nitelik düzeyini ve içeriğini ve ilgili istihdamı değerlendirir.",
          "VETASSESS 表示该职业要求相当于 AQF Diploma 或更高层次的学历，并将 Event Management 列为高度相关的领域。其评估学历的层次与内容以及相关工作经历。",
        ),
      },
      {
        q: t("Which occupation lists include 149311?", "149311 hangi meslek listelerinde yer alır?", "哪些职业清单包含 149311？"),
        a: t(
          "In LogiVisa's occupation dataset dated 2026-07-09, ANZSCO 149311 appears on the CSOL, the ROL and the STSOL. The Home Affairs lists are the authoritative source and change over time.",
          "LogiVisa'nın 2026-07-09 tarihli meslek veri setinde ANZSCO 149311 CSOL, ROL ve STSOL listelerinde yer alır. Yetkili kaynak İçişleri Bakanlığı listeleridir ve zamanla değişir.",
          "在 LogiVisa 日期为 2026-07-09 的职业数据集中，ANZSCO 149311 列于 CSOL、ROL 和 STSOL。澳大利亚内政部的清单为权威来源，并会随时间变化。",
        ),
      },
      {
        q: t("Does list inclusion mean I qualify?", "Listede yer almak hak kazandığım anlamına mı gelir?", "列入清单是否意味着我符合条件？"),
        a: t(
          "No. Appearing on an occupation list is published information about the occupation, not a decision about a person. Other visa requirements still apply.",
          "Hayır. Bir meslek listesinde yer almak meslek hakkında yayımlanmış bilgidir, kişi hakkında bir karar değildir. Diğer vize koşulları da geçerlidir.",
          "不是。列入职业清单只是关于该职业的公开信息，并非针对个人的决定。其他签证要求仍然适用。",
        ),
      },
    ],
  };
}
