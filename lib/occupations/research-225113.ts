import { researchText } from "@/lib/marketing/research-journey";

import type { OccupationResearch } from "./research-types";

/**
 * Source-backed research content for ANZSCO 225113 Marketing Specialist (SEO Sprint 3). Statements paraphrase the VETASSESS occupation
 * page, the ABS ANZSCO description and the Home Affairs Skilled Occupation List row; nothing says whether a person qualifies, which
 * visa applies or what will happen. Official role and field names stay in English in every locale.
 *
 * Source of truth: 225113 = Marketing Specialist (ABS ANZSCO; VETASSESS; src/data/occupations.json and public/skilled-occupation-list.json, which the
 * page reads). 225111 = Advertising Specialist, 225112 = Market Research Analyst, 225114 = Content Creator (Marketing).
 */
export const RESEARCH_225113_CODE = "225113";
export const VETASSESS_225113_URL = "https://www.vetassess.com.au/check-my-occupation/professional-occupations/marketing-specialist";
/** The day the VETASSESS page was read for this content. */
export const RESEARCH_225113_CHECKED = "2026-10-23";

export const SUITABLE_ROLES_225113 = [
  "Marketing Consultant",
  "Marketing Coordinator",
  "Marketing Officer",
  "Brand Manager",
  "Category Manager",
  "Product Manager",
  "Sales Promotion Officer",
] as const;
export const NOT_CONSIDERED_ROLES_225113 = [
  "Market Research Analyst",
  "Advertising Specialist",
  "Sales and Marketing Manager",
  "Technical Sales Representatives",
  "Sales Workers",
] as const;
export const HIGHLY_RELEVANT_FIELDS_225113 = ["Marketing", "Advertising", "Business Communications", "Public Relations"] as const;
/** Subclasses the Home Affairs list row for 225113 names (public/Skilled Occupation List.md, STSOL;CSOL): 190, 407, 489, 494, 491, 482 (Core Skills), 186 (Direct Entry). */
export const LIST_SUBCLASSES_225113 = ["190", "491", "482", "186", "407", "489", "494"];

/** The visa instruments read for the caveat section (legislation.gov.au, Federal Register of Legislation). */
export const LEGISLATION_225113_CHECKED = "2026-10-31";
export const INSTRUMENT_482_225113 = {
  title: "Migration (Specification of Occupations\u2014Subclass 482 Visa) Instrument 2024",
  lin: "LIN 24/089",
  url: "https://www.legislation.gov.au/F2024L01620/latest/text",
  compilation: "3",
  compilationDate: "2025-11-07",
} as const;
export const INSTRUMENT_186_225113 = {
  title: "Migration (Specification of Occupations and Relevant Assessing Authorities\u2014Subclass 186 Visa) Instrument 2024",
  lin: "LIN 24/093",
  url: "https://www.legislation.gov.au/F2024L01618/latest/text",
  compilation: "4",
  compilationDate: "2026-03-28",
} as const;
/** Column "applicable circumstance" of item 84 (Marketing Specialist, 225113) in both instruments. */
export const CAVEAT_NUMBERS_225113 = [6, 11] as const;
/** The instruments' own wording of circumstances 6 and 11 (identical in both instruments). */
export const CIRCUMSTANCE_WORDING_225113: Record<number, string[]> = {
  6: [
    "The position: (a) is based in a front-line retail setting; or",
    "(b) predominantly involves direct client transactional interaction on a regular basis; or",
    "(c) predominantly involves selling educational courses to individual students; or",
    "(d) is based in a call centre and does not require a significant technical knowledge of products.",
  ],
  11: ["The position is in a business that has an annual turnover of less than AUD1,000,000."],
};

export function research225113(code: string, locale: string): OccupationResearch | null {
  if (code !== RESEARCH_225113_CODE) return null;
  const t = (en: string, tr: string, zh: string) => researchText(locale, en, tr, zh);
  return {
    code: RESEARCH_225113_CODE,
    checked: RESEARCH_225113_CHECKED,
    authority: { name: "VETASSESS", url: VETASSESS_225113_URL },
    title: t(
      "Marketing Specialist ANZSCO 225113 | Skills Assessment",
      "Marketing Specialist ANZSCO 225113 | Beceri Değerlendirmesi",
      "Marketing Specialist ANZSCO 225113 | 技能评估",
    ),
    description: t(
      "ANZSCO 225113 Marketing Specialist: the occupation description, VETASSESS skills assessment information (Group B) and published occupation-list placement, from sourced research with check dates.",
      "ANZSCO 225113 Marketing Specialist: meslek tanımı, VETASSESS beceri değerlendirmesi bilgileri (B Grubu) ve yayımlanmış meslek listesi yeri; kaynaklı araştırma ve kontrol tarihleriyle.",
      "ANZSCO 225113 Marketing Specialist：职业描述、VETASSESS 技能评估信息（B 组）和已公布的职业清单归属，基于有来源的研究并标注核对日期。",
    ),
    h1: "Marketing Specialist (ANZSCO 225113)",
    intro: t(
      "A Marketing Specialist identifies market opportunities and advises on the development, coordination and implementation of plans for pricing and promoting an organisation's goods and services. This page summarises the ANZSCO classification, VETASSESS information and published occupation-list placement for ANZSCO 225113, with source and check dates. It makes no determination about any individual.",
      "Marketing Specialist, pazar fırsatlarını belirler ve bir kuruluşun mal ve hizmetlerinin fiyatlandırılması ve tanıtılması için planların geliştirilmesi, koordinasyonu ve uygulanması konusunda danışmanlık yapar. Bu sayfa, ANZSCO 225113 için ANZSCO sınıflandırmasını, VETASSESS bilgilerini ve yayımlanmış meslek listesi yerini kaynak ve kontrol tarihleriyle özetler. Hiçbir kişi hakkında karar vermez.",
      "Marketing Specialist 负责识别市场商机，并就组织商品和服务的定价与推广计划的制定、协调和实施提供咨询。本页汇总 ANZSCO 225113 的 ANZSCO 分类、VETASSESS 信息和已公布的职业清单归属，并标注来源和核对日期。本页不对任何个人作出判断。",
    ),
    dutiesHeading: t("Typical duties (paraphrased)", "Tipik görevler (özet)", "典型职责（概述）"),
    duties: [
      t(
        "Develop marketing objectives, policies and programs that support an organisation's growth.",
        "Bir kuruluşun büyümesini destekleyen pazarlama hedefleri, politikaları ve programları geliştirmek.",
        "制定支持组织增长的营销目标、政策和方案。",
      ),
      t(
        "Identify market opportunities, including by commissioning or using market research.",
        "Pazar araştırması yaptırarak veya kullanarak pazar fırsatlarını belirlemek.",
        "通过委托或使用市场研究来识别市场商机。",
      ),
      t(
        "Advise on the product mix and on pricing.",
        "Ürün karması ve fiyatlandırma konusunda danışmanlık yapmak.",
        "就产品组合和定价提供咨询。",
      ),
      t(
        "Advise on advertising and sales promotion, and on selling and distribution channels.",
        "Reklam ve satış promosyonu ile satış ve dağıtım kanalları konusunda danışmanlık yapmak.",
        "就广告和促销以及销售和分销渠道提供咨询。",
      ),
      t(
        "Prepare marketing plans and develop campaign ideas.",
        "Pazarlama planları hazırlamak ve kampanya fikirleri geliştirmek.",
        "编制营销计划，并构思营销活动方案。",
      ),
      t(
        "Analyse data to inform marketing decisions and measure results.",
        "Pazarlama kararlarına yön vermek ve sonuçları ölçmek için verileri analiz etmek.",
        "分析数据以支持营销决策并衡量成效。",
      ),
      t(
        "Work with agencies and vendors to deliver campaigns.",
        "Kampanyaları hayata geçirmek için ajanslar ve tedarikçilerle çalışmak.",
        "与代理机构和供应商合作执行营销活动。",
      ),
      t(
        "Advise on digital marketing, including SEO, social media and analytics.",
        "SEO, sosyal medya ve analitik dahil dijital pazarlama konusunda danışmanlık yapmak.",
        "就数字营销提供咨询，包括搜索引擎优化、社交媒体和数据分析。",
      ),
    ],
    glance: [
      ["VETASSESS", t("Group B (professional occupations)", "B Grubu (mesleki meslekler)", "B 组（专业类职业）")],
      [
        t("Qualification level", "Nitelik düzeyi", "学历层次"),
        t("AQF Bachelor degree or higher (as VETASSESS states it)", "AQF Bachelor derecesi veya üzeri (VETASSESS'in belirttiği gibi)", "AQF Bachelor 学位或更高（按 VETASSESS 所述）"),
      ],
      [t("ANZSCO skill level", "ANZSCO beceri düzeyi", "ANZSCO 技能等级"), "1"],
    ],
    about: {
      heading: t("Occupation description", "Meslek tanımı", "职业描述"),
      paragraphs: [
        t(
          "ANZSCO 225113 Marketing Specialist sits in unit group 2251 (Advertising and Marketing Professionals), alongside 225111 Advertising Specialist, 225112 Market Research Analyst and 225114 Content Creator (Marketing).",
          "ANZSCO 225113 Marketing Specialist, 2251 birim grubunda (Reklam ve Pazarlama Profesyonelleri) yer alır; 225111 Advertising Specialist, 225112 Market Research Analyst ve 225114 Content Creator (Marketing) ile aynı gruptadır.",
          "ANZSCO 225113 Marketing Specialist 属于 2251 单元组（广告与营销专业人员），与 225111 Advertising Specialist、225112 Market Research Analyst 和 225114 Content Creator (Marketing) 同组。",
        ),
      ],
    },
    suitable: {
      heading: t("Roles considered suitable under ANZSCO 225113", "ANZSCO 225113 kapsamında uygun görülen roller", "ANZSCO 225113 下被认为适用的职位"),
      intro: t(
        "VETASSESS identifies these job titles as suitable under this code:",
        "VETASSESS, bu kod kapsamında şu iş unvanlarını uygun olarak belirler:",
        "VETASSESS 认定以下职位名称适用于此代码：",
      ),
      roles: SUITABLE_ROLES_225113,
    },
    notConsidered: {
      heading: t("Roles VETASSESS does not consider under ANZSCO 225113", "VETASSESS'in ANZSCO 225113 kapsamında değerlendirmediği roller", "VETASSESS 不在 ANZSCO 225113 下考虑的职位"),
      intro: t(
        "VETASSESS does not consider the following occupations under ANZSCO 225113. According to VETASSESS, these occupations are classified elsewhere in ANZSCO.",
        "VETASSESS, aşağıdaki meslekleri ANZSCO 225113 kapsamında değerlendirmez. VETASSESS'e göre bu meslekler ANZSCO'da başka yerde sınıflandırılır.",
        "VETASSESS 不在 ANZSCO 225113 下考虑以下职业。据 VETASSESS 所述，这些职业在 ANZSCO 中归入其他分类。",
      ),
      roles: NOT_CONSIDERED_ROLES_225113,
    },
    assessment: {
      heading: t("Marketing Specialist skills assessment — VETASSESS", "Marketing Specialist beceri değerlendirmesi — VETASSESS", "Marketing Specialist 技能评估 — VETASSESS"),
      finderLabel: t("LogiVisa Skills Assessment Finder", "LogiVisa Beceri Değerlendirme Bulucu", "LogiVisa 技能评估查询"),
      officialLabel: t("Official VETASSESS page", "Resmî VETASSESS sayfası", "VETASSESS 官方页面"),
      blocks: [
        {
          paragraphs: [
            t(
              "VETASSESS assesses ANZSCO 225113 and places Marketing Specialist in Group B, with a qualification comparable to an AQF Bachelor degree or higher. VETASSESS considers both the qualification and the employment.",
              "VETASSESS, ANZSCO 225113'ü değerlendirir ve Marketing Specialist'i B Grubu'na yerleştirir; AQF Bachelor derecesi veya daha yüksek düzeyde bir nitelik esas alınır. VETASSESS hem niteliği hem de istihdamı dikkate alır.",
              "VETASSESS 评估 ANZSCO 225113，并将 Marketing Specialist 列入 B 组，要求相当于 AQF Bachelor 学位或更高的学历。VETASSESS 同时考察学历和工作经历。",
            ),
          ],
        },
        {
          heading: t("The four VETASSESS pathways, in summary", "VETASSESS'in dört yolu (özet)", "VETASSESS 的四条路径（概述）"),
          paragraphs: [
            t(
              "VETASSESS sets out four pathways. In each, the employment must be at an appropriate skill level, undertaken for at least 20 hours a week. This summary does not say which pathway applies to any individual.",
              "VETASSESS dört yol tanımlar. Her birinde istihdam uygun beceri düzeyinde ve haftada en az 20 saat olmalıdır. Bu özet, hangi yolun bir kişiye uygulanacağını belirtmez.",
              "VETASSESS 列出四条路径。每条路径中，工作经历都必须处于适当的技能水平，且每周至少 20 小时。本概述不说明哪条路径适用于任何个人。",
            ),
          ],
          bullets: [
            t(
              "Pathway 1: a Bachelor degree or higher in a highly relevant field, plus at least 1 year of highly relevant post-qualification employment within the last 5 years.",
              "Yol 1: yüksek düzeyde ilgili bir alanda Bachelor veya üzeri derece ve son 5 yıl içinde en az 1 yıl, nitelik sonrası, yüksek düzeyde ilgili istihdam.",
              "路径 1：高度相关专业的 Bachelor 或更高学位，加上最近 5 年内至少 1 年与学历取得后高度相关的工作经历。",
            ),
            t(
              "Pathway 2: a Bachelor degree or higher that is not in a highly relevant field, plus an additional highly relevant qualification at AQF Diploma level or above, plus at least 2 years of relevant post-Bachelor employment.",
              "Yol 2: yüksek düzeyde ilgili olmayan bir alanda Bachelor veya üzeri derece, ek olarak AQF Diploma veya üzeri düzeyde yüksek düzeyde ilgili bir nitelik ve en az 2 yıl, Bachelor sonrası, ilgili istihdam.",
              "路径 2：非高度相关专业的 Bachelor 或更高学位，加上至少 AQF Diploma 水平的另一项高度相关学历，并有至少 2 年 Bachelor 之后的相关工作经历。",
            ),
            t(
              "Pathway 3: a Bachelor degree or higher that is not in a highly relevant field, with no additional highly relevant qualification, plus at least 3 years of relevant post-qualification employment.",
              "Yol 3: yüksek düzeyde ilgili olmayan bir alanda Bachelor veya üzeri derece, ek bir ilgili nitelik olmaksızın, en az 3 yıl, nitelik sonrası, ilgili istihdam.",
              "路径 3：非高度相关专业的 Bachelor 或更高学位，没有额外的高度相关学历，并有至少 3 年学历取得后的相关工作经历。",
            ),
            t(
              "Pathway 4: a Bachelor degree or higher, with or without a highly relevant major, assessed with the pre-qualification methodology: at least 6 years of appropriate-level employment overall, including at least 1 year of highly relevant employment within the last 5 years.",
              "Yol 4: yüksek düzeyde ilgili bir ana dal olsun veya olmasın Bachelor veya üzeri derece; nitelik öncesi yöntemle değerlendirilir: toplamda en az 6 yıl uygun düzeyde istihdam; bunun son 5 yıl içinde en az 1 yılı yüksek düzeyde ilgili olmalıdır.",
              "路径 4：持有 Bachelor 或更高学位（主修是否高度相关均可），采用学历取得前的方法评估：总共至少 6 年适当水平的工作经历，其中最近 5 年内至少有 1 年高度相关的工作经历。",
            ),
          ],
        },
        {
          heading: t("Fields of study VETASSESS considers", "VETASSESS'in dikkate aldığı çalışma alanları", "VETASSESS 考虑的专业领域"),
          paragraphs: [
            t(
              "VETASSESS identifies these fields as highly relevant: Marketing, Advertising, Business Communications and Public Relations.",
              "VETASSESS şu alanları çok ilgili olarak belirler: Marketing, Advertising, Business Communications ve Public Relations.",
              "VETASSESS 认定以下领域为高度相关：Marketing、Advertising、Business Communications 和 Public Relations。",
            ),
            t(
              "Business Management and Business and Commerce qualifications may be considered case by case, where the qualification shows sufficient relevant content. This page does not say whether any particular qualification will be accepted.",
              "Business Management ve Business and Commerce nitelikleri, nitelik yeterli ilgili içerik gösterdiğinde duruma göre değerlendirilebilir. Bu sayfa, belirli bir niteliğin kabul edilip edilmeyeceğini belirtmez.",
              "Business Management 和 Business and Commerce 学历可能按个案考虑，前提是该学历显示出足够的相关内容。本页不说明任何具体学历是否会被接受。",
            ),
          ],
          bullets: [...HIGHLY_RELEVANT_FIELDS_225113],
        },
        {
          heading: t("Employment that VETASSESS does not accept", "VETASSESS'in kabul etmediği istihdam", "VETASSESS 不接受的工作经历"),
          paragraphs: [
            t(
              "According to VETASSESS, positions based in a front-line retail setting, or mainly involving regular direct client transactional interaction, are not accepted as Marketing Specialist employment for this assessment. This is VETASSESS assessment information, not a visa decision.",
              "VETASSESS'e göre, ağırlıklı olarak perakende satış ön cephesinde yer alan veya düzenli olarak doğrudan müşteri işlemlerini içeren pozisyonlar, bu değerlendirmede Marketing Specialist istihdamı olarak kabul edilmez. Bu, VETASSESS değerlendirme bilgisidir; vize kararı değildir.",
              "据 VETASSESS 所述，主要在零售一线岗位，或主要涉及经常性直接客户交易互动的职位，在本次评估中不被接受为 Marketing Specialist 工作经历。这是 VETASSESS 的评估信息，并非签证决定。",
            ),
          ],
        },
      ],
    },
    afterDuties: [
      {
        id: "marketing-vs-advertising-vs-market-research",
        heading: t(
          "Marketing Specialist vs Advertising Specialist vs Market Research Analyst",
          "Marketing Specialist, Advertising Specialist ve Market Research Analyst karşılaştırması",
          "Marketing Specialist 与 Advertising Specialist 与 Market Research Analyst 的比较",
        ),
        blocks: [
          {
            paragraphs: [
              t(
                "VETASSESS treats these as three separate ANZSCO occupations. At a high level, as VETASSESS describes them:",
                "VETASSESS bunları üç ayrı ANZSCO mesleği olarak ele alır. VETASSESS'in tanımladığı şekliyle, genel olarak:",
                "VETASSESS 将这三者视为三个独立的 ANZSCO 职业。概括而言，按 VETASSESS 的描述：",
              ),
            ],
            bullets: [
              t(
                "Marketing Specialist (225113): broader marketing scope, including product, pricing, promotion, selling and distribution.",
                "Marketing Specialist (225113): ürün, fiyatlandırma, tanıtım, satış ve dağıtımı kapsayan daha geniş bir pazarlama kapsamı.",
                "Marketing Specialist (225113)：营销范围更广，涵盖产品、定价、推广、销售和分销。",
              ),
              t(
                "Advertising Specialist (225111): focuses mainly on advertising planning, campaigns, content placement and production.",
                "Advertising Specialist (225111): ağırlıklı olarak reklam planlaması, kampanyalar, içerik yerleştirme ve prodüksiyona odaklanır.",
                "Advertising Specialist (225111)：主要侧重广告规划、营销活动、内容投放和制作。",
              ),
              t(
                "Market Research Analyst (225112): focuses mainly on quantitative and qualitative research, consumer behaviour, trends and market analysis.",
                "Market Research Analyst (225112): ağırlıklı olarak nicel ve nitel araştırma, tüketici davranışı, eğilimler ve pazar analizine odaklanır.",
                "Market Research Analyst (225112)：主要侧重定量和定性研究、消费者行为、趋势和市场分析。",
              ),
            ],
            note: t(
              "Neither description makes one occupation better than another. Which one fits a person's work is a matter for the assessing authority.",
              "Hiçbir tanım bir mesleği diğerinden daha iyi kılmaz. Bir kişinin işine hangisinin uyduğu değerlendirme kurumunun konusudur.",
              "这些描述并不意味着某个职业优于另一个。个人工作更符合哪一个，由评估机构判断。",
            ),
          },
        ],
        links: [
          { label: t("225111 Advertising Specialist", "225111 Advertising Specialist", "225111 Advertising Specialist"), path: "/occupations/225111-advertising-specialist" },
          { label: t("225112 Market Research Analyst", "225112 Market Research Analyst", "225112 Market Research Analyst"), path: "/occupations/225112-market-research-analyst" },
        ],
      },
    ],
    lists: {
      subclasses: LIST_SUBCLASSES_225113,
      sentence: (listText, subclasses) =>
        t(
          `Marketing Specialist appears on ${listText} (CSOL is the Core Skills Occupation List; STSOL is the Short-term Skilled Occupation List). These lists are used in published visa-program rules, and the Home Affairs list row names subclasses ${subclasses}. Other requirements still apply.`,
          `Marketing Specialist ${listText} listelerinde yer alır (CSOL, Core Skills Occupation List; STSOL, Short-term Skilled Occupation List'tir). Bu listeler yayımlanmış vize programı kurallarında kullanılır ve İçişleri Bakanlığı liste satırı ${subclasses} alt sınıflarını adlandırır. Diğer koşullar da geçerlidir.`,
          `Marketing Specialist 列于 ${listText}（CSOL 为 Core Skills Occupation List，STSOL 为 Short-term Skilled Occupation List）。这些清单被用于已公布的签证项目规则，内政部清单该行列出子类 ${subclasses}。其他要求仍然适用。`,
        ),
      sourceNote: t(
        "The subclasses are those named in the Home Affairs list row held by LogiVisa. The Home Affairs lists are authoritative and change over time.",
        "Alt sınıflar, LogiVisa'nın elindeki İçişleri Bakanlığı liste satırında adlandırılanlardır. Yetkili kaynak İçişleri Bakanlığı listeleridir ve zamanla değişir.",
        "所列子类为 LogiVisa 所持内政部清单该行中列出的子类。澳大利亚内政部清单为权威来源，并会随时间变化。",
      ),
    },
    visaSubclassPaths: ["190", "491", "482", "186_direct_entry"],
    visaCaveats: {
      id: "visa-caveats",
      heading: t(
        "Visa-specific occupation caveats: subclass 482 and 186 instruments",
        "Vizeye özgü meslek kısıtları: 482 ve 186 alt sınıfı düzenlemeleri",
        "签证专属职业限制：482 和 186 子类法律文书",
      ),
      paragraphs: [
        t(
          "This is separate from the VETASSESS skills assessment above. The legislative instruments that specify the Core Skills Occupation List for the Subclass 482 (Skills in Demand, Core Skills stream) visa and for the Subclass 186 (Employer Nomination Scheme) visa list ANZSCO 225113 Marketing Specialist with applicable circumstances 6 and 11. The Home Affairs list row marks the same two visas (482 Core Skills and 186 Direct Entry) with \"caveats apply\".",
          "Bu bölüm yukarıdaki VETASSESS beceri değerlendirmesinden ayrıdır. Subclass 482 (Skills in Demand, Core Skills akışı) ve Subclass 186 (Employer Nomination Scheme) vizeleri için Core Skills Occupation List'i belirleyen yasal düzenlemeler, ANZSCO 225113 Marketing Specialist'i 6 ve 11 numaralı uygulanabilir koşullarla listeler. İçişleri Bakanlığı liste satırı aynı iki vizeyi (482 Core Skills ve 186 Direct Entry) \"caveats apply\" (kısıtlar geçerli) ile işaretler.",
          "本节与上文的 VETASSESS 技能评估是分开的。为 482 子类（Skills in Demand，Core Skills 类别）和 186 子类（Employer Nomination Scheme）签证规定 Core Skills Occupation List 的法律文书，将 ANZSCO 225113 Marketing Specialist 与适用情形 6 和 11 一并列出。内政部清单该行也对同样两个签证（482 Core Skills 和 186 Direct Entry）标注了 \"caveats apply\"（适用限制）。",
        ),
        t(
          "In both instruments the circumstances concern the position in which the person is to work. Where a circumstance listed against the occupation applies to that position, the instrument says the occupation does not apply to the person. Other conditions of each visa still apply, and this page does not decide whether any position or person is affected.",
          "Her iki düzenlemede de koşullar, kişinin çalışacağı pozisyonla ilgilidir. Meslekle birlikte listelenen bir koşul o pozisyona uygulanıyorsa, düzenleme mesleğin o kişiye uygulanmadığını belirtir. Her vizenin diğer koşulları da geçerlidir ve bu sayfa hiçbir pozisyonun veya kişinin etkilenip etkilenmediğine karar vermez.",
          "在两份文书中，这些情形都针对该人员将要任职的职位。如果与该职业一并列出的某项情形适用于该职位，文书规定该职业不适用于此人。每种签证的其他条件仍然适用，本页不判断任何职位或个人是否受到影响。",
        ),
      ],
      circumstancesIntro: t(
        "The circumstances listed against 225113, in the instruments' own wording (English):",
        "225113 ile birlikte listelenen koşullar, düzenlemelerin kendi ifadesiyle (İngilizce):",
        "与 225113 一并列出的情形，按文书原文（英文）：",
      ),
      circumstances: CAVEAT_NUMBERS_225113.map((n) => ({
        number: n,
        label: t(`Circumstance ${n}`, `Koşul ${n}`, `情形 ${n}`),
        summary:
          n === 6
            ? t(
                "Concerns a position in a front-line retail setting, one that mainly involves regular direct client transactions, one that mainly involves selling educational courses to individual students, or a call-centre position without significant technical product knowledge.",
                "Ön cephe perakende ortamındaki bir pozisyonu, ağırlıklı olarak düzenli doğrudan müşteri işlemleri içeren bir pozisyonu, ağırlıklı olarak bireysel öğrencilere eğitim kursu satan bir pozisyonu veya önemli ölçüde teknik ürün bilgisi gerektirmeyen bir çağrı merkezi pozisyonunu kapsar.",
                "涉及前线零售环境的职位、主要涉及经常性直接客户交易的职位、主要向个人学生销售教育课程的职位，或不需要大量产品技术知识的呼叫中心职位。",
              )
            : t(
                "Concerns a position in a business with an annual turnover of less than AUD1,000,000.",
                "Yıllık cirosu AUD1,000,000'un altında olan bir işletmedeki pozisyonu kapsar.",
                "涉及年营业额低于 AUD1,000,000 的企业中的职位。",
              ),
        wording: CIRCUMSTANCE_WORDING_225113[n],
      })),
      distinctionHeading: t(
        "How this differs from the VETASSESS employment exclusion",
        "VETASSESS istihdam dışlamasından farkı",
        "与 VETASSESS 工作经历排除规定的区别",
      ),
      distinction: [
        t(
          "The VETASSESS exclusion above (front-line retail or regular direct client transactional employment is not accepted as Marketing Specialist employment) is part of VETASSESS's skills assessment. It decides what employment VETASSESS counts.",
          "Yukarıdaki VETASSESS dışlaması (ön cephe perakende veya düzenli doğrudan müşteri işlemi içeren istihdamın Marketing Specialist istihdamı olarak kabul edilmemesi) VETASSESS beceri değerlendirmesinin parçasıdır. VETASSESS'in hangi istihdamı saydığını belirler.",
          "上文的 VETASSESS 排除规定（前线零售或经常性直接客户交易的工作不被接受为 Marketing Specialist 工作经历）属于 VETASSESS 技能评估的一部分，决定 VETASSESS 认可哪些工作经历。",
        ),
        t(
          "Circumstances 6 and 11 are made in the visa instruments and concern the nominated position, including, for circumstance 11, the size of the business. The two sets of rules cover some similar ground but are made separately; a result under one does not settle the other.",
          "6 ve 11 numaralı koşullar vize düzenlemelerinde yer alır ve aday gösterilen pozisyonla ilgilidir; 11 numaralı koşulda ayrıca işletmenin büyüklüğüyle. İki kural seti benzer konuları kısmen kapsasa da ayrı ayrı yapılmıştır; birindeki sonuç diğerini belirlemez.",
          "情形 6 和 11 出自签证法律文书，针对被提名的职位；其中情形 11 还涉及企业规模。两套规则在部分内容上相似，但各自独立制定，一方的结果并不决定另一方。",
        ),
        t(
          "Both instruments define ANZSCO as the ABS classification in force on 23 November 2022. The Home Affairs list links the ANZSCO 2022 classification for subclasses 186 and 482 and the ANZSCO 2013 classification for other visas; the code for Marketing Specialist is 225113 in each.",
          "Her iki düzenleme de ANZSCO'yu, ABS'nin 23 Kasım 2022'de yürürlükte olan sınıflandırması olarak tanımlar. İçişleri Bakanlığı listesi, 186 ve 482 alt sınıfları için ANZSCO 2022, diğer vizeler için ANZSCO 2013 sınıflandırmasına bağlantı verir; Marketing Specialist'in kodu her ikisinde de 225113'tür.",
          "两份文书都将 ANZSCO 定义为澳大利亚统计局（ABS）在 2022 年 11 月 23 日生效的分类。内政部清单对 186 和 482 子类链接 ANZSCO 2022 分类，对其他签证链接 ANZSCO 2013 分类；Marketing Specialist 在两者中的代码均为 225113。",
        ),
      ],
      note: t(
        "General information from published instruments, not advice about a position or a person. Instruments are amended over time: check the current versions on legislation.gov.au and the Department of Home Affairs.",
        "Yayımlanmış düzenlemelerden genel bilgi; bir pozisyon veya kişi hakkında tavsiye değildir. Düzenlemeler zamanla değiştirilir: güncel sürümleri legislation.gov.au ve İçişleri Bakanlığı'ndan kontrol edin.",
        "以上为根据已公布法律文书整理的一般信息，不是针对职位或个人的建议。法律文书会不时修订：请在 legislation.gov.au 和澳大利亚内政部核对当前版本。",
      ),
      sources: [
        { label: `${INSTRUMENT_482_225113.title} (${INSTRUMENT_482_225113.lin}), Compilation No. ${INSTRUMENT_482_225113.compilation}, ${INSTRUMENT_482_225113.compilationDate}`, url: INSTRUMENT_482_225113.url },
        { label: `${INSTRUMENT_186_225113.title} (${INSTRUMENT_186_225113.lin}), Compilation No. ${INSTRUMENT_186_225113.compilation}, ${INSTRUMENT_186_225113.compilationDate}`, url: INSTRUMENT_186_225113.url },
      ],
      checked: LEGISLATION_225113_CHECKED,
    },
    faqs: [
      {
        q: t("What is ANZSCO 225113?", "ANZSCO 225113 nedir?", "什么是 ANZSCO 225113？"),
        a: t(
          "ANZSCO 225113 is the Marketing Specialist occupation in the Australian and New Zealand Standard Classification of Occupations. It describes people who identify market opportunities and advise on plans for pricing and promoting an organisation's goods and services.",
          "ANZSCO 225113, Avustralya ve Yeni Zelanda Standart Meslek Sınıflandırması'ndaki Marketing Specialist mesleğidir. Pazar fırsatlarını belirleyen ve bir kuruluşun mal ve hizmetlerinin fiyatlandırılması ve tanıtılması planları konusunda danışmanlık yapan kişileri tanımlar.",
          "ANZSCO 225113 是澳大利亚和新西兰标准职业分类中的 Marketing Specialist 职业，描述识别市场商机并就组织商品和服务的定价与推广计划提供咨询的人员。",
        ),
      },
      {
        q: t("Who assesses Marketing Specialist?", "Marketing Specialist'i kim değerlendirir?", "谁评估 Marketing Specialist？"),
        a: t(
          "VETASSESS assesses ANZSCO 225113 and places it in Group B. Its page sets out the assessment requirements; this page does not decide how an individual would be assessed.",
          "ANZSCO 225113'ü VETASSESS değerlendirir ve B Grubu'na yerleştirir. Değerlendirme gereklilikleri VETASSESS sayfasında yer alır; bu sayfa bir kişinin nasıl değerlendirileceğini belirlemez.",
          "ANZSCO 225113 由 VETASSESS 评估，并列入 B 组。评估要求见 VETASSESS 页面；本页不确定个人将如何被评估。",
        ),
      },
      {
        q: t("Is Marketing Consultant included under 225113?", "Marketing Consultant 225113 kapsamında mı?", "Marketing Consultant 是否包含在 225113 内？"),
        a: t(
          "VETASSESS names Marketing Consultant among the job titles it identifies as suitable under ANZSCO 225113. Whether a particular person's work matches is a matter for the assessing authority.",
          "VETASSESS, Marketing Consultant unvanını ANZSCO 225113 kapsamında uygun olarak belirlediği unvanlar arasında sayar. Belirli bir kişinin işinin uyup uymadığı değerlendirme kurumunun konusudur.",
          "VETASSESS 将 Marketing Consultant 列为其认定适用于 ANZSCO 225113 的职位名称之一。个人工作是否相符，由评估机构判断。",
        ),
      },
      {
        q: t("Is Marketing Coordinator included?", "Marketing Coordinator dahil mi?", "Marketing Coordinator 是否包含在内？"),
        a: t(
          "VETASSESS also names Marketing Coordinator among the suitable job titles under ANZSCO 225113. The assessing authority decides how any individual's work is treated.",
          "VETASSESS, Marketing Coordinator unvanını da ANZSCO 225113 kapsamında uygun unvanlar arasında sayar. Bir kişinin işinin nasıl değerlendirileceğine değerlendirme kurumu karar verir.",
          "VETASSESS 也将 Marketing Coordinator 列为适用于 ANZSCO 225113 的职位名称之一。个人工作如何认定，由评估机构决定。",
        ),
      },
      {
        q: t("Is Brand Manager included?", "Brand Manager dahil mi?", "Brand Manager 是否包含在内？"),
        a: t(
          "VETASSESS lists Brand Manager among the suitable job titles under ANZSCO 225113, together with Marketing Consultant, Marketing Coordinator, Marketing Officer, Category Manager, Product Manager and Sales Promotion Officer.",
          "VETASSESS, Brand Manager unvanını ANZSCO 225113 kapsamındaki uygun unvanlar arasında sayar; Marketing Consultant, Marketing Coordinator, Marketing Officer, Category Manager, Product Manager ve Sales Promotion Officer ile birlikte.",
          "VETASSESS 将 Brand Manager 列为适用于 ANZSCO 225113 的职位名称之一，与 Marketing Consultant、Marketing Coordinator、Marketing Officer、Category Manager、Product Manager 和 Sales Promotion Officer 并列。",
        ),
      },
      {
        q: t("What qualification level does VETASSESS reference?", "VETASSESS hangi nitelik düzeyine atıf yapar?", "VETASSESS 提到什么学历层次？"),
        a: t(
          "VETASSESS states that this Group B occupation requires a qualification comparable to an AQF Bachelor degree or higher. It considers the qualification and the employment.",
          "VETASSESS, bu B Grubu meslek için AQF Bachelor derecesi veya daha yüksek düzeyde bir nitelik gerektiğini belirtir. Nitelik ve istihdamı birlikte dikkate alır.",
          "VETASSESS 表示该 B 组职业要求相当于 AQF Bachelor 学位或更高的学历，并同时考察学历和工作经历。",
        ),
      },
      {
        q: t("What fields of study are highly relevant?", "Hangi çalışma alanları çok ilgilidir?", "哪些专业领域高度相关？"),
        a: t(
          "VETASSESS identifies Marketing, Advertising, Business Communications and Public Relations as highly relevant. Business Management and Business and Commerce may be considered case by case where the qualification shows sufficient relevant content.",
          "VETASSESS, Marketing, Advertising, Business Communications ve Public Relations alanlarını çok ilgili olarak belirler. Business Management ve Business and Commerce, nitelik yeterli ilgili içerik gösterdiğinde duruma göre değerlendirilebilir.",
          "VETASSESS 认定 Marketing、Advertising、Business Communications 和 Public Relations 为高度相关。Business Management 和 Business and Commerce 在学历显示出足够相关内容时，可能按个案考虑。",
        ),
      },
      {
        q: t("How is Marketing Specialist different from Advertising Specialist?", "Marketing Specialist, Advertising Specialist'ten nasıl farklıdır?", "Marketing Specialist 与 Advertising Specialist 有何不同？"),
        a: t(
          "As VETASSESS describes them, Marketing Specialist has a broader scope that includes product, pricing, promotion, selling and distribution, while Advertising Specialist focuses mainly on advertising planning, campaigns, content placement and production. VETASSESS does not consider Advertising Specialist under ANZSCO 225113.",
          "VETASSESS'in tanımına göre Marketing Specialist ürün, fiyatlandırma, tanıtım, satış ve dağıtımı içeren daha geniş bir kapsama sahiptir; Advertising Specialist ise ağırlıklı olarak reklam planlaması, kampanyalar, içerik yerleştirme ve prodüksiyona odaklanır. VETASSESS, Advertising Specialist'i ANZSCO 225113 kapsamında değerlendirmez.",
          "按 VETASSESS 的描述，Marketing Specialist 范围更广，涵盖产品、定价、推广、销售和分销；Advertising Specialist 则主要侧重广告规划、营销活动、内容投放和制作。VETASSESS 不在 ANZSCO 225113 下考虑 Advertising Specialist。",
        ),
      },
      {
        q: t("How is it different from Market Research Analyst?", "Market Research Analyst'ten nasıl farklıdır?", "它与 Market Research Analyst 有何不同？"),
        a: t(
          "As VETASSESS describes them, Market Research Analyst focuses mainly on quantitative and qualitative research, consumer behaviour, trends and market analysis. VETASSESS does not consider Market Research Analyst under ANZSCO 225113.",
          "VETASSESS'in tanımına göre Market Research Analyst ağırlıklı olarak nicel ve nitel araştırma, tüketici davranışı, eğilimler ve pazar analizine odaklanır. VETASSESS, Market Research Analyst'i ANZSCO 225113 kapsamında değerlendirmez.",
          "按 VETASSESS 的描述，Market Research Analyst 主要侧重定量和定性研究、消费者行为、趋势和市场分析。VETASSESS 不在 ANZSCO 225113 下考虑 Market Research Analyst。",
        ),
      },
      {
        q: t("Which published occupation lists include Marketing Specialist?", "Marketing Specialist hangi yayımlanmış meslek listelerinde yer alır?", "哪些已公布的职业清单包含 Marketing Specialist？"),
        a: t(
          "In LogiVisa's occupation dataset dated 2026-07-09, ANZSCO 225113 appears on the CSOL (Core Skills Occupation List) and the STSOL (Short-term Skilled Occupation List). The Home Affairs lists are the authoritative source and change over time.",
          "LogiVisa'nın 2026-07-09 tarihli meslek veri setinde ANZSCO 225113 CSOL (Core Skills Occupation List) ve STSOL (Short-term Skilled Occupation List) listelerinde yer alır. Yetkili kaynak İçişleri Bakanlığı listeleridir ve zamanla değişir.",
          "在 LogiVisa 日期为 2026-07-09 的职业数据集中，ANZSCO 225113 列于 CSOL（Core Skills Occupation List）和 STSOL（Short-term Skilled Occupation List）。澳大利亚内政部的清单为权威来源，并会随时间变化。",
        ),
      },
      {
        q: t("Is Marketing Specialist used in Australian skilled visa programs?", "Marketing Specialist Avustralya nitelikli vize programlarında kullanılıyor mu?", "Marketing Specialist 是否用于澳大利亚技术签证项目？"),
        a: t(
          "Marketing Specialist appears on published occupation lists that are used in Australian skilled visa program rules; see the related visa research on this page. Occupation-list inclusion does not decide an individual's visa, nomination, sponsorship or permanent residence outcome.",
          "Marketing Specialist, Avustralya nitelikli vize programı kurallarında kullanılan yayımlanmış meslek listelerinde yer alır; bu sayfadaki ilgili vize araştırmasına bakın. Bir meslek listesinde yer almak, bir kişinin vize, aday gösterme, sponsorluk veya daimi oturum sonucunu belirlemez.",
          "Marketing Specialist 列于澳大利亚技术签证项目规则所使用的已公布职业清单；请参阅本页的相关签证研究。列入职业清单并不决定个人的签证、提名、担保或永久居留结果。",
        ),
      },
      {
        q: t(
          "Do the 482 and 186 visas restrict Marketing Specialist beyond the skills assessment?",
          "482 ve 186 vizeleri Marketing Specialist için beceri değerlendirmesinin ötesinde kısıt getirir mi?",
          "482 和 186 签证对 Marketing Specialist 是否有技能评估之外的限制？",
        ),
        a: t(
          "The published Core Skills Occupation List instruments for subclass 482 and subclass 186 list ANZSCO 225113 with applicable circumstances 6 (including a front-line retail setting or predominantly direct client transactional interaction) and 11 (a business with annual turnover under AUD1,000,000). Where a listed circumstance applies to the position, the instrument says the occupation does not apply. These are separate from VETASSESS's employment requirements, and this page does not assess any position or person.",
          "Subclass 482 ve subclass 186 için yayımlanmış Core Skills Occupation List düzenlemeleri, ANZSCO 225113'ü 6 (ön cephe perakende ortamı veya ağırlıklı olarak doğrudan müşteri işlemi dahil) ve 11 (yıllık cirosu AUD1,000,000'un altındaki işletme) numaralı uygulanabilir koşullarla listeler. Listelenen bir koşul pozisyona uygulanıyorsa düzenleme mesleğin uygulanmadığını belirtir. Bunlar VETASSESS'in istihdam gerekliliklerinden ayrıdır ve bu sayfa hiçbir pozisyonu veya kişiyi değerlendirmez.",
          "482 子类和 186 子类已公布的 Core Skills Occupation List 法律文书将 ANZSCO 225113 与适用情形 6（包括前线零售环境或主要涉及直接客户交易互动）和 11（年营业额低于 AUD1,000,000 的企业）一并列出。若所列情形适用于该职位，文书规定该职业不适用。这些规定独立于 VETASSESS 的工作经历要求，本页不评估任何职位或个人。",
        ),
      },
      {
        q: t("Does being on an occupation list mean I get permanent residence?", "Bir meslek listesinde olmak daimi oturum alacağım anlamına mı gelir?", "列入职业清单是否意味着我能获得永久居留？"),
        a: t(
          "No. Appearing on an occupation list is published information about the occupation, not a decision about a person. Other requirements still apply.",
          "Hayır. Bir meslek listesinde yer almak meslek hakkında yayımlanmış bilgidir, kişi hakkında bir karar değildir. Diğer koşullar da geçerlidir.",
          "不是。列入职业清单只是关于该职业的公开信息，并非针对个人的决定。其他要求仍然适用。",
        ),
      },
    ],
  };
}
