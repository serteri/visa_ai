import { researchText } from "@/lib/marketing/research-journey";
export function Faq({ locale }: { locale: string }) {
  const text = (en: string, tr: string, zh: string) =>
    researchText(locale, en, tr, zh);
  const faqs = [
    [
      text(
        "What does LogiVisa provide?",
        "LogiVisa ne sunar?",
        "LogiVisa 提供什么？",
      ),
      text(
        "Occupation and visa information, skills-assessment references, points tools and comparisons of published requirements. It does not decide personal visa outcomes or provide immigration advice.",
        "Meslek ve vize bilgileri, beceri değerlendirme kaynakları, puan araçları ve yayımlanmış şartların karşılaştırmasını sunar. Kişisel vize sonuçlarını belirlemez ve göçmenlik danışmanlığı vermez.",
        "提供职业与签证信息、技能评估参考、积分工具及公开要求对比。不判定个人签证结果，也不提供移民咨询。",
      ),
    ],
    [
      text(
        "Does a points estimate or list entry determine a visa outcome?",
        "Puan tahmini veya liste kaydı vize sonucunu belirler mi?",
        "积分估算或清单收录能确定签证结果吗？",
      ),
      text(
        "No. These are research references. Official visa, assessment and nomination criteria apply independently and can change.",
        "Hayır. Bunlar araştırma kaynaklarıdır. Resmî vize, değerlendirme ve adaylık kriterleri ayrı uygulanır ve değişebilir.",
        "不能。这些仅供研究参考。官方签证、评估与提名标准各自适用且可能变化。",
      ),
    ],
    [
      text(
        "How can I check or correct a source?",
        "Kaynağı nasıl kontrol edebilir veya hata bildirebilirim?",
        "如何核对来源或反馈更正？",
      ),
      text(
        "Use the official links and dates shown on the relevant page. If a reference is outdated or incorrect, tell us through the contact page.",
        "İlgili sayfadaki resmî bağlantıları ve tarihleri kullanın. Güncel olmayan veya hatalı kaynakları iletişim sayfasından bildirin.",
        "使用相关页面的官方链接与日期。如发现过时或错误来源，请通过联系页面反馈。",
      ),
    ],
  ];
  return (
    <section className="case-file border-t border-[var(--cf-line)] py-16">
      <div className="section-shell max-w-4xl">
        <h2 className="cf-serif text-3xl text-[var(--cf-fg)]">
          {text(
            "About the research tools",
            "Araştırma araçları hakkında",
            "关于研究工具",
          )}
        </h2>
        <div className="mt-7 space-y-3">
          {faqs.map(([question, answer]) => (
            <details
              key={question}
              className="rounded-xl border border-[var(--cf-line)] bg-white p-5"
            >
              <summary className="cursor-pointer font-semibold text-slate-900">
                {question}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
