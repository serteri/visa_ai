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
    toolLabel: "State Nomination Guide",
    aboutTitle: "About Australian State and Territory Nomination",
    intro:
      "State and territory nomination is a pathway through which an Australian state or territory government nominates a skilled worker for a visa, adding points to their score and in some cases providing access to visa subclasses they would not otherwise qualify for. Understanding the differences between the 190 and 491 visas, how to choose the right state, and what nomination requires will help you optimise your migration strategy and improve your chances of receiving a nomination offer.",
    sections: [
      {
        heading: "What Is State Nomination?",
        body: "State nomination is a formal endorsement by an Australian state or territory government that a skilled migrant meets their specific labour market needs. Each of Australia's eight states and territories manages its own nomination program with its own occupation lists, eligibility criteria, and quotas. A state nomination offer provides significant points benefits — 5 extra points for subclass 190 and 15 extra points for subclass 491 — and in many cases makes it possible to receive an invitation to apply for a visa that would otherwise require a much higher base score.",
      },
      {
        heading: "Subclass 190 vs Subclass 491: Key Differences",
        body: "Subclass 190 (Skilled Nominated) is a permanent residence visa. It provides 5 additional points and requires you to commit to living and working in the nominating state for two years. Subclass 491 (Skilled Work Regional Provisional) is a provisional visa valid for five years with a pathway to permanent residency through the subclass 191 visa. It provides 15 additional points and requires you to live, work, and study in a designated regional area. The 491 is generally more accessible — cutoffs tend to be lower — but it comes with regional living obligations that must be met before applying for permanent residency.",
      },
      {
        heading: "How to Choose a State for Nomination",
        body: "The right state depends on your occupation, your points score, and your willingness to live in a particular location. Not all states nominate all occupations — each state publishes its own occupation list specifying which roles they are currently nominating. Some states like New South Wales and Victoria have very competitive nomination programs with high score requirements, while South Australia, Tasmania, and Northern Territory often have lower thresholds and nominate a wider range of occupations. Use this finder to compare which states currently nominate your occupation and at what conditions.",
      },
      {
        heading: "Tips for Getting Nominated",
        body: "State nomination programs are competitive and requirements change frequently. Here are key strategies: Monitor each state's occupation list regularly, as they update throughout the year. Submit expressions of interest to multiple states simultaneously where possible. Meeting the minimum criteria does not guarantee a nomination — states may impose additional requirements such as a local job offer, ties to the state, or minimum points above the official threshold. Some states require you to be living in the state when you apply. Register for our free alerts service to be notified when nomination conditions change for your occupation.",
      },
      {
        heading: "Living and Working Obligations",
        body: "Both 190 and 491 visa holders have obligations to live and work in the relevant state or region. For 190 visa holders, this means living and working in the nominating state for at least two years after the visa is granted. For 491 visa holders, living, working, and studying in a designated regional area for three years is required before applying for the 191 permanent visa. Failure to meet these obligations may affect your ability to apply for permanent residence or future visas. The regional living obligation for 491 is one of the most important factors to consider before choosing this pathway.",
      },
    ],
    faqs: [
      {
        q: "Can I apply for state nomination without a skills assessment?",
        a: "In most cases, you cannot receive a state nomination without first having a positive skills assessment. A skills assessment demonstrates that you have the relevant qualifications and experience for your nominated occupation, which is a core requirement for most state nomination programs. A small number of states may allow you to register interest before your assessment is complete, but a positive assessment is required before any nomination is issued.",
      },
      {
        q: "Can I apply to multiple states at the same time?",
        a: "Yes, you can register interest in or apply to multiple states simultaneously. There is no rule preventing you from holding multiple state nomination applications at the same time. If you receive offers from more than one state, you can choose which nomination to accept. However, once you accept a nomination and use it in a visa application, you are committing to the obligations of that state.",
      },
      {
        q: "What happens if I accept state nomination but then move to a different state?",
        a: "If you leave the nominating state before fulfilling your obligation period (typically 2 years for 190), you technically breach the conditions of your visa. The Department of Home Affairs has the discretion to take action, which in extreme cases could affect future visa applications. In practice, circumstances such as a job transfer can be considered mitigating factors, but it is always advisable to consult a migration agent if you need to relocate.",
      },
      {
        q: "How long does the state nomination process take?",
        a: "Processing times vary significantly by state and program. Some states process nominations within a few weeks; others can take several months. High-demand states like NSW and VIC typically have longer processing times due to application volume. It is advisable to apply to the state's nomination program as early as possible and ensure all required documents are complete to avoid delays.",
      },
      {
        q: "Is state nomination guaranteed once I meet the criteria?",
        a: "No — meeting the minimum eligibility criteria does not guarantee a nomination. Each state has a fixed annual quota of nominations, and if that quota is full, you may not receive a nomination even if you meet all criteria. States also have discretion to set additional requirements or score thresholds above the minimum. Always check the current status of a state's nomination program before applying.",
      },
    ],
    faqTitle: "Frequently Asked Questions — State Nomination",
  },

  tr: {
    toolLabel: "Devlet Adaylığı Rehberi",
    aboutTitle: "Avustralya Eyalet ve Bölge Adaylığı Hakkında",
    intro:
      "Eyalet ve bölge adaylığı, bir Avustralya eyalet veya bölge hükümetinin yetenekli bir işçiyi vize için aday gösterdiği, puanlarına puan eklediği ve bazı durumlarda aksi takdirde uygun olmayacakları vize alt sınıflarına erişim sağladığı bir yoldur.",
    sections: [
      {
        heading: "Devlet Adaylığı Nedir?",
        body: "Devlet adaylığı, bir Avustralya eyalet veya bölge hükümetinin yetenekli bir göçmenin özel iş gücü piyasası ihtiyaçlarını karşıladığına dair resmi bir onayıdır. 190 alt sınıfı için 5 ekstra puan ve 491 alt sınıfı için 15 ekstra puan sağlar.",
      },
      {
        heading: "190 ve 491 Alt Sınıfı: Temel Farklar",
        body: "190 alt sınıfı kalıcı oturma vizesidir ve 5 ek puan sağlar. 491 alt sınıfı, 191 vizesi aracılığıyla kalıcı ikamet yoluna sahip beş yıl geçerli geçici bir vizedir ve 15 ek puan sağlar.",
      },
      {
        heading: "Adaylık İçin Nasıl Eyalet Seçersiniz?",
        body: "Doğru eyalet, mesleğinize, puan puanınıza ve belirli bir yerde yaşama isteğinize bağlıdır. Her eyalet, şu anda hangi rolleri aday gösterdiğini belirten kendi meslek listesini yayınlar.",
      },
      {
        heading: "Aday Gösterilmek İçin İpuçları",
        body: "Eyalet adaylık programları rekabetçidir ve gereksinimler sık sık değişir. Her eyaletin meslek listesini düzenli olarak izleyin ve birden fazla eyalete aynı anda EOI gönderin.",
      },
      {
        heading: "Yaşam ve Çalışma Yükümlülükleri",
        body: "Hem 190 hem de 491 vize sahiplerinin ilgili eyalet veya bölgede yaşama ve çalışma yükümlülükleri vardır. 190 sahipleri için vize verildikten en az iki yıl sonra aday eyalette yaşamak ve çalışmak gerekir.",
      },
    ],
    faqs: [
      {
        q: "Beceri değerlendirmesi olmadan devlet adaylığı başvurusu yapabilir miyim?",
        a: "Çoğu durumda, önce olumlu bir beceri değerlendirmesine sahip olmadan devlet adaylığı alamazsınız.",
      },
      {
        q: "Aynı anda birden fazla eyalete başvurabilir miyim?",
        a: "Evet, aynı anda birden fazla eyalete ilgi kaydedebilir veya başvurabilirsiniz. Birden fazla eyaletten teklif alırsanız, hangi adaylığı kabul edeceğinizi seçebilirsiniz.",
      },
      {
        q: "Devlet adaylığını kabul ettikten sonra başka bir eyalete taşınırsam ne olur?",
        a: "Yükümlülük sürenizi (190 için genellikle 2 yıl) yerine getirmeden aday eyaletten ayrılırsanız, teknik olarak vizenizin koşullarını ihlal edersiniz.",
      },
      {
        q: "Devlet adaylık süreci ne kadar sürer?",
        a: "İşlem süreleri eyalete ve programa göre önemli ölçüde değişir. Bazı eyaletler birkaç hafta içinde işlem yapar; diğerleri birkaç ay sürebilir.",
      },
      {
        q: "Kriterleri karşıladığımda devlet adaylığı garantili mi?",
        a: "Hayır — minimum uygunluk kriterlerini karşılamak adaylığı garanti etmez. Her eyaletin sabit bir yıllık adaylık kotası vardır.",
      },
    ],
    faqTitle: "Sıkça Sorulan Sorular — Devlet Adaylığı",
  },

  "zh-Hans": {
    toolLabel: "州提名指南",
    aboutTitle: "关于澳大利亚州和领地提名",
    intro:
      "州和领地提名是澳大利亚州或领地政府提名技术工人申请签证的途径，为其分数增加积分，在某些情况下提供对原本无法申请的签证子类的访问。了解190和491签证之间的差异、如何选择合适的州以及提名需要什么，将帮助您优化移民策略并提高获得提名邀请的机会。",
    sections: [
      {
        heading: "什么是州提名？",
        body: "州提名是澳大利亚州或领地政府的正式背书，证明技术移民符合其特定劳动力市场需求。190签证提供5分额外积分，491签证提供15分额外积分。",
      },
      {
        heading: "190子类与491子类：主要区别",
        body: "190子类（技术提名）是永久居留签证，提供5分额外积分，要求您承诺在提名州生活和工作两年。491子类是临时签证，有效期五年，通过191签证有永久居留途径，提供15分额外积分。",
      },
      {
        heading: "如何选择提名州",
        body: "正确的州取决于您的职业、积分以及在特定地点生活的意愿。并非所有州都提名所有职业——每个州发布自己的职业列表，指定当前提名的职位。",
      },
      {
        heading: "获得提名的技巧",
        body: "州提名项目竞争激烈，要求经常变化。定期监控每个州的职业列表，尽可能同时向多个州提交意向申请。",
      },
      {
        heading: "居住和工作义务",
        body: "190和491签证持有人都有在相关州或地区居住和工作的义务。190签证持有人需要在提名州居住和工作至少两年。",
      },
    ],
    faqs: [
      {
        q: "没有技能评估可以申请州提名吗？",
        a: "在大多数情况下，没有先获得正面技能评估是无法获得州提名的。技能评估证明您具备提名职业的相关资格和经验。",
      },
      {
        q: "我可以同时申请多个州吗？",
        a: "是的，您可以同时向多个州登记意向或申请。如果您收到多个州的邀请，可以选择接受哪个提名。",
      },
      {
        q: "如果我接受州提名后搬到不同的州会怎样？",
        a: "如果您在履行义务期限（190通常为2年）之前离开提名州，技术上违反了签证条件。内政部有酌情权采取行动，在极端情况下可能影响未来的签证申请。",
      },
      {
        q: "州提名过程需要多长时间？",
        a: "处理时间因州和项目而异。一些州在几周内处理提名；其他州可能需要几个月。",
      },
      {
        q: "一旦满足标准，州提名就有保障了吗？",
        a: "不——满足最低资格标准并不保证提名。每个州都有固定的年度提名配额，即使您满足所有标准，如果配额已满，您也可能无法获得提名。",
      },
    ],
    faqTitle: "常见问题——州提名",
  },
};

export function getStateNominationSeoContent(locale: string): PageContent {
  return content[locale] ?? content.en;
}

export function buildStateNominationSchema(locale: string): string {
  const c = getStateNominationSeoContent(locale);
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
