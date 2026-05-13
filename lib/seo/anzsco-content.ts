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
    toolLabel: "ANZSCO Code Guide",
    aboutTitle: "About the ANZSCO Code & Duty Finder",
    intro:
      "The Australian and New Zealand Standard Classification of Occupations (ANZSCO) is the official occupation classification framework used across Australia for skilled migration, employment statistics, and workforce planning. Every occupation listed on the skilled occupation lists is linked to a unique 6-digit ANZSCO code, and selecting the correct code is one of the most critical steps in any skilled visa application. This tool helps you identify your occupation code and review the standard duties before proceeding with your migration pathway.",
    sections: [
      {
        heading: "What Is an ANZSCO Code?",
        body: "An ANZSCO code is a 6-digit number that identifies a specific occupation within the Australian and New Zealand classification system. The first digit represents the broad occupational category (e.g., 1 = Managers, 2 = Professionals), and subsequent digits narrow down to more specific groups and individual occupations. For example, 261313 is Software Engineer and 253111 is General Practitioner. Each ANZSCO entry includes a typical duties list that defines what tasks practitioners in that role are expected to perform.",
      },
      {
        heading: "Why Your ANZSCO Code Matters for Visa Applications",
        body: "Your ANZSCO code determines which assessing body evaluates your qualifications and experience, whether your occupation appears on the relevant skilled occupation list (MLTSSL, STSOL or ROL), which visa subclasses you are eligible for, and in some cases the state nomination criteria that apply. The Department of Home Affairs uses your ANZSCO code as the foundation for your Expression of Interest (EOI) and eventual visa application. An incorrect code can lead to an invalid skills assessment, a rejected EOI, or a visa refusal.",
      },
      {
        heading: "How to Find the Right ANZSCO Code",
        body: "Start by reviewing the ANZSCO duties description for your occupation and compare it against the work you actually perform day-to-day. Your role must substantially match the ANZSCO duties — not just share the same job title. Use this finder to search by job title or partial occupation name. If multiple codes appear relevant, consult your skills assessing body, as they will make the final determination. A registered migration agent can also provide professional guidance on the most appropriate code for your circumstances.",
      },
      {
        heading: "What Happens If You Pick the Wrong Code?",
        body: "Choosing the wrong ANZSCO code can have serious consequences. If you apply for a skills assessment under an incorrect code, the assessing body may reject your application or assess you against the wrong standards. If you lodge an EOI with an incorrect code, your application may be invalidated. In the worst cases, using a misleading code in a visa application can be treated as misrepresentation, which can result in a ban from future visa applications. Always verify your code carefully before lodging any official applications.",
      },
      {
        heading: "ANZSCO Skill Levels Explained",
        body: "Each ANZSCO occupation is assigned a skill level from 1 (highest) to 5 (lowest). Most skilled migration visas require skill levels 1, 2, or 3. Skill Level 1 typically requires a bachelor degree or higher, Skill Level 2 requires a diploma or advanced diploma, and Skill Level 3 requires trade qualifications or an AQF Certificate III. If your occupation has Skill Level 4 or 5, it is unlikely to appear on any skilled occupation list. Verifying your occupation's skill level is an important early step in your migration planning.",
      },
    ],
    faqs: [
      {
        q: "Can two different jobs share the same ANZSCO code?",
        a: "Yes. ANZSCO codes describe occupations at a broad level, so multiple specific job titles can map to the same code if they share substantially similar duties. For example, both 'Software Developer' and 'Applications Programmer' may map to the same ANZSCO category. What matters is whether your actual duties align with the ANZSCO description, not your job title.",
      },
      {
        q: "How do I know if my occupation is on the skilled occupation list?",
        a: "The Department of Home Affairs maintains three skilled occupation lists: the Medium and Long-term Strategic Skills List (MLTSSL), the Short-term Skilled Occupation List (STSOL), and the Regional Occupation List (ROL). You can search these lists on the DHA website using your ANZSCO code or occupation name. This tool highlights which list each occupation appears on.",
      },
      {
        q: "Does my job title need to match the ANZSCO title exactly?",
        a: "No. Your job title does not need to exactly match the ANZSCO occupation title. What matters is that your duties and responsibilities substantially match the ANZSCO description for the code. Different employers use different job titles for the same type of work. Your skills assessing body will assess your duties rather than your job title.",
      },
      {
        q: "Can I change my ANZSCO code after submitting an EOI?",
        a: "Yes, you can update your EOI at any time, including changing your nominated occupation. However, if you change your occupation code, you will need a valid positive skills assessment for the new occupation. Changing your occupation may also reset your invitation date ranking in some circumstances.",
      },
      {
        q: "What if my occupation does not appear in the ANZSCO search results?",
        a: "If your occupation does not appear, it may be listed under a broader or different title in the ANZSCO system. Try searching with different keywords or abbreviations. You can also consult the full ANZSCO index on the Australian Bureau of Statistics website, or seek advice from a registered migration agent who can identify the most appropriate code for your role.",
      },
    ],
    faqTitle: "Frequently Asked Questions — ANZSCO Codes",
  },

  tr: {
    toolLabel: "ANZSCO Kod Rehberi",
    aboutTitle: "ANZSCO Kod ve Görev Bulucu Hakkında",
    intro:
      "ANZSCO, Avustralya ve Yeni Zelanda'da yetenekli göçmenlik, istihdam istatistikleri ve işgücü planlaması için kullanılan resmi meslek sınıflandırma çerçevesidir. Yetenekli meslek listelerindeki her meslek benzersiz bir 6 haneli ANZSCO kodu ile bağlantılıdır ve doğru kodu seçmek herhangi bir yetenekli vize başvurusundaki en kritik adımlardan biridir.",
    sections: [
      {
        heading: "ANZSCO Kodu Nedir?",
        body: "ANZSCO kodu, Avustralya ve Yeni Zelanda sınıflandırma sistemindeki belirli bir mesleği tanımlayan 6 haneli bir sayıdır. İlk rakam geniş meslek kategorisini temsil eder (örneğin 1 = Yöneticiler, 2 = Profesyoneller) ve sonraki rakamlar daha spesifik gruplara doğru daralır.",
      },
      {
        heading: "ANZSCO Kodunuz Vize Başvuruları İçin Neden Önemlidir?",
        body: "ANZSCO kodunuz, nitelendirmelerinizi ve deneyiminizi hangi değerlendirme kuruluşunun değerlendireceğini, mesleğinizin ilgili yetenekli meslek listesinde (MLTSSL, STSOL veya ROL) yer alıp almadığını ve hangi vize alt sınıflarına uygun olduğunuzu belirler.",
      },
      {
        heading: "Doğru ANZSCO Kodunu Nasıl Bulursunuz?",
        body: "Mesleğinizin ANZSCO görev tanımını inceleyerek başlayın ve gerçekte her gün yaptığınız çalışmayla karşılaştırın. Rolünüz, yalnızca aynı iş unvanını paylaşmakla kalmayıp ANZSCO görevleriyle önemli ölçüde örtüşmelidir.",
      },
      {
        heading: "Yanlış Kod Seçerseniz Ne Olur?",
        body: "Yanlış bir ANZSCO kodu seçmek ciddi sonuçlara yol açabilir. Yanlış bir kod altında beceri değerlendirmesi başvurusunda bulunursanız, değerlendirme kuruluşu başvurunuzu reddedebilir.",
      },
      {
        heading: "ANZSCO Beceri Seviyeleri Açıklandı",
        body: "Her ANZSCO mesleğine 1'den (en yüksek) 5'e (en düşük) kadar bir beceri düzeyi atanır. Çoğu yetenekli göçmenlik vizesi, 1, 2 veya 3 beceri düzeylerini gerektirir.",
      },
    ],
    faqs: [
      {
        q: "İki farklı iş aynı ANZSCO kodunu paylaşabilir mi?",
        a: "Evet. ANZSCO kodları meslekleri geniş bir düzeyde tanımlar, bu nedenle önemli ölçüde benzer görevleri paylaşıyorlarsa birden fazla iş unvanı aynı koda eşlenebilir.",
      },
      {
        q: "Mesleğimin yetenekli meslek listesinde olup olmadığını nasıl bilebilirim?",
        a: "İçişleri Bakanlığı üç yetenekli meslek listesi tutar: MLTSSL, STSOL ve ROL. ANZSCO kodunuzu veya meslek adınızı kullanarak bu listeleri DHA web sitesinde arayabilirsiniz.",
      },
      {
        q: "İş unvanımın ANZSCO unvanıyla tam olarak eşleşmesi gerekiyor mu?",
        a: "Hayır. İş unvanınızın ANZSCO meslek unvanıyla tam olarak eşleşmesi gerekmiyor. Önemli olan, görev ve sorumluluklarınızın söz konusu kod için ANZSCO tanımıyla önemli ölçüde örtüşmesidir.",
      },
      {
        q: "EOI sunduktan sonra ANZSCO kodumu değiştirebilir miyim?",
        a: "Evet, aday mesleğinizi değiştirmek de dahil olmak üzere EOI'nizi istediğiniz zaman güncelleyebilirsiniz. Ancak meslek kodunuzu değiştirirseniz, yeni meslek için geçerli, olumlu bir beceri değerlendirmesine ihtiyacınız olacak.",
      },
      {
        q: "Mesleğim ANZSCO arama sonuçlarında görünmüyorsa ne olur?",
        a: "Mesleğiniz görünmüyorsa, ANZSCO sisteminde daha geniş veya farklı bir başlık altında listelenebilir. Farklı anahtar kelimelerle aramayı deneyin veya kayıtlı bir göçmenlik acentesinden tavsiye isteyin.",
      },
    ],
    faqTitle: "Sıkça Sorulan Sorular — ANZSCO Kodları",
  },

  "zh-Hans": {
    toolLabel: "ANZSCO代码指南",
    aboutTitle: "关于ANZSCO代码和职责查找器",
    intro:
      "ANZSCO（澳大利亚和新西兰职业标准分类）是澳大利亚技术移民、就业统计和劳动力规划使用的官方职业分类框架。技术职业列表上的每个职业都与一个唯一的6位ANZSCO代码关联，选择正确的代码是任何技术签证申请中最关键的步骤之一。",
    sections: [
      {
        heading: "什么是ANZSCO代码？",
        body: "ANZSCO代码是一个6位数字，用于识别澳大利亚和新西兰分类系统中的特定职业。第一位数字代表广泛的职业类别（例如1=管理人员，2=专业人员），后续数字缩小到更具体的组和个别职业。",
      },
      {
        heading: "为什么ANZSCO代码对签证申请很重要",
        body: "您的ANZSCO代码决定哪个评估机构评估您的资格和经验、您的职业是否出现在相关技术职业列表（MLTSSL、STSOL或ROL）上、您有资格申请哪些签证子类，以及在某些情况下适用的州提名标准。",
      },
      {
        heading: "如何找到正确的ANZSCO代码",
        body: "首先查看您职业的ANZSCO职责描述，并将其与您实际每天执行的工作进行比较。您的角色必须与ANZSCO职责大体匹配——不仅仅是共享相同的职位名称。",
      },
      {
        heading: "如果选错代码会发生什么？",
        body: "选择错误的ANZSCO代码可能会产生严重后果。如果您在错误代码下申请技能评估，评估机构可能会拒绝您的申请或根据错误标准对您进行评估。",
      },
      {
        heading: "ANZSCO技能等级说明",
        body: "每个ANZSCO职业被分配1级（最高）到5级（最低）的技能等级。大多数技术移民签证要求技能等级1、2或3。验证您职业的技能等级是移民规划的重要早期步骤。",
      },
    ],
    faqs: [
      {
        q: "两种不同的工作可以共享相同的ANZSCO代码吗？",
        a: "是的。ANZSCO代码在广泛层面描述职业，因此如果多个具体职位名称共享基本相似的职责，它们可以映射到相同的代码。重要的是您的实际职责是否与ANZSCO描述一致，而不是您的职位名称。",
      },
      {
        q: "如何知道我的职业是否在技术职业列表上？",
        a: "内政部维护三个技术职业列表：MLTSSL、STSOL和ROL。您可以在DHA网站上使用您的ANZSCO代码或职业名称搜索这些列表。",
      },
      {
        q: "我的职位名称需要与ANZSCO标题完全匹配吗？",
        a: "不需要。重要的是您的职责和责任与该代码的ANZSCO描述大体匹配。不同雇主对相同类型的工作使用不同的职位名称。",
      },
      {
        q: "提交EOI后可以更改ANZSCO代码吗？",
        a: "是的，您可以随时更新EOI，包括更改您提名的职业。但是，如果您更改职业代码，您将需要新职业的有效正面技能评估。",
      },
      {
        q: "如果我的职业没有出现在ANZSCO搜索结果中怎么办？",
        a: "如果您的职业没有出现，它可能在ANZSCO系统中以更广泛或不同的标题列出。尝试使用不同的关键词搜索，或向注册移民代理寻求建议。",
      },
    ],
    faqTitle: "常见问题——ANZSCO代码",
  },
};

export function getAnzscoSeoContent(locale: string): PageContent {
  return content[locale] ?? content.en;
}

export function buildAnzscoSchema(locale: string): string {
  const c = getAnzscoSeoContent(locale);
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
