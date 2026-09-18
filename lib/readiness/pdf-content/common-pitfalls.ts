import type { Locale } from "../types";

type Country = "AU" | "CA";

/**
 * Returns localized common pitfalls content.
 * 2 pages, covering top rejection reasons and mistakes.
 */
export function getCommonPitfalls(locale: Locale, country: Country): {
  title: string;
  intro: string;
  pitfalls: Array<{ category: string; title: string; body: string }>;
} {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const isCA = country === "CA";

  return {
    title: isTr ? "Sık Yapılan Hatalar" : isZh ? "常见错误" : "Common Pitfalls",
    intro: isTr
      ? "Başvuru reddedilmesinin en yaygın nedenleri ve bunları nasıl önleyeceğiniz:"
      : isZh
        ? "申请被拒的最常见原因以及如何避免："
        : "The most common reasons for application rejection and how to avoid them:",
    // CA has no "Skills Assessment"/ANZSCO concept, a 2-year (not 2-3 year)
    // language test validity window, and a 5-year (not 10-year) IRCC
    // misrepresentation ban -- these are real, distinct rules, not just
    // relabeled AU ones, so CA gets its own grounded list rather than a
    // country ternary on the same AU-shaped items.
    pitfalls: isCA
      ? (isTr
          ? [
              { category: "NOC Kodu", title: "Yanlış NOC Kodu Seçimi", body: "Fiili görevlerinizle uyuşmayan bir NOC kodu seçmek reddetmeye yol açar. Her kodun ana görev listesini dikkatlice okuyun." },
              { category: "ECA", title: "Geçersiz veya Eski ECA", body: "ECA, IRCC tarafından belirlenen bir kuruluş tarafından yapılmalı ve başvuru sırasında 5 yıldan eski olmamalıdır." },
              { category: "Dil Testi", title: "Skor Geçerliliği Sorunu", body: "Express Entry için dil testi sonuçları 2 yıl geçerlidir. Süresi dolmuş skorla profil oluşturmak otomatik ret nedenidir." },
              { category: "Dil Testi", title: "Yanlış Test Türü", body: "IELTS General Training (Academic değil), CELPIP General, veya TEF/TCF Canada kabul edilir. Yanlış test türü reddedilir." },
              { category: "Başvuru", title: "60 Gün Kuralı", body: "ITA (davet) aldıktan sonra 60 gün içinde eksiksiz başvuru sunulmalıdır. Bu süre uzatılamaz." },
              { category: "Finansal", title: "Yetersiz Yerleşim Fonu", body: "Aile büyüklüğüne göre yeterli fon gösterilmelidir (Kanada'da geçerli iş izniyle çalışanlar hariç). Eksik fon kanıtı yaygın bir ret nedenidir." },
              { category: "Sağlık", title: "Geçersiz Sağlık Raporu", body: "Sağlık muayenesi yalnızca panel onaylı doktorlar tarafından yapılmalıdır. Onaylı olmayan klinikte yaptırılan muayene geçersiz sayılır." },
              { category: "Yasal", title: "Sahte veya Yanıltıcı Bilgi", body: "Başvuruda kasıtlı yalan veya yanıltıcı bilgi vermek IRCC tarafından 5 yıl men cezasına yol açar. Her zaman doğru bilgi verin." },
            ]
          : isZh
            ? [
                { category: "NOC 代码", title: "选择了错误的 NOC 代码", body: "选择与实际职责不符的 NOC 代码会导致拒签。请仔细阅读每个代码的主要职责列表。" },
                { category: "ECA", title: "ECA 无效或过期", body: "ECA 必须由 IRCC 指定机构出具，且在申请时不得超过 5 年。" },
                { category: "语言考试", title: "成绩过期问题", body: "Express Entry 语言考试成绩有效期为 2 年。使用过期成绩创建档案会自动被拒。" },
                { category: "语言考试", title: "选择了错误的考试类型", body: "系统接受 IELTS General Training（非 Academic）、CELPIP General 或 TEF/TCF Canada。考试类型错误将被拒绝。" },
                { category: "申请流程", title: "60天期限", body: "收到 ITA（邀请）后须在 60 天内提交完整申请，此期限不可延长。" },
                { category: "财务", title: "定居资金不足", body: "需要根据家庭人数提供足够的资金证明（在加拿大持有有效工签工作者除外）。资金不足是常见的拒签原因。" },
                { category: "健康", title: "体检报告无效", body: "体检只能由指定的小组医生进行。在非指定机构做的体检无效。" },
                { category: "法律", title: "提供虚假或误导性信息", body: "在申请中故意提供虚假信息将导致 IRCC 5 年禁止申请处罚。请始终提供真实信息。" },
              ]
            : [
                { category: "NOC Code", title: "Wrong NOC Code Selection", body: "Choosing a NOC code that doesn't match your actual duties leads to rejection. Carefully read the lead statement/main duties list for each code." },
                { category: "ECA", title: "Invalid or Expired ECA", body: "Your ECA must be from an IRCC-designated organization and must not be more than 5 years old at the time of application." },
                { category: "Language Test", title: "Score Validity Issues", body: "Language test results are valid for 2 years for Express Entry. Creating a profile with an expired score results in automatic rejection." },
                { category: "Language Test", title: "Wrong Test Type", body: "IELTS General Training (not Academic), CELPIP General, or TEF/TCF Canada are accepted. The wrong test type will be rejected." },
                { category: "Application", title: "The 60-Day Rule", body: "You must submit a complete application within 60 days of receiving your ITA (invitation). This deadline cannot be extended." },
                { category: "Financial", title: "Insufficient Settlement Funds", body: "You must demonstrate adequate funds for your family size (unless you're already working in Canada on a valid work permit). Insufficient financial evidence is a common rejection reason." },
                { category: "Health", title: "Invalid Health Examination", body: "Health examinations must be conducted by panel physicians only. Examinations at non-approved clinics are invalid." },
                { category: "Legal", title: "False or Misleading Information", body: "Intentionally providing false information in your application results in a 5-year IRCC ban. Always provide truthful information." },
              ])
      : (isTr
          ? [
              { category: "Beceri Değerlendirmesi", title: "Yanlış ANZSCO Kodu Seçimi", body: "Meslek tanımınızla uyuşmayan bir ANZSCO kodu seçmek reddetmeye yol açar. Her kodun ' ana görevleri ' (lead activities) listesini dikkatlice okuyun." },
              { category: "Beceri Değerlendirmesi", title: "Eksik İş Deneyimi Kanıtı", body: "İş mektupları ANZSCO kodu, görev tanımlarını, çalışma süresini ve maaşı içermelidir. ' Genel ifadeler ' yetersiz kabul edilir." },
              { category: "Dil Testi", title: "Skor Geçerliliği Sorunu", body: "Dil testi sonuçları 2-3 yıl geçerlidir. Süresi dolmuş skorla başvuru yapmak otomatik ret nedenidir." },
              { category: "Dil Testi", title: "Yanlış Test Seçimi", body: "Her vize türü için kabul edilen testler farklıdır. Örneğin IELTS Academic Genel Göçmenlik için kabul edilmez." },
              { category: "Başvuru", title: "60 Gün Kuralı", body: "Davet aldıktan sonra 60 gün içinde başvuru sunulmalıdır. Bu süre uzatılamaz. Başvurunuzu davet öncesi hazırlayın." },
              { category: "Finansal", title: "Yetersiz Settlement Funds", body: "Aile büyüklüğüne göre yeterli fon gösterilmelidir. Eksik fon kanıtı başvuru reddedilmesinin yaygın nedenlerinden biridir." },
              { category: "Sağlık", title: "Geçersiz Sağlık Raporu", body: "Sağlık muayenesi sadecepanel onaylı doktorlar tarafından yapılmalıdır. Yanlış klinikte yaptırılan muayene geçersiz sayılır." },
              { category: "Yasal", title: "Sahte veya Yanıltıcı Bilgi", body: "Başvuruda kasıtlı yalan veya yanıltıcı bilgi vermek 10 yıl men cezasına yol açar. Her zaman doğru bilgi verin." },
            ]
          : isZh
            ? [
                { category: "技能评估", title: "选择了错误的ANZSCO代码", body: "选择与职业描述不匹配的ANZSCO代码会导致拒签。请仔细阅读每个代码的主要职责列表。" },
                { category: "技能评估", title: "工作经验证明不全", body: "工作推荐信需包含ANZSCO代码、职责描述、工作时间和薪资。笼统的表述会被视为不合格。" },
                { category: "语言考试", title: "成绩过期问题", body: "语言考试成绩有效期为2-3年。使用过期成绩申请会自动被拒。" },
                { category: "语言考试", title: "选择了错误的考试", body: "不同签证类型接受的考试不同。例如，IELTS Academic不被技术移民接受。" },
                { category: "申请流程", title: "60天期限", body: "收到邀请后须在60天内提交申请，此期限不可延长。请在收到邀请前就准备好申请材料。" },
                { category: "财务", title: "定居资金不足", body: "需要根据家庭人数提供足够的资金证明。资金不足是申请被拒的常见原因之一。" },
                { category: "健康", title: "体检报告无效", body: "体检只能由指定诊所的医生进行。在非指定机构做的体检无效。" },
                { category: "法律", title: "提供虚假或误导性信息", body: "在申请中故意提供虚假信息将导致10年禁止申请处罚。请始终提供真实信息。" },
              ]
            : [
                { category: "Skills Assessment", title: "Wrong ANZSCO Code Selection", body: "Choosing an occupation code that doesn't match your actual duties leads to rejection. Carefully read the 'lead activities' list for each code." },
                { category: "Skills Assessment", title: "Insufficient Work Evidence", body: "Employment letters must include ANZSCO code, duty descriptions, duration, and salary. Generic statements are rejected." },
                { category: "Language Test", title: "Score Validity Issues", body: "Language test results are valid for 2-3 years. Applying with an expired score results in automatic rejection." },
                { category: "Language Test", title: "Wrong Test Selection", body: "Different visa types accept different tests. For example, IELTS Academic is not accepted for General Skilled Migration." },
                { category: "Application", title: "The 60-Day Rule", body: "You must lodge your application within 60 days of invitation. This deadline cannot be extended. Prepare before you receive the invitation." },
                { category: "Financial", title: "Insufficient Settlement Funds", body: "You must demonstrate adequate funds for your family size. Insufficient financial evidence is a common rejection reason." },
                { category: "Health", title: "Invalid Health Examination", body: "Health examinations must be conducted by panel-approved doctors only. Examinations at non-approved clinics are invalid." },
                { category: "Legal", title: "False or Misleading Information", body: "Intentionally providing false information in your application results in a 10-year ban. Always provide truthful information." },
              ]),
  };
}
