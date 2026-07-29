interface FeaturesBentoProps {
  locale: string;
}

/** "What's in the report" — 3-card feature grid, including the Points
 *  Calculator teaser (drives to /tools/points-calculator elsewhere on the
 *  site). Copy unchanged, restyled as ledger-style cards. */
export function FeaturesBento({ locale }: FeaturesBentoProps) {
  const cards = [
    {
      emoji: "✨",
      title: locale === "tr" ? "Puan Hesaplayıcı" : locale === "zh-Hans" ? "积分计算器" : "Points Calculator",
      description:
        locale === "tr"
          ? "Tahmini puanınızı ve potansiyel ek puan fırsatlarını gerçek göç kurallarına göre anında hesaplayın."
          : locale === "zh-Hans"
            ? "根据移民规则即刻计算您的预估分数以及潜在的加分机会。"
            : "Instantly calculate your estimated points and potential bonus point opportunities based on real immigration rules.",
    },
    {
      emoji: "🔍",
      title: locale === "tr" ? "Gizli Riskler" : locale === "zh-Hans" ? "潜在风险" : "Hidden Risks",
      description:
        locale === "tr"
          ? "Profilinizdeki eksik belgeleri ve red riskini artırabilecek zayıf noktaları önceden tespit edin."
          : locale === "zh-Hans"
            ? "提前发现您档案中缺失的材料以及可能增加拒签风险的弱点。"
            : "Identify missing documents and weak spots in your profile that could increase your risk of refusal.",
    },
    {
      emoji: "🗺️",
      title: locale === "tr" ? "Maliyet Yol Haritası" : locale === "zh-Hans" ? "费用路线图" : "Cost Roadmap",
      description:
        locale === "tr"
          ? "Vize ücretleri, danışmanlık masrafları ve diğer tüm süreç maliyetlerini detaylı bir şekilde planlayın."
          : locale === "zh-Hans"
            ? "详细规划签证费、咨询费以及整个流程中的其他所有成本。"
            : "Detailed planning of visa fees, consultation costs, and all other expenses involved in your journey.",
    },
  ];

  return (
    <section className="case-file bg-[var(--cf-bg)] py-20">
      <div className="section-shell">
        <p className="cf-mono mb-3 text-xs uppercase tracking-[0.14em] text-[var(--cf-accent)]">
          {locale === "tr" ? "İçerik" : locale === "zh-Hans" ? "内容" : "Contents"}
        </p>
        <h2 className="cf-serif max-w-[20ch] text-3xl font-medium text-[var(--cf-fg)] sm:text-4xl">
          {locale === "tr" ? "Raporda Neler Var?" : locale === "zh-Hans" ? "报告内容" : "What's in the Report?"}
        </h2>
        <p className="mt-3 max-w-[52ch] text-[var(--cf-muted)]">
          {locale === "tr"
            ? "Gerçek verilere dayalı, yapay zeka destekli detaylı analiz."
            : locale === "zh-Hans"
              ? "基于真实数据和AI驱动的详细分析。"
              : "Detailed analysis driven by AI and real data."}
        </p>

        <div className="mt-10 grid grid-cols-1 gap-px border border-[var(--cf-line)] bg-[var(--cf-line)] md:grid-cols-3">
          {cards.map((card) => (
            <div key={card.title} className="flex flex-col gap-3 bg-[var(--cf-case-bg)] p-6 sm:p-8">
              <span className="text-2xl">{card.emoji}</span>
              <h3 className="cf-serif text-lg text-[var(--cf-case-fg)]">{card.title}</h3>
              <p className="text-sm leading-relaxed text-[var(--cf-case-muted)]">{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
