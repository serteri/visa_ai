import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface FaqProps {
  locale: string;
}

/** SEO/pain-point FAQ. Copy unchanged. The shared Accordion component
 *  hardcodes slate-900/white text for its OS-dark-mode pattern -- since this
 *  section sits on the always-navy --cf-case-bg (not the page bg that flips),
 *  the trigger text color is explicitly overridden so it stays legible in
 *  the "light" theme too, where dark:text-white would not apply. */
export function Faq({ locale }: FaqProps) {
  const faqs = [
    {
      value: "points-calculation",
      question:
        locale === "tr"
          ? "Avustralya yetenekli göç puanımı nasıl hesaplayabilirim?"
          : locale === "zh-Hans"
            ? "如何计算我的澳大利亚技术移民积分？"
            : "How can I calculate my Australian skilled migration points?",
      answer:
        locale === "tr"
          ? "Ücretsiz Puan Hesaplayıcımızı kullanarak Subclass 189, 190 ve 491 yetenekli göç vizeleri için puanınızı anında tahmin edin. Araç; yaş, İngilizce seviyesi, iş deneyimi ve eyalet adaylığı bonus puanlarını dikkate alarak, tam başvuru yapmadan önce PR uygunluğunuz hakkında doğru bir tablo sunar."
          : locale === "zh-Hans"
            ? "使用我们的免费积分计算器，即时估算您在189、190和491类技术移民签证下的分数。该工具综合考虑年龄、英语水平、工作经验以及州提名加分，帮助您在正式提交申请前准确了解自己的永居（PR）资格。"
            : "Use our free Points Calculator to instantly estimate your score for Subclass 189, 190, and 491 skilled migration visas. The tool factors in age, English level, work experience, and state nomination bonus points to give you an accurate picture of your PR eligibility before you invest time in a full application.",
    },
    {
      value: "csit-threshold",
      question:
        locale === "tr"
          ? "Avustralya sponsorlu vizeleri için yeni gelir eşikleri (CSIT) nelerdir?"
          : locale === "zh-Hans"
            ? "澳大利亚担保签证的新收入门槛（CSIT）是多少？"
            : "What are the new income thresholds (CSIT) for Australian sponsored visas?",
      answer:
        locale === "tr"
          ? "1 Temmuz 2026 tarihinden itibaren, Talep Üzerine Beceri Vizesi (Subclass 482) için Temel Beceri Gelir Eşiği (CSIT) AUD 79.423'e yükseldi. Sponsorlar, aday gösterilen kişinin yıllık kazancının bu eşiği karşıladığını veya aştığını garanti etmelidir. Fiyatlandırma ve uygunluk hakkında tam döküm için Subclass 482 sayfamıza göz atın."
          : locale === "zh-Hans"
            ? "自2026年7月1日起，技能需求签证（482类别）的核心技能收入门槛（CSIT）已提高至79,423澳元。担保方必须保证被提名人的年收入达到或超过该门槛。请查看我们的482类别页面，了解完整的费用和资格详情。"
            : "From 1 July 2026, the Core Skills Income Threshold (CSIT) for the Skills in Demand visa (Subclass 482) rose to AUD 79,423. Sponsors must guarantee the nominee's annual earnings meet or exceed this threshold. Check our Subclass 482 page for the full breakdown of pricing and eligibility.",
    },
    {
      value: "ai-matcher",
      question:
        locale === "tr"
          ? "AI Vize Yolu Eşleştirici, Kanada ve Avustralya için nasıl çalışır?"
          : locale === "zh-Hans"
            ? "AI签证路径匹配器如何为加拿大和澳大利亚工作？"
            : "How does the AI Visa Pathway Matcher work for Canada and Australia?",
      answer:
        locale === "tr"
          ? "AI Vize Yolu Eşleştiricimiz, CV'nizi Avustralya için ANZSCO ve Kanada için NOC olmak üzere 707'den fazla resmi meslek koduyla karşılaştırarak en güçlü vize yollarınızı anında belirler. Kanada için profilinizi Express Entry ve IRCC gerekliliklerine göre hizalar; Avustralya için ise mesleğinizi PR yolları için kullanılan yetenekli meslek listeleriyle karşılaştırır."
          : locale === "zh-Hans"
            ? "我们的AI签证路径匹配器将您的简历与707多个官方职业代码进行比对——澳大利亚使用ANZSCO，加拿大使用NOC——即时识别您最强的签证路径。针对加拿大，它会将您的资料与Express Entry及IRCC要求进行匹配；针对澳大利亚，它会将您的职业与用于永居路径的技术职业清单进行交叉核对。"
            : "Our AI Visa Pathway Matcher analyzes your CV against 707+ official occupation codes — ANZSCO for Australia and NOC for Canada — to instantly identify your strongest visa pathways. For Canada, it aligns your profile with Express Entry and IRCC requirements; for Australia, it cross-references your occupation against the skilled occupation lists used for PR pathways.",
    },
    {
      value: "occupation-list",
      question:
        locale === "tr"
          ? "Mesleğim Avustralya veya Kanada yetenekli meslek listesinde mi?"
          : locale === "zh-Hans"
            ? "我的职业是否在澳大利亚或加拿大的技术职业清单上？"
            : "Is my occupation on the Australian or Canadian skilled occupation list?",
      answer:
        locale === "tr"
          ? "Ücretsiz ANZSCO/NOC meslek bulucumuzda arama yaparak anında kontrol edin. Mesleğiniz ilgili yetenekli meslek listesinde ise, eyalet adaylığı veya bölgesel bir vize (Avustralya'da Subclass 491 veya Kanada'da bir Eyalet Adaylık Programı akışı) için uygun olabilirsiniz; bunların ikisi de bonus puan veya kalıcı oturuma daha hızlı bir yol sunabilir."
          : locale === "zh-Hans"
            ? "使用我们的免费ANZSCO/NOC职业查找工具即时查询。如果您的职业在相应的技术职业清单上，您可能有资格申请州提名或地区签证（澳大利亚的491类别，或加拿大的省提名计划通道），两者都可能提供加分或更快的永居路径。"
            : "Search our free ANZSCO/NOC occupation finder to check instantly. If your occupation is on the relevant skilled occupation list, you may be eligible for state nomination or a regional visa (Subclass 491 in Australia, or a Provincial Nominee Program stream in Canada), both of which can offer bonus points or a faster pathway to permanent residence.",
    },
  ];

  return (
    <section className="case-file bg-[var(--cf-bg)] py-20">
      <div className="section-shell">
        <p className="cf-mono mb-3 text-center text-xs uppercase tracking-[0.14em] text-[var(--cf-accent)]">
          {locale === "tr" ? "SSS" : locale === "zh-Hans" ? "常见问题" : "FAQ"}
        </p>
        <h2 className="cf-serif mx-auto max-w-[24ch] text-center text-3xl font-medium text-[var(--cf-fg)] sm:text-4xl">
          {locale === "tr"
            ? "Vize Yolları Hakkında Sıkça Sorulan Sorular"
            : locale === "zh-Hans"
              ? "关于签证路径的常见问题"
              : "Frequently Asked Questions About Visa Pathways"}
        </h2>

        <div className="mx-auto mt-10 max-w-3xl rounded-sm border border-[var(--cf-line)] bg-[var(--cf-case-bg)] px-6 sm:px-8">
          <Accordion className="divide-y divide-[var(--cf-line)]">
            {faqs.map((faq) => (
              <AccordionItem key={faq.value} value={faq.value}>
                <AccordionTrigger className="text-[var(--cf-case-fg)]">{faq.question}</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm leading-relaxed text-[var(--cf-case-muted)]">{faq.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
