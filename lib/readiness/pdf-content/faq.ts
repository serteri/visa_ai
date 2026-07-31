import type { Locale } from "../types";

type Country = "AU" | "CA";

interface FAQItem {
  question: string;
  answer: string;
}

/**
 * Returns localized FAQ content for the visa readiness report.
 * 2 pages, 10 questions, localized for en/tr/zh-Hans and AU/CA.
 */
export function getFaqSection(locale: Locale, country: Country): {
  title: string;
  intro: string;
  items: FAQItem[];
} {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";

  const commonItems: FAQItem[] = isTr
    ? [
        { question: "Başvurumu beklerken çalışabilir miyim?", answer: "Evet, mevcut vizenizin çalışma izni varsa başvurunuz devam ederken çalışmaya devam edebilirsiniz." },
        { question: "İngilizce skorumun süresi dolduysa ne yapmalıyım?", answer: "Dil testi sonuçları 2-3 yıl geçerlidir. Süresi dolmadan yeni bir test yapmanız gerekir." },
        { question: "Eşim/partnerim de başvurabilir mi?", answer: "Evet, partneriniz ana başvuruya ek olarak dahil edilebilir (secondary applicant). Ek belgeler ve ücret gerekir." },
        { question: "İşimi değiştirirsem ne olur?", answer: "EOI'nizi güncelleyerek yeni iş deneyiminizi ekleyebilirsiniz. EOI her zaman güncellenebilir." },
        { question: "Başvurum reddedilirse ne yapabilirim?", answer: "Temyiz (merit review) veya idari inceleme (AIR) yolları mevcuttur. Reddetme mektubundaki nedenlere göre hareket etmeniz önerilir." },
      ]
    : isZh
      ? [
          { question: "等待申请期间我可以工作吗？", answer: "可以，只要您当前签证有工作许可，您可以在申请期间继续工作。" },
          { question: "如果英语成绩过期了怎么办？", answer: "语言考试成绩有效期为2-3年。过期前需要重新参加考试。" },
          { question: "我的配偶/伴侣可以一起申请吗？", answer: "可以，配偶/伴侣可以作为副申请人加入主申请。需要额外材料和费用。" },
          { question: "如果我换了工作会怎样？", answer: "您可以更新EOI添加新的工作经验。EOI可以随时更新。" },
          { question: "如果申请被拒了怎么办？", answer: "有行政复审（merit review）或行政内部审查（AIR）途径。建议根据拒签信中的原因采取行动。" },
        ]
      : [
          { question: "Can I work while my application is being processed?", answer: "Yes, you can continue working if your current visa has work rights. Your application processing does not affect your current work authorization." },
          { question: "What if my English test score expires?", answer: "Language test results are valid for 2-3 years. You must retake the test before your current score expires." },
          { question: "Can my spouse/partner be included?", answer: "Yes, your spouse or de facto partner can be included as a secondary applicant. Additional documents and fees apply." },
          { question: "What if I change jobs during the process?", answer: "You can update your EOI to reflect new work experience. Your EOI is always editable." },
          { question: "What if my application is refused?", answer: "Merit review and judicial review options are available. Act on the specific reasons stated in your refusal letter." },
        ];

  const countryItems: FAQItem[] = country === "CA"
    ? isTr
        ? [
            { question: "CRS puanım yeterli değilse ne yapabilirim?", answer: "Dil puanınızı artırın (+20-40 puan),province adaylığı alın (+600 puan), veya Kanada'da iş deneyimi edinin." },
            { question: "PNP (Province Nominee Program) nedir?", answer: "Eyaletlerin kendi adaylarını seçtiği bir programdır. Eyalet adaylığı +600 CRS puan ekler, davet garantisi sağlar." },
            { question: "Express Entry ne kadar sürer?", answer: "Hedef süre: profilden davete 6 ay, davetten karara 6 ay. Toplam: 12 ay." },
            { question: "Settlement Funds ne kadar olmalı?", answer: "Aile büyüklüğüne göre değişir. Tek kişilik: ~CAD 14,000. 4 kişilik aile: ~CAD 25,000. Güncel tutarlar IRCC sitesinde yayınlanır." },
            { question: "LMIA gerekli mi?", answer: "Express Entry için LMIA gerekmez (istisnalar var). Ancak iş teklifi varsa LMIA +50 CRS puanı ekler." },
          ]
        : isZh
          ? [
              { question: "如果我的CRS分数不够怎么办？", answer: "提高语言分数（+20-40分），获得省提名（+600分），或在加拿大积累工作经验。" },
              { question: "什么是PNP（省提名计划）？", answer: "各省自行选拔候选人的计划。省提名可获得+600 CRS积分加分，确保收到邀请。" },
              { question: "Express Entry需要多长时间？", answer: "目标时间：从建档到获邀6个月，从获邀到决定6个月。总计：12个月。" },
              { question: "定居资金需要多少？", answer: "根据家庭人数不同。单身：约14,000加元。四口之家：约25,000加元。最新金额在IRCC网站公布。" },
              { question: "需要LMIA吗？", answer: "Express Entry通常不需要LMIA（有例外）。但如果有工作邀请，LMIA可获得+50 CRS积分加分。" },
            ]
          : [
              { question: "What if my CRS score is too low?", answer: "Improve language scores (+20-40 points), obtain a provincial nomination (+600 points), or gain Canadian work experience." },
              { question: "What is PNP (Provincial Nominee Program)?", answer: "A program where provinces select their own candidates. Provincial nomination adds +600 CRS points and virtually guarantees an invitation." },
              { question: "How long does Express Entry take?", answer: "Target: 6 months from profile to invitation, 6 months from invitation to decision. Total: ~12 months." },
              { question: "How much Settlement Funds do I need?", answer: "Depends on family size. Single: ~CAD 14,000. Family of 4: ~CAD 25,000. Current amounts are posted on the IRCC website." },
              { question: "Do I need a LMIA?", answer: "Express Entry does not require a LMIA (with exceptions). However, a job offer with LMIA adds +50 CRS points." },
            ]
    : isTr
        ? [
            { question: "Subclass 189, 190 ve 491 arasındaki fark nedir?", answer: "189: Bağımsız (eyalet desteği gerekmez). 190: Eyalet adaylığı (+5 puan). 491: Regional (+15 puan, taahhüt gerekli)." },
            { question: "Eyalet adaylığı nasıl alınır?", answer: "Her eyaletin kendi süreci ve kriterleri vardır. EOI'nizi eyalet tercihleriyle güncelleyin, eyaletler sizi davet eder." },
            { question: "Australia'da iş teklifi almam gerekiyor mu?", answer: "Hayır, iş teklifi zorunlu değildir. Ancak iş teklifi puan artırır ve bazı durumlarda zorunludur." },
            { question: "Vize kaç yıl geçerli?", answer: "Subclass 189/190/491: 5 yıl. İlk girişten itibaren 4 yıl içinde PR Renewal başvurusu yapmalısınız." },
            { question: "Vatandaşlık için ne kadar beklemeliyim?", answer: "PR aldıktan sonra 4 yıl içinde vatandaşlık başvurusu yapabilirsiniz. Son 4 yıldan 1 yıl Australia'da yaşamış olmalısınız." },
          ]
        : isZh
          ? [
              { question: "189、190和491子类别有什么区别？", answer: "189：独立技术移民（不需要州提名）。190：州提名（+5分）。491：偏远地区（+15分，需承诺居住）。" },
              { question: "如何获得州提名？", answer: "每个州有自己的流程和标准。更新您的EOI选择州偏好，州政府会向您发出邀请。" },
              { question: "我需要澳大利亚的工作邀请吗？", answer: "不需要，工作邀请不是必须的。但工作邀请可以加分，在某些情况下是必要的。" },
              { question: "签证有效期是多久？", answer: "189/190/491子类别：5年。首次入境后4年内需提交PR续签申请。" },
              { question: "入籍需要等多久？", answer: "获得PR后4年内可申请公民身份。最近4年内须在澳大利亚居住满1年。" },
            ]
          : [
              { question: "What is the difference between Subclass 189, 190, and 491?", answer: "189: Independent (no state support needed). 190: State nomination (+5 points). 491: Regional (+15 points, commitment required)." },
              { question: "How do I get state nomination?", answer: "Each state has its own process and criteria. Update your EOI with state preferences and states will invite you." },
              { question: "Do I need a job offer in Australia?", answer: "No, a job offer is not mandatory. However, it adds points and may be required in certain circumstances." },
              { question: "How long is the visa valid?", answer: "Subclass 189/190/491: 5 years. You must apply for PR Renewal within 4 years of your first entry." },
              { question: "How long until I can apply for citizenship?", answer: "You can apply for citizenship 4 years after receiving PR. You must have lived in Australia for 1 of the last 4 years." },
            ];

  return {
    title: isTr ? "Sıkça Sorulan Sorular" : isZh ? "常见问题" : "Frequently Asked Questions",
    intro: isTr
      ? "En çok sorulan sorular ve kısa cevapları:"
      : isZh
        ? "最常被问到的问题及简要回答："
        : "Most commonly asked questions with brief answers:",
    items: [...commonItems, ...countryItems],
  };
}
