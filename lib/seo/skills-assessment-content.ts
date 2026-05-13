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
    toolLabel: "Skills Assessment Guide",
    aboutTitle: "About Skills Assessments for Australian Skilled Visas",
    intro:
      "A skills assessment is a formal evaluation that confirms your overseas qualifications and work experience meet the Australian standard for your nominated occupation. It is a mandatory requirement for almost all skilled migration visa pathways, including subclasses 189, 190, and 491. Without a positive skills assessment, you cannot submit a valid Expression of Interest (EOI) for a permanent skilled visa. Understanding the process, choosing the right assessing body, and knowing what to prepare will save you significant time and money.",
    sections: [
      {
        heading: "What Is a Skills Assessment?",
        body: "A skills assessment is conducted by an approved assessing body that has been authorised by the Department of Home Affairs to evaluate whether your skills and qualifications are comparable to those of an Australian practitioner in the same occupation. The assessment typically examines your educational credentials, your professional or trade qualifications, and your work history — looking at the tasks you performed and how they match the ANZSCO description for your nominated occupation. The result is either a positive assessment (skills are suitable) or a negative one (skills do not meet Australian requirements).",
      },
      {
        heading: "Why a Skills Assessment Is Required",
        body: "The Australian Government requires skills assessments as a quality control measure for the skilled migration program. Australia selects migrants based on the expectation that their skills can contribute to the workforce and economy. By requiring a third-party assessment from a professional authority, the government ensures that applicants genuinely have the skills they claim. A positive skills assessment is typically valid for three years from the date of issue and must remain valid at the time you lodge your visa application.",
      },
      {
        heading: "How to Choose the Right Assessing Body",
        body: "Each occupation on the skilled occupation lists is assigned to a specific assessing body. You do not choose which body assesses you — it is determined by your occupation code. For example, Engineers Australia assesses engineers, VETASSESS assesses a wide range of professional occupations, and TRA (Trades Recognition Australia) assesses trade and technical occupations. Using this Skills Assessment Finder, you can search your occupation by title or ANZSCO code and instantly identify the correct assessing authority along with their fee and processing time.",
      },
      {
        heading: "Timeline and Costs",
        body: "Processing times vary significantly across assessing bodies. Engineers Australia and VETASSESS typically take 4–12 weeks for a standard assessment, while AIM and AICD may take less time. Fees range from approximately AUD $500 for some bodies to over AUD $1,500 for complex or priority assessments. Some bodies offer fast-track or priority processing for an additional fee. It is important to account for assessment time in your overall visa planning timeline, especially if your EOI is time-sensitive.",
      },
      {
        heading: "What Documents You Will Typically Need",
        body: "Most assessing bodies require: official academic transcripts and degree certificates (certified copies), reference letters from each employer detailing your duties, dates, and hours worked per week, your up-to-date CV or résumé, evidence of professional registration if applicable, English translations of any non-English documents by a NAATI-certified translator, and a copy of your passport bio page. Some bodies, particularly for healthcare professions, also require evidence of ongoing professional development or registration with a professional association.",
      },
    ],
    faqs: [
      {
        q: "How long is a skills assessment valid?",
        a: "A positive skills assessment is typically valid for three years from the date of issue. It must be valid at the time you lodge your visa application. If your assessment expires before you lodge, you will need to apply for a new one. Some bodies offer extension or re-assessment options, but processing times and fees apply.",
      },
      {
        q: "Can I appeal a negative skills assessment decision?",
        a: "Yes. Most assessing bodies have a formal appeals or review process. You can usually lodge a review request within 12 months of the original decision, often by submitting additional evidence such as updated reference letters, supplementary duty statements, or clarification from your employer. The review fee is usually less than the original assessment fee.",
      },
      {
        q: "What if my occupation is assessed by VETASSESS?",
        a: "VETASSESS assesses over 350 professional occupations. Their assessment process examines both your educational qualifications (compared against an Australian AQF equivalent) and your work experience (evaluated against the ANZSCO duties for your occupation). Applicants who don't meet the full qualification requirement may still be assessed favourably if they have extensive relevant work experience — VETASSESS calls this the 'skills-based assessment' pathway.",
      },
      {
        q: "Do I need a skills assessment for an employer-sponsored visa?",
        a: "Generally no — employer-sponsored visas such as subclass 482 (Temporary Skill Shortage) and subclass 186 (Employer Nomination Scheme) do not require a formal skills assessment from an assessing body. However, the sponsoring employer must demonstrate that you have the skills and qualifications required for the position, and DAMA arrangements may have additional requirements.",
      },
      {
        q: "Can I submit an EOI before receiving my skills assessment result?",
        a: "Yes, you can lodge an EOI before your skills assessment is complete. This allows you to enter the SkillSelect pool and begin accumulating time while waiting for your assessment. However, you must hold a valid positive skills assessment before you can lodge the visa application itself. If you receive an invitation before your assessment is ready, you have 60 days to lodge — so ensure your assessment timeline aligns with your EOI strategy.",
      },
    ],
    faqTitle: "Frequently Asked Questions — Skills Assessments",
  },

  tr: {
    toolLabel: "Beceri Değerlendirme Rehberi",
    aboutTitle: "Avustralya Yetenekli Vizeler İçin Beceri Değerlendirmeleri Hakkında",
    intro:
      "Beceri değerlendirmesi, yurt dışı niteliklerinizin ve iş deneyiminizin aday gösterilen mesleğiniz için Avustralya standardını karşıladığını onaylayan resmi bir değerlendirmedir. 189, 190 ve 491 alt sınıfları dahil olmak üzere hemen hemen tüm yetenekli göçmenlik yolları için zorunlu bir gerekliliktir.",
    sections: [
      {
        heading: "Beceri Değerlendirmesi Nedir?",
        body: "Beceri değerlendirmesi, İçişleri Bakanlığı tarafından becerilerinizin ve niteliklerinizin aynı meslekteki Avustralyalı bir uygulayıcınınkiyle karşılaştırılabilir olup olmadığını değerlendirmek için yetkilendirilmiş onaylı bir değerlendirme kuruluşu tarafından yürütülür.",
      },
      {
        heading: "Neden Beceri Değerlendirmesi Gereklidir?",
        body: "Avustralya Hükümeti, yetenekli göçmenlik programı için kalite kontrolü tedbiri olarak beceri değerlendirmeleri talep etmektedir. Olumlu bir beceri değerlendirmesi, ihraç tarihinden itibaren genellikle üç yıl geçerlidir.",
      },
      {
        heading: "Doğru Değerlendirme Kuruluşunu Nasıl Seçersiniz?",
        body: "Yetenekli meslek listelerindeki her meslek, belirli bir değerlendirme kuruluşuna atanmıştır. Hangi kuruluşun sizi değerlendireceğini seçmezsiniz — bu, meslek kodunuz tarafından belirlenir.",
      },
      {
        heading: "Süre ve Maliyetler",
        body: "İşlem süreleri değerlendirme kuruluşlarına göre önemli ölçüde değişir. Engineers Australia ve VETASSESS, standart bir değerlendirme için genellikle 4-12 hafta alır. Ücretler, bazı kuruluşlar için yaklaşık 500 AUD'den karmaşık değerlendirmeler için 1.500 AUD'ın üzerine kadar çıkmaktadır.",
      },
      {
        heading: "Genellikle İhtiyaç Duyacağınız Belgeler",
        body: "Çoğu değerlendirme kuruluşu şunları gerektirir: resmi akademik transkriptler ve derece sertifikaları, her işverenden görevleri, tarihleri ve haftalık çalışma saatlerini detaylandıran referans mektupları, güncel CV'niz ve varsa mesleki tescil kanıtı.",
      },
    ],
    faqs: [
      {
        q: "Beceri değerlendirmesi ne kadar süre geçerlidir?",
        a: "Olumlu bir beceri değerlendirmesi, ihraç tarihinden itibaren genellikle üç yıl geçerlidir. Vize başvurunuzu sunduğunuzda geçerli olmalıdır.",
      },
      {
        q: "Olumsuz bir beceri değerlendirme kararına itiraz edebilir miyim?",
        a: "Evet. Çoğu değerlendirme kuruluşunun resmi itiraz veya inceleme süreci vardır. Genellikle orijinal karardan sonraki 12 ay içinde ek kanıtlar sunarak inceleme talep edebilirsiniz.",
      },
      {
        q: "Mesleğim VETASSESS tarafından değerlendiriliyorsa ne olur?",
        a: "VETASSESS 350'den fazla mesleki mesleği değerlendirir. Değerlendirme süreci hem eğitim niteliklerinizi hem de iş deneyiminizi inceler.",
      },
      {
        q: "İşveren destekli bir vize için beceri değerlendirmesine ihtiyacım var mı?",
        a: "Genel olarak hayır — 482 ve 186 alt sınıfı gibi işveren destekli vizeler, genellikle resmi bir beceri değerlendirmesi gerektirmez.",
      },
      {
        q: "Beceri değerlendirme sonucumu almadan önce EOI sunabilir miyim?",
        a: "Evet, beceri değerlendirmeniz tamamlanmadan önce EOI sunabilirsiniz. Ancak vize başvurusunu sunmadan önce geçerli, olumlu bir beceri değerlendirmesine sahip olmanız gerekir.",
      },
    ],
    faqTitle: "Sıkça Sorulan Sorular — Beceri Değerlendirmeleri",
  },

  "zh-Hans": {
    toolLabel: "技能评估指南",
    aboutTitle: "关于澳大利亚技术签证的技能评估",
    intro:
      "技能评估是一项正式评估，确认您的海外资格和工作经验符合您提名职业的澳大利亚标准。这是几乎所有技术移民签证途径的强制要求，包括189、190和491子类。没有正面技能评估，您无法为永久技术签证提交有效的意向申请（EOI）。",
    sections: [
      {
        heading: "什么是技能评估？",
        body: "技能评估由内政部授权的核准评估机构进行，评估您的技能和资格是否与同一职业的澳大利亚从业者相当。评估通常检查您的教育证书、专业或职业资格以及工作经历。",
      },
      {
        heading: "为什么需要技能评估",
        body: "澳大利亚政府要求技能评估作为技术移民项目的质量控制措施。正面技能评估通常自签发之日起有效期为三年，在提交签证申请时必须保持有效。",
      },
      {
        heading: "如何选择正确的评估机构",
        body: "技术职业列表上的每个职业都被分配给特定的评估机构。您不选择哪个机构评估您——这由您的职业代码决定。例如，Engineers Australia评估工程师，VETASSESS评估各种专业职业。",
      },
      {
        heading: "时间和费用",
        body: "处理时间因评估机构而异。Engineers Australia和VETASSESS的标准评估通常需要4-12周。费用从某些机构的约500澳元到复杂评估的超过1500澳元不等。",
      },
      {
        heading: "通常需要哪些文件",
        body: "大多数评估机构要求：官方学术成绩单和学位证书（认证副本）、每位雇主的推荐信（详细说明职责、日期和每周工作时间）、最新的简历、职业注册证明（如适用）以及非英语文件的NAATI认证翻译。",
      },
    ],
    faqs: [
      {
        q: "技能评估有效期多长？",
        a: "正面技能评估通常自签发之日起有效期为三年。在提交签证申请时必须保持有效。如果评估在提交前过期，您需要申请新的评估。",
      },
      {
        q: "我可以对负面技能评估决定提出上诉吗？",
        a: "是的。大多数评估机构都有正式的上诉或审查程序。通常可以在原始决定后12个月内，通过提交额外证据（如更新的推荐信）提出审查请求。",
      },
      {
        q: "如果我的职业由VETASSESS评估怎么办？",
        a: "VETASSESS评估350多个专业职业。其评估流程检查您的教育资格（与澳大利亚AQF等同物比较）和工作经验（根据您职业的ANZSCO职责评估）。",
      },
      {
        q: "我需要为雇主担保签证进行技能评估吗？",
        a: "通常不需要——雇主担保签证如482（临时技术短缺）和186（雇主提名计划）通常不需要来自评估机构的正式技能评估。",
      },
      {
        q: "在收到技能评估结果之前可以提交EOI吗？",
        a: "是的，您可以在技能评估完成之前提交EOI。这允许您进入SkillSelect池并开始积累时间。但在提交签证申请本身之前，必须持有有效的正面技能评估。",
      },
    ],
    faqTitle: "常见问题——技能评估",
  },
};

export function getSkillsAssessmentSeoContent(locale: string): PageContent {
  return content[locale] ?? content.en;
}

export function buildSkillsAssessmentSchema(locale: string): string {
  const c = getSkillsAssessmentSeoContent(locale);
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
