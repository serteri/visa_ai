import { researchText } from "@/lib/marketing/research-journey";
import { supportedToolMappings } from "@/lib/skills-assessment/tool-coverage";
import assessingData from "@/src/data/assessing-bodies.json";
export function getSkillsAssessmentSeoContent(locale: string) {
  const text = (en: string, tr: string, zh: string) =>
    researchText(locale, en, tr, zh);
  const count = Object.keys(
    supportedToolMappings(assessingData.occupationMapping),
  ).length;
  return {
    toolLabel: text(
      "Skills assessment references",
      "Beceri değerlendirme kaynakları",
      "技能评估参考",
    ),
    aboutTitle: text(
      "Understanding this finder's coverage",
      "Aracın kapsamı",
      "了解本工具的覆盖范围",
    ),
    intro: text(
      `This finder contains ${count} explicit occupation mappings. Search coverage and assessment requirements are different; a missing mapping is not a conclusion about an occupation or an individual.`,
      `Bu araç ${count} meslek-kurum kaydı içerir. Arama kapsamı ve değerlendirme şartları farklıdır; eksik kayıt meslek veya kişi hakkında bir sonuç değildir.`,
      `本工具包含 ${count} 条明确职业对应记录。搜索覆盖范围与评估要求不同；缺少对应关系并非职业或个人情况的结论。`,
    ),
    sections: [
      {
        heading: text(
          "Read the scope and official source",
          "Kapsam ve resmî kaynak",
          "阅读范围与官方来源",
        ),
        body: text(
          "Assessment bodies publish different programs, fees and document requirements. A listed reference does not determine which program applies to an individual. Read any source date and program-specific notes, and use the linked official source for current information.",
          "Değerlendirme kurumları farklı programlar, ücretler ve belge şartları yayımlar. Liste kaydı kişiye hangi programın uygulanacağını belirlemez. Kaynak tarihlerini, program notlarını ve güncel resmî kaynağı okuyun.",
          "评估机构公布不同类别、费用与材料要求。列出的参考不能确定个人适用的类别。请阅读来源日期及类别说明，并查阅链接中的官方来源获取当前信息。",
        ),
      },
    ],
    faqs: [
      {
        q: text(
          "Does a missing mapping mean an occupation cannot be assessed?",
          "Eksik kayıt, mesleğin değerlendirilemeyeceği anlamına gelir mi?",
          "缺少对应关系是否意味着职业不能评估？",
        ),
        a: text(
          "No. It means this finder does not hold a resolved reference. The Home Affairs occupation list and the relevant authority are the official sources.",
          "Hayır. Araçta doğrulanmış referans bulunmadığını gösterir. İçişleri Bakanlığı meslek listesi ve ilgili kurum resmî kaynaklardır.",
          "不是。这意味着本工具未保存已解决的参考。内政部职业清单与相关评估机构是官方来源。",
        ),
      },
      {
        q: text(
          "Are all published fees and times the same for every application?",
          "Yayımlanmış ücret ve süreler her başvuruda aynı mı?",
          "公开费用与时间是否适用于所有申请？",
        ),
        a: text(
          "No. Figures and documents can depend on the assessment program and circumstances. Read the source and stated scope; processing times are not promises.",
          "Hayır. Rakamlar ve belgeler değerlendirme programına ve duruma göre değişebilir. Kaynağı ve kapsamı okuyun; işlem süreleri garanti değildir.",
          "不是。费用与材料可能因评估类别及情况而异。请阅读来源和适用范围；处理时间并非保证。",
        ),
      },
    ],
    faqTitle: text(
      "About the assessment references",
      "Değerlendirme kaynakları hakkında",
      "关于评估参考资料",
    ),
  };
}
export function buildSkillsAssessmentSchema(locale: string): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: getSkillsAssessmentSeoContent(locale).faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  });
}
