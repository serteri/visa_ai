import { researchText } from "@/lib/marketing/research-journey";
export function getStateNominationSeoContent(locale: string) {
  const text = (en: string, tr: string, zh: string) =>
    researchText(locale, en, tr, zh);
  return {
    toolLabel: text(
      "State nomination references",
      "Eyalet adaylık kaynakları",
      "州提名参考资料",
    ),
    aboutTitle: text(
      "Understanding the reference data",
      "Kaynak verilerini anlamak",
      "了解参考数据",
    ),
    intro: text(
      "Occupation-list entries and visa nomination are different. A historical list entry cannot establish an individual's current nomination outcome.",
      "Meslek listesi kaydı ve vize adaylığı farklıdır. Geçmiş liste kaydı, kişinin güncel adaylık sonucunu göstermez.",
      "职业清单收录与签证提名不同。历史清单记录无法确定个人当前提名结果。",
    ),
    sections: [
      {
        heading: text(
          "Source dates and coverage",
          "Kaynak tarihleri ve kapsam",
          "来源日期与覆盖范围",
        ),
        body: text(
          "This page identifies the dates and scope of the lists held in our dataset. Some sources concern 2025–26. NSW entries are at unit-group level. Other states may not have occupation-level lists in our data. Current criteria are published by each state or territory.",
          "Bu sayfa veri setindeki listelerin tarihlerini ve kapsamını gösterir. Bazı kaynaklar 2025–26 dönemine aittir. NSW kayıtları birim grubu düzeyindedir. Bazı eyaletler için meslek düzeyinde liste yoktur. Güncel kriterleri eyaletler ve bölgeler yayımlar.",
          "本页说明保存清单的日期与范围。部分来源属于 2025–26 年。NSW 记录为单元组级别。其他州可能缺少职业级清单。当前标准由各州或领地公布。",
        ),
      },
    ],
    faqs: [
      {
        q: text(
          "Does a list entry mean nomination?",
          "Liste kaydı adaylık anlamına gelir mi?",
          "列入清单是否代表提名？",
        ),
        a: text(
          "No. Occupation-list inclusion is a published reference, not a nomination or an assessment of individual circumstances. Official requirements can differ by program and change over time.",
          "Hayır. Meslek listesi kaydı, kişisel durumun değerlendirmesi veya adaylık değildir. Resmî şartlar programa göre farklılaşabilir ve değişebilir.",
          "不是。职业清单收录仅为公开参考，并非提名或个人情况评估。官方要求因项目而异且会变化。",
        ),
      },
    ],
    faqTitle: text(
      "About these references",
      "Bu kaynaklar hakkında",
      "关于这些参考资料",
    ),
  };
}
export function buildStateNominationSchema(locale: string): string {
  const content = getStateNominationSeoContent(locale);
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: content.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  });
}
