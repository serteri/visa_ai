import type { SeoContentSectionProps } from "@/components/SeoContentSection";

type Locale = string;

interface PageContent {
  toolLabel: string;
  aboutTitle: string;
  intro: string;
  sections: { heading: string; body: string }[];
  faqs: { q: string; a: string }[];
  faqTitle: string;
}

const content: Record<string, PageContent> = {
  en: {
    toolLabel: "Points Test Guide",
    aboutTitle: "About the Australian Points Test Calculator",
    intro:
      "The Australian skilled migration points test is the scoring system used by the Department of Home Affairs to rank Expression of Interest (EOI) applications in the SkillSelect pool. To be eligible for an invitation to apply, you need a minimum of 65 points — but in practice most subclass 189 invitations go to applicants with 80 or more points. Understanding how the test works and how to maximise your score is one of the most important steps in planning your visa journey.",
    sections: [
      {
        heading: "How the Australian Points Test Works",
        body: "When you lodge an EOI through SkillSelect, the points test converts your age, English ability, work experience, education, and other factors into a numerical score. The Department of Home Affairs holds regular invitation rounds and invites the highest-scoring applicants in each visa subclass. Your score is calculated at the time of invitation, not when you first submitted your EOI, so updating your profile as your situation improves can significantly increase your chances.",
      },
      {
        heading: "Key Factors: Age, English, Experience and Education",
        body: "Age earns up to 30 points for applicants aged 25–32, scaling down to 15 points at 40–44 and zero above 45. English ability contributes 0 points for Competent, 10 for Proficient and 20 for Superior. Overseas work experience adds 5–15 points and Australian work experience adds 5–20 points depending on duration. Education contributes up to 20 points for a doctoral qualification. Additional factors such as partner skills, state nomination, Australian study, specialist education and community language credentials can each add further points to your total.",
      },
      {
        heading: "What Score Do You Need?",
        body: "The minimum score to submit an EOI is 65 points. However, this threshold has never been enough to receive an invitation in recent rounds. For subclass 189 (Skilled Independent) the cutoff for most occupations has been 85–95 points. For subclass 190 (State Nominated) the state-specific cutoff is typically 75–90, while subclass 491 (Skilled Work Regional) may invite at lower thresholds. You should aim for the highest score achievable and check the latest invitation round data to understand what score is competitive for your occupation.",
      },
      {
        heading: "Common Mistakes People Make",
        body: "The most frequent mistakes include: misclassifying English proficiency level, underestimating years of work experience due to incorrect date calculations, selecting the wrong ANZSCO code for your occupation, forgetting to include all eligible education qualifications, and failing to update the EOI when circumstances change. Some applicants also overlook the partner skills bonus, which adds up to 10 points if a partner holds a positive skills assessment and meets English requirements. Always verify your claimed points against official DHA guidelines before lodging.",
      },
      {
        heading: "Maximising Your Points Score",
        body: "There are several proven strategies to increase your score. Sitting an English test to achieve Superior level (IELTS 8+ in all bands) adds 20 points and is often the fastest way to improve your score. Accumulating additional years of Australian or overseas work experience also adds significant points. If you are close to an age bracket boundary, timing your EOI submission carefully can preserve higher age points. State nomination (190 or 491) adds 5 or 15 extra points respectively and can make the difference between receiving an invitation or waiting in the pool.",
      },
    ],
    faqs: [
      {
        q: "How often does the Department of Home Affairs run invitation rounds?",
        a: "Invitation rounds for subclass 189 and 491 are typically held monthly, usually in the second or third week. Subclass 190 invitations are issued directly by state and territory governments on their own schedules, which vary throughout the year.",
      },
      {
        q: "Can I submit an EOI without a positive skills assessment?",
        a: "Yes — you can submit an EOI before your skills assessment is complete. However, you cannot lodge a visa application until you hold a valid positive skills assessment. Many applicants submit an EOI early to begin accumulating time in the pool while completing their assessment.",
      },
      {
        q: "What happens if my points change after I submit my EOI?",
        a: "You must update your EOI to reflect any changes in your circumstances. Your score is recalculated at the time of invitation based on the information in your EOI at that date. You can update your EOI at any time without losing your original submission date.",
      },
      {
        q: "Does the points calculator cover all skilled visa subclasses?",
        a: "This calculator covers the three main General Skilled Migration (GSM) visas: subclass 189 (Skilled Independent), subclass 190 (State Nominated) and subclass 491 (Skilled Work Regional Provisional). Employer-sponsored visas (482, 186) use different criteria and are not points-tested.",
      },
      {
        q: "How long does an EOI remain active in the SkillSelect pool?",
        a: "An EOI is valid for two years from the date of submission. If you are not invited within two years, your EOI expires and you must submit a new one. You can update your EOI at any time during the two-year validity period.",
      },
    ],
    faqTitle: "Frequently Asked Questions — Points Test",
  },

  tr: {
    toolLabel: "Puan Testi Rehberi",
    aboutTitle: "Avustralya Puan Testi Hesaplayıcısı Hakkında",
    intro:
      "Avustralya yetenekli göçmenlik puan testi, İçişleri Bakanlığı'nın SkillSelect havuzundaki EOI başvurularını sıralamak için kullandığı puanlama sistemidir. Davet almak için en az 65 puan gereklidir ancak pratikte çoğu 189 vizesi daveti 80 veya üzeri puana sahip başvuru sahiplerine gitmektedir.",
    sections: [
      {
        heading: "Avustralya Puan Testi Nasıl Çalışır?",
        body: "SkillSelect üzerinden bir EOI sunduğunuzda, puan testi yaşınızı, İngilizce seviyenizi, iş deneyiminizi, eğitiminizi ve diğer faktörleri sayısal bir puana dönüştürür. Bakanlık, her vize alt sınıfında en yüksek puana sahip başvuranları davet eder. Puanınız, EOI'nizi ilk gönderdiğinizde değil, davet anında hesaplanır.",
      },
      {
        heading: "Temel Faktörler: Yaş, İngilizce, Deneyim ve Eğitim",
        body: "Yaş, 25-32 yaş arası başvuranlara maksimum 30 puan sağlar ve 40-44 yaşına kadar 15 puana düşer. İngilizce yeterliliği Yeterli için 0, Uzman için 10 ve Üstün için 20 puan sağlar. Yurt dışı iş deneyimi 5-15 puan, Avustralya iş deneyimi ise süreye göre 5-20 puan ekler. Eğitim, doktora derecesi için maksimum 20 puana ulaşır.",
      },
      {
        heading: "Kaç Puana İhtiyacınız Var?",
        body: "EOI sunmak için minimum puan 65'tir. Ancak bu eşiğin son rauntlarda davet almak için hiçbir zaman yeterli olmadığı görülmüştür. 189 alt sınıfı için çoğu mesleğin kesim puanı 85-95 arasındadır. 190 alt sınıfı için devlet bazlı kesim genellikle 75-90, 491 daha düşük eşiklerde davet edebilir.",
      },
      {
        heading: "İnsanların Yaptığı Yaygın Hatalar",
        body: "En sık yapılan hatalar şunlardır: İngilizce yeterlilik seviyesinin yanlış sınıflandırılması, hatalı tarih hesaplamaları nedeniyle iş deneyimi yıllarının eksik gösterilmesi, meslek için yanlış ANZSCO kodunun seçilmesi ve koşullar değiştiğinde EOI'nin güncellenmemesi.",
      },
      {
        heading: "Puanınızı Nasıl Maksimize Edersiniz?",
        body: "Üstün İngilizce düzeyine ulaşmak (tüm IELTS bantlarında 8+) 20 puan ekler. Avustralya veya yurt dışı iş deneyiminin birikmesi de önemli puanlar ekler. Devlet adaylığı (190 veya 491), sırasıyla 5 veya 15 ekstra puan sağlar.",
      },
    ],
    faqs: [
      {
        q: "İçişleri Bakanlığı davet rauntlarını ne sıklıkla düzenler?",
        a: "189 ve 491 alt sınıfları için davet rauntları genellikle aylık olarak, genellikle ikinci veya üçüncü haftada düzenlenir. 190 davetleri, eyalet ve bölge hükümetleri tarafından kendi programlarına göre verilir.",
      },
      {
        q: "Olumlu bir beceri değerlendirmesi olmadan EOI sunabilir miyim?",
        a: "Evet — beceri değerlendirmeniz tamamlanmadan önce EOI sunabilirsiniz. Ancak geçerli, olumlu bir beceri değerlendirmesi olmadan vize başvurusu lodgement edilemez.",
      },
      {
        q: "EOI sunduktan sonra puanlarım değişirse ne olur?",
        a: "Koşullarınızdaki değişiklikleri yansıtmak için EOI'nizi güncellemeniz gerekir. Puanınız, davet anında EOI'nizdeki bilgilere göre yeniden hesaplanır.",
      },
      {
        q: "Puan hesaplayıcısı tüm yetenekli vize alt sınıflarını kapsıyor mu?",
        a: "Bu hesaplayıcı üç ana Genel Yetenekli Göçmenlik (GSM) vizesini kapsar: alt sınıf 189, 190 ve 491. İşveren tarafından desteklenen vizeler (482, 186) farklı kriterler kullanır.",
      },
      {
        q: "Bir EOI, SkillSelect havuzunda ne kadar süre aktif kalır?",
        a: "Bir EOI, sunuluş tarihinden itibaren iki yıl geçerlidir. İki yıl içinde davet alınmazsa, EOI sona erer ve yeni bir tane sunulmalıdır.",
      },
    ],
    faqTitle: "Sıkça Sorulan Sorular — Puan Testi",
  },

  "zh-Hans": {
    toolLabel: "积分测试指南",
    aboutTitle: "关于澳大利亚积分测试计算器",
    intro:
      "澳大利亚技术移民积分测试是内政部用于在SkillSelect池中对意向申请（EOI）进行排名的评分系统。获得邀请的最低要求是65分——但实际上大多数189签证邀请发放给80分或以上的申请人。了解积分测试的运作方式以及如何最大化您的分数是规划签证之旅最重要的步骤之一。",
    sections: [
      {
        heading: "澳大利亚积分测试如何运作",
        body: "当您通过SkillSelect提交EOI时，积分测试将您的年龄、英语能力、工作经验、教育程度和其他因素转换为数字分数。内政部定期举行邀请轮次，邀请每个签证子类中得分最高的申请人。您的分数在邀请时计算，而不是在您首次提交EOI时，因此随着您情况的改善更新您的资料可以显著提高您的机会。",
      },
      {
        heading: "关键因素：年龄、英语、经验和教育",
        body: "年龄为25-32岁的申请人最多可获得30分，到40-44岁降至15分。英语能力：胜任0分，熟练10分，优秀20分。海外工作经验增加5-15分，澳大利亚工作经验根据时长增加5-20分。教育方面，博士学位最多可获得20分。",
      },
      {
        heading: "您需要多少分？",
        body: "提交EOI的最低分数是65分。然而，这个门槛在最近的轮次中从未足以获得邀请。对于189签证，大多数职业的截止分数为85-95分。190签证的州特定截止分数通常为75-90，而491签证可能在较低门槛下发出邀请。",
      },
      {
        heading: "常见错误",
        body: "最常见的错误包括：错误分类英语水平、由于错误的日期计算而低估工作经验年数、为您的职业选择错误的ANZSCO代码、忘记包括所有符合条件的教育资格，以及情况变化时未能更新EOI。",
      },
      {
        heading: "如何最大化您的积分",
        body: "有几种经过验证的策略可以提高您的分数。参加英语考试达到优秀级别（所有IELTS单项8分以上）可增加20分，通常是提高分数最快的方式。积累更多澳大利亚或海外工作经验也会增加可观的分数。州提名（190或491）分别增加5或15分。",
      },
    ],
    faqs: [
      {
        q: "内政部多久举行一次邀请轮次？",
        a: "189和491子类的邀请轮次通常每月举行一次，通常在第二或第三周。190邀请由州和领地政府按照各自的时间表直接发出，全年各有不同。",
      },
      {
        q: "在没有正面技能评估的情况下可以提交EOI吗？",
        a: "是的——您可以在技能评估完成之前提交EOI。但是，在持有有效的正面技能评估之前，您无法提交签证申请。",
      },
      {
        q: "提交EOI后我的积分发生变化怎么办？",
        a: "您必须更新您的EOI以反映您情况的任何变化。您的分数在邀请时根据EOI中的信息重新计算。您可以随时更新EOI而不会失去原始提交日期。",
      },
      {
        q: "积分计算器涵盖所有技术签证子类吗？",
        a: "此计算器涵盖三种主要的一般技术移民（GSM）签证：189子类（独立技术）、190子类（州提名）和491子类（地区技术临时）。雇主担保签证（482、186）使用不同标准，不进行积分测试。",
      },
      {
        q: "EOI在SkillSelect池中保持活跃多长时间？",
        a: "EOI自提交之日起有效期为两年。如果在两年内未收到邀请，EOI将过期，您必须重新提交。在两年有效期内，您可以随时更新EOI。",
      },
    ],
    faqTitle: "常见问题——积分测试",
  },
};

export function getPointsCalcSeoContent(locale: string): PageContent {
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
