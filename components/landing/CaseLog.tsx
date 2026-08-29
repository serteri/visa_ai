interface CaseLogProps {
  locale: string;
}

type FlagKind = "brass" | "rust" | "sage";

const FLAG_CLASSES: Record<FlagKind, string> = {
  brass: "bg-[var(--cf-flag-brass-bg)] text-[var(--cf-flag-brass-fg)]",
  rust: "bg-[var(--cf-flag-rust-bg)] text-[var(--cf-flag-rust-fg)]",
  sage: "bg-[var(--cf-flag-sage-bg)] text-[var(--cf-flag-sage-fg)]",
};

/** Case Log — the 4 real case studies (Michael K./Priya R./Ahmet Y./Sarah L.),
 *  restyled as "case-entry" file cards on a fixed navy surface (--cf-case-bg
 *  never flips with the page theme, per design spec). Copy is unchanged. */
export function CaseLog({ locale }: CaseLogProps) {
  const cases: {
    flag: string;
    caseId: string;
    name: string;
    role: string;
    flagText: string;
    flagKind: FlagKind;
    narrative: string;
  }[] = [
    {
      flag: "🇦🇺",
      caseId: "CASE #2201",
      name: "Michael K.",
      role: locale === "tr" ? "Yazılım Mühendisi, 36 Yaşında" : locale === "zh-Hans" ? "软件工程师，36岁" : "Software Engineer, Age 36",
      flagText:
        locale === "tr"
          ? "485 Uygun Değil → 190 (VIC) %70 Eşleşme"
          : locale === "zh-Hans"
            ? "485 不符合 → 190（维州）70% 匹配"
            : "485 Ineligible → 190 (VIC) 70% Match",
      flagKind: "brass",
      narrative:
        locale === "tr"
          ? "1 Temmuz 2026 yaş sınırı (35) nedeniyle 485 için Uygun Değil olarak işaretlendi. Sistem profili otomatik olarak %70 eşleşme olasılığıyla Subclass 190'a (Victoria) yönlendirdi."
          : locale === "zh-Hans"
            ? "由于2026年7月1日起的35岁年龄上限，被标记为485签证不符合资格。系统自动将档案重新定向至190类别（维多利亚州），匹配概率为70%。"
            : "Flagged as Ineligible for 485 due to the 1 July 2026 age limit (35). System automatically redirected profile to Subclass 190 (Victoria) with a 70% match probability.",
    },
    {
      flag: "🇨🇦",
      caseId: "CASE #2198",
      name: "Priya R.",
      role: locale === "tr" ? "Full-Stack Geliştirici" : locale === "zh-Hans" ? "全栈开发工程师" : "Full-Stack Developer",
      flagText:
        locale === "tr" ? "CRS 468 → +20 Puan Simülasyonu" : locale === "zh-Hans" ? "CRS 468 → 模拟 +20 分" : "CRS 468 → +20 pts Simulated",
      flagKind: "sage",
      narrative:
        locale === "tr"
          ? "468 Express Entry (FSW) puanı hesaplandı. Sistem sınır riskleri tespit etti ve Superior İngilizce eğitim seçenekleriyle +20 puanlık bir artışı simüle etti."
          : locale === "zh-Hans"
            ? "计算出468分的快速通道（FSW）评分。系统识别出临界风险，并模拟了通过\"优秀英语\"培训方案获得的+20分提升。"
            : "Calculated a 468 Express Entry (FSW) score. System identified boundary risks and simulated a +20 point boost via Superior English training options.",
    },
    {
      flag: "🇦🇺",
      caseId: "CASE #2194",
      name: "Ahmet Y.",
      role: locale === "tr" ? "Makine Mühendisi, Aile Hesabı" : locale === "zh-Hans" ? "机械工程师，家庭账户" : "Mechanical Engineer, Family Account",
      flagText: locale === "tr" ? "🚨 4.890 $ Risk Yakalandı" : locale === "zh-Hans" ? "🚨 发现 $4,890 风险" : "🚨 $4,890 Risk Caught",
      flagKind: "rust",
      narrative:
        locale === "tr"
          ? "Eşin fonksiyonel İngilizce kanıtı olmadığı için gizli 4.890 dolarlık ikinci taksit vize ücreti riskini tespit etti; başvuru öncesinde binlerce dolar tasarruf sağladı."
          : locale === "zh-Hans"
            ? "由于配偶缺乏功能性英语证明，系统发现了隐藏的4,890美元第二期签证费用风险，在递交申请前节省了数千美元。"
            : "Caught a hidden $4,890 second-instalment visa charge hazard because the spouse lacked functional English proof, saving thousands before lodgement.",
    },
    {
      flag: "🇦🇺",
      caseId: "CASE #2189",
      name: "Sarah L.",
      role:
        locale === "tr" ? "Dijital Uzman → Pazarlama Müdürü" : locale === "zh-Hans" ? "数字专员 → 市场经理" : "Digital Specialist → Marketing Manager",
      flagText: locale === "tr" ? "SA Adaylık Oranı: %25 → %80" : locale === "zh-Hans" ? "SA提名几率：25% → 80%" : "SA Nomination Odds: 25% → 80%",
      flagKind: "sage",
      narrative:
        locale === "tr"
          ? "Genel görevleri kapalı bir eyalet listesinden ANZSCO 225113'e (Reklamcılık Uzmanı) yeniden hizalayarak Güney Avustralya adaylık olasılığını %25'ten %80'e yükseltti."
          : locale === "zh-Hans"
            ? "将通用职责从已关闭的州清单重新匹配至ANZSCO 225113（广告专员），将南澳大利亚州提名几率从25%提升至80%。"
            : "Realigned general duties from a closed state list to ANZSCO 225113 (Advertising Specialist), lifting South Australia nomination odds from 25% to 80%.",
    },
  ];

  return (
    <section className="case-file bg-[var(--cf-bg)] py-24 sm:py-32">
      <div className="section-shell">
        <p className="cf-mono mb-4 text-xs uppercase tracking-[0.14em] text-[var(--cf-accent)]">
          {locale === "tr" ? "Vaka Kaydı" : locale === "zh-Hans" ? "案例记录" : "Case Log"}
        </p>
        <h2 className="cf-serif max-w-[20ch] text-4xl font-extrabold tracking-tight text-[var(--cf-fg)] sm:text-5xl">
          {locale === "tr"
            ? "Son Derinlemesine Değerlendirmeler"
            : locale === "zh-Hans"
              ? "近期深度评估案例"
              : "Recent Deep-Dive Assessments"}
        </h2>
        <p className="mt-4 max-w-[52ch] text-lg font-medium leading-relaxed text-[var(--cf-muted)]">
          {locale === "tr"
            ? "Yapay zeka motorumuzun bu hafta çözdüğü gerçek senaryolar."
            : locale === "zh-Hans"
              ? "本周我们的AI引擎已解决的真实场景。"
              : "Real scenarios our AI engine has resolved this week."}
        </p>

        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2">
          {cases.map((item) => (
            <div key={item.name} className="rounded-2xl bg-[var(--cf-case-bg)] p-8 sm:p-10">
              <div className="mb-4 flex items-start justify-between gap-3">
                <span className="cf-mono text-[0.7rem] text-[var(--cf-case-muted)]">
                  {item.flag} {item.caseId}
                </span>
                <span
                  className={`cf-mono shrink-0 rounded-sm px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-wide ${FLAG_CLASSES[item.flagKind]}`}
                >
                  {item.flagText}
                </span>
              </div>
              <p className="cf-serif text-xl text-[var(--cf-case-fg)]">{item.name}</p>
              <p className="mb-3 text-sm text-[var(--cf-case-muted)]">{item.role}</p>
              <p className="text-sm leading-relaxed text-[var(--cf-case-fg)]/85">{item.narrative}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
