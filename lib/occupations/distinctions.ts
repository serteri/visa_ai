import { researchText } from "@/lib/marketing/research-journey";

/**
 * Source-backed "do not confuse" notes for occupations where search shows a recurring confusion with a neighbouring ANZSCO
 * occupation or pathway. Each entry paraphrases the published ANZSCO / assessing-authority wording and links the originals; it
 * never says which occupation or pathway applies to a person.
 */
export type OccupationDistinction = {
  heading: string;
  body: string[];
  /** A neighbouring occupation page worth reading next, if any. */
  compare?: { slug: string; label: string };
  sources: Array<{ label: string; url: string }>;
};

const ACS_IT = "https://www.acs.org.au/msa/information-for-applicants/occupations-anzsco-codes/information-technology.html";
const ABS_ANZSCO = "https://www.abs.gov.au/statistics/classifications/anzsco-australian-and-new-zealand-standard-classification-occupations";
const EA_MSA = "https://www.engineersaustralia.org.au/migrants/migration-skills-assessment";

export function occupationDistinction(code: string, locale: string): OccupationDistinction | null {
  const t = (en: string, tr: string, zh: string) => researchText(locale, en, tr, zh);
  switch (code) {
    case "351311":
      return {
        heading: t("Chef or Cook? Two separate ANZSCO occupations", "Chef mi Cook mu? İki ayrı ANZSCO mesleği", "Chef 还是 Cook？两个独立的 ANZSCO 职业"),
        body: [
          t(
            "ANZSCO places Chef (351311) in unit group 3513 and Cook (351411) in unit group 3514. The Chef description is built around planning menus, costing, ordering supplies and overseeing dish quality; Cook is a separate entry.",
            "ANZSCO, Chef (351311) mesleğini 3513, Cook (351411) mesleğini ise 3514 birim grubunda gösterir. Chef tanımı menü planlama, maliyetleme, tedarik ve yemek kalitesinin denetimi etrafında kuruludur; Cook ayrı bir kayıttır.",
            "ANZSCO 将 Chef (351311) 归入 3513 单元组，Cook (351411) 归入 3514 单元组。Chef 的描述围绕菜单规划、成本核算、采购和出品质量把控；Cook 是单独条目。",
          ),
          t(
            "Which one a person's work matches is a question for the assessing authority or an authorised migration professional. Read both published descriptions side by side before drawing any conclusion.",
            "Bir kişinin işinin hangisine uyduğu, değerlendirme kurumu veya yetkili bir göçmenlik uzmanının konusudur. Sonuç çıkarmadan önce iki yayımlanmış tanımı yan yana okuyun.",
            "个人工作更接近哪一个，应由评估机构或获授权移民专业人士判断。请先并排阅读两个已公布的描述。",
          ),
        ],
        compare: { slug: "351411-cook", label: t("Read the Cook (351411) page", "Cook (351411) sayfasını okuyun", "查看 Cook (351411) 页面") },
        sources: [{ label: t("ABS ANZSCO classification", "ABS ANZSCO sınıflandırması", "ABS ANZSCO 分类"), url: ABS_ANZSCO }],
      };
    case "261312":
    case "261313": {
      const other =
        code === "261312"
          ? { code: "261313", slug: "261313-software-engineer", n: "Software Engineer" }
          : { code: "261312", slug: "261312-developer-programmer", n: "Developer Programmer" };
      return {
        heading: t("Developer Programmer or Software Engineer? Read both descriptions", "Developer Programmer mı Software Engineer mı? İki tanımı da okuyun", "Developer Programmer 还是 Software Engineer？请对照两个描述"),
        body: [
          t(
            "ANZSCO describes Developer Programmer (261312) mainly as building, maintaining and modifying code from specifications, technical designs and flow charts. Software Engineer (261313) is described more broadly: designing, developing, testing and supporting software and systems.",
            "ANZSCO, Developer Programmer (261312) mesleğini ağırlıklı olarak spesifikasyon, teknik tasarım ve akış şemalarından kod yazma, bakım ve değiştirme olarak tanımlar. Software Engineer (261313) daha geniş tanımlanır: yazılım ve sistemlerin tasarımı, geliştirilmesi, test edilmesi ve desteği.",
            "ANZSCO 将 Developer Programmer (261312) 主要描述为依据规格说明、技术设计和流程图构建、维护和修改代码；Software Engineer (261313) 的描述更宽泛：设计、开发、测试并支持软件与系统。",
          ),
          t(
            "Both are ICT occupations with ACS as the assessing authority, but the descriptions and assessment criteria differ. ACS publishes the originals; a job title alone does not decide which applies.",
            "İkisi de ACS'nin değerlendirdiği BT meslekleridir, ancak tanımlar ve değerlendirme ölçütleri farklıdır. Orijinalleri ACS yayımlar; yalnızca iş unvanı hangisinin geçerli olduğunu belirlemez.",
            "两者均为 ACS 负责评估的 ICT 职业，但描述和评估标准不同。原文由 ACS 发布；仅凭职位名称无法确定适用哪一个。",
          ),
        ],
        compare: { slug: other.slug, label: t(`Compare with ${other.n} (${other.code})`, `${other.n} (${other.code}) ile karşılaştırın`, `对比 ${other.n} (${other.code})`) },
        sources: [{ label: t("ACS: ICT occupations and ANZSCO codes", "ACS: BT meslekleri ve ANZSCO kodları", "ACS：ICT 职业与 ANZSCO 代码"), url: ACS_IT }],
      };
    }
    case "233211":
      return {
        heading: t("Accredited qualification or CDR? Two different questions", "Akredite nitelik mi CDR mi? İki farklı soru", "认证学历还是 CDR？两个不同的问题"),
        body: [
          t(
            "Engineers Australia lists separate pathways: accredited qualifications (Australian programs and those recognised under the Washington, Sydney or Dublin Accords) and the Competency Demonstration Report (CDR). Which applies depends on how the qualification is recognised, not on the job title.",
            "Engineers Australia ayrı yollar sıralar: akredite nitelikler (Avustralya programları ile Washington, Sydney veya Dublin Anlaşmaları kapsamında tanınanlar) ve Competency Demonstration Report (CDR). Hangisinin geçerli olduğu iş unvanına değil, niteliğin nasıl tanındığına bağlıdır.",
            "Engineers Australia 列出不同路径：认证学历（澳大利亚课程及华盛顿、悉尼或都柏林协议认可的课程）与能力证明报告 (CDR)。适用哪一类取决于学历的认可方式，而非职位名称。",
          ),
          t(
            "A CDR is a written competency report assessed for migration purposes; it is not a qualification. Check the current Engineers Australia guide for what each pathway requires.",
            "CDR, göç amacıyla değerlendirilen yazılı bir yeterlilik raporudur; bir nitelik değildir. Her yolun gerekliliklerini güncel Engineers Australia rehberinden kontrol edin.",
            "CDR 是为移民目的评估的书面能力报告，并非学历。各路径的具体要求请查阅 Engineers Australia 最新指南。",
          ),
        ],
        sources: [{ label: t("Engineers Australia: migration skills assessment", "Engineers Australia: göçmenlik beceri değerlendirmesi", "Engineers Australia：移民技能评估"), url: EA_MSA }],
      };
    default:
      return null;
  }
}
