interface StatsBarProps {
  locale: string;
}

/** Stats strip + "powered by official data" line — unchanged copy, reskinned
 *  as a mono ledger row on the case-file background. */
export function StatsBar({ locale }: StatsBarProps) {
  const stats = [
    {
      value: "707+",
      label: locale === "tr" ? "İncelenen Meslek" : locale === "zh-Hans" ? "已分析职业" : "Occupations Analyzed",
    },
    {
      value: locale === "tr" ? "Gerçek Zamanlı" : locale === "zh-Hans" ? "实时" : "Real-Time",
      label: locale === "tr" ? "ANZSCO ve NOC Verisi" : locale === "zh-Hans" ? "ANZSCO 与 NOC 数据" : "ANZSCO & NOC Data",
    },
    {
      value: locale === "tr" ? "AI Destekli" : locale === "zh-Hans" ? "AI 驱动" : "AI-Powered",
      label:
        locale === "tr" ? "Eşleştirme Hassasiyeti" : locale === "zh-Hans" ? "匹配精准度" : "Matching Precision",
    },
    { value: "2026", label: locale === "tr" ? "Göç Verileri" : locale === "zh-Hans" ? "移民数据" : "Immigration Data" },
  ];

  return (
    <section className="case-file border-y border-[var(--cf-line)] bg-[var(--cf-bg)] py-10">
      <div className="section-shell">
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4 sm:divide-x sm:divide-[var(--cf-line)]">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1 px-2 text-center">
              <p className="cf-serif text-2xl font-semibold text-[var(--cf-fg)] sm:text-3xl">{stat.value}</p>
              <p className="cf-mono text-[0.65rem] uppercase tracking-wide text-[var(--cf-muted)] sm:text-xs">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center gap-4 border-t border-[var(--cf-line)] pt-8 text-center">
          <p className="cf-mono text-xs uppercase tracking-wider text-[var(--cf-muted)]">
            {locale === "tr"
              ? "Resmi Göç Verileriyle Desteklenmektedir:"
              : locale === "zh-Hans"
                ? "由官方移民数据提供支持："
                : "Powered by Official Immigration Data:"}
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-x-10">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--cf-muted)]">
              <span className="text-lg">🇦🇺</span>
              <span>
                {locale === "tr"
                  ? "Avustralya Hükümeti İçişleri Bakanlığı (ANZSCO)"
                  : locale === "zh-Hans"
                    ? "澳大利亚政府内政部（ANZSCO）"
                    : "Australian Govt. Department of Home Affairs (ANZSCO)"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--cf-muted)]">
              <span className="text-lg">🇨🇦</span>
              <span>
                {locale === "tr" ? "Kanada Hükümeti IRCC (NOC)" : locale === "zh-Hans" ? "加拿大政府 IRCC（NOC）" : "Government of Canada IRCC (NOC)"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
