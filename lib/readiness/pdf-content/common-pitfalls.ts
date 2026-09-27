import type { Locale } from "../types";
import { ENGLISH_TEST_VALIDITY_YEARS } from "../constants";

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
              { category: "Beceri Değerlendirmesi", title: "Eksik İş Deneyimi Kanıtı", body: "Referans mektupları iş unvanınızı, görev tanımlarını, çalışma tarihlerini, haftalık saatleri ve maaşı içermelidir; ANZSCO kodu gerekmez. Görevler aday gösterilen meslekle örtüşmelidir; genel ifadeler yetersiz kabul edilir." },
              { category: "Dil Testi", title: "Skor Geçerliliği Sorunu", body: `Davet tarihinde en az Competent English seviyesine sahip olmalısınız; test sonucu davet tarihinden önceki ${ENGLISH_TEST_VALIDITY_YEARS.AU} yıl içinde alınmış olmalıdır. Süresi dolmuş bir skor bu puanı ve İngilizce şartını karşılamaz; davetten önce geçerliliğini kontrol edin.` },
              { category: "Dil Testi", title: "Yanlış Test Seçimi", body: "IELTS Academic ve General Training, PTE Academic ve TOEFL iBT, Avustralya Genel Beceri Göçü (GSM) puan tablosu için kabul edilen testlerdir; OET yalnızca sağlık meslekleri için geçerlidir. Meslek koduna ve vize alt sınıfına göre hangi testin size uygun olduğunu kontrol edin." },
              { category: "Başvuru", title: "60 Gün Kuralı", body: "Davet aldıktan sonra 60 gün içinde başvuru sunulmalıdır. Bu süre uzatılamaz. Başvurunuzu davet öncesi hazırlayın." },
              { category: "Finansal", title: "Eyalet Adaylığında Fon Kanıtı", body: "189, 190 ve 491 vizeleri için federal bir yerleşim fonu (settlement funds) şartı yoktur. Ancak bazı eyalet adaylık programları fon kanıtı ister; başvurmadan önce seçtiğiniz eyaletin koşullarını kontrol edin." },
              { category: "Sağlık", title: "Geçersiz Sağlık Raporu", body: "Sağlık muayenesi sadecepanel onaylı doktorlar tarafından yapılmalıdır. Yanlış klinikte yaptırılan muayene geçersiz sayılır." },
              { category: "Yasal", title: "Sahte veya Yanıltıcı Bilgi", body: "Yanlış veya yanıltıcı bilgi ya da belge vermek retle sonuçlanabilir ve PIC 4020 kapsamında genellikle 3 yıllık bir yasak getirir; kimliğinizi kanıtlayamamanız gibi kimlikle ilgili durumlarda bu süre 10 yıldır. Her zaman doğru bilgi verin." },
            ]
          : isZh
            ? [
                { category: "技能评估", title: "选择了错误的ANZSCO代码", body: "选择与职业描述不匹配的ANZSCO代码会导致拒签。请仔细阅读每个代码的主要职责列表。" },
                { category: "技能评估", title: "工作经验证明不全", body: "工作推荐信需写明职位、职责描述、任职起止日期、每周工作时长和薪资；无需注明ANZSCO代码。所列职责应与提名职业相符，笼统的表述会被视为不合格。" },
                { category: "语言考试", title: "成绩过期问题", body: `获邀时您必须至少具备 Competent English；考试成绩须在获邀日期前 ${ENGLISH_TEST_VALIDITY_YEARS.AU} 年内取得。过期成绩不能满足英语要求或相应加分；请在获邀前确认成绩仍在有效期内。` },
                { category: "语言考试", title: "选择了错误的考试", body: "IELTS Academic 和 General Training、PTE Academic 以及 TOEFL iBT 均被澳大利亚技术移民（GSM）积分测试接受；OET 仅适用于医疗相关职业。请根据您的职业代码和签证子类确认适用的考试。" },
                { category: "申请流程", title: "60天期限", body: "收到邀请后须在60天内提交申请，此期限不可延长。请在收到邀请前就准备好申请材料。" },
                { category: "财务", title: "州担保的资金证明", body: "189、190 和 491 签证没有联邦层面的定居资金要求。但部分州担保项目会要求提供资金证明；申请前请查看所选州的要求。" },
                { category: "健康", title: "体检报告无效", body: "体检只能由指定诊所的医生进行。在非指定机构做的体检无效。" },
                { category: "法律", title: "提供虚假或误导性信息", body: "提供虚假或误导性信息或文件可能导致拒签，并通常依据 PIC 4020 被禁止申请 3 年；若涉及身份问题（例如无法证明身份），禁止期为 10 年。请始终提供真实信息。" },
              ]
            : [
                { category: "Skills Assessment", title: "Wrong ANZSCO Code Selection", body: "Choosing an occupation code that doesn't match your actual duties leads to rejection. Carefully read the 'lead activities' list for each code." },
                { category: "Skills Assessment", title: "Insufficient Work Evidence", body: "Employment references should state your job title, duties, dates of employment, weekly hours and salary; they do not need an ANZSCO code. The duties must match your nominated occupation, and generic statements are rejected." },
                { category: "Language Test", title: "Score Validity Issues", body: `You must have at least Competent English at the time of invitation, from a test taken within the ${ENGLISH_TEST_VALIDITY_YEARS.AU} years before the date of invitation. An expired score cannot meet the English requirement or earn English points, so check its date before you are invited.` },
                { category: "Language Test", title: "Wrong Test Selection", body: "IELTS Academic and General Training, PTE Academic, and TOEFL iBT are all accepted for the Australian General Skilled Migration (GSM) points test; OET is specific to healthcare occupations. Check which test suits your occupation code and visa subclass." },
                { category: "Application", title: "The 60-Day Rule", body: "You must lodge your application within 60 days of invitation. This deadline cannot be extended. Prepare before you receive the invitation." },
                { category: "Financial", title: "State Nomination Funds Evidence", body: "Subclasses 189, 190 and 491 have no federal settlement-funds requirement. Some state nomination programs do ask for evidence of funds, so check your chosen state's requirements before you apply." },
                { category: "Health", title: "Invalid Health Examination", body: "Health examinations must be conducted by panel-approved doctors only. Examinations at non-approved clinics are invalid." },
                { category: "Legal", title: "False or Misleading Information", body: "Providing false or misleading information or documents can lead to refusal and, under public interest criterion 4020, generally a 3-year exclusion from further visas; the exclusion is 10 years in identity-related cases. Always provide truthful information." },
              ]),
  };
}
