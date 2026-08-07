interface InstitutionsMarqueeProps {
  locale: string;
}

/**
 * Assessing-authority marquee — the 12 official skills-assessment bodies that
 * the skills-assessment engine in `lib/skills-assessment/` is built around.
 * Renders a slow, seamless, infinite scroll (see .marquee-track in
 * app/globals.css) with edge fades; pauses on hover.
 */
const AUTHORITIES = [
  "VETASSESS",
  "TRA",
  "ACS",
  "Engineers Australia",
  "CPA Australia",
  "AACA",
  "ADC",
  "AIMS",
  "CA ANZ",
  "IPA",
  "CASA",
  "OTC",
];

export function InstitutionsMarquee({ locale }: InstitutionsMarqueeProps) {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";

  const title = isTr
    ? "Avustralya Hükümeti standartlarına ve 12+ resmi değerlendirme kurumuna tam uyumlu"
    : isZh
      ? "完全符合澳大利亚政府标准，并覆盖 12+ 个官方评估机构"
      : "Fully aligned with Australian Government standards and 12+ official assessing authorities";

  return (
    <section
      aria-label={title}
      className="case-file overflow-hidden border-y border-[var(--cf-line)] bg-[var(--cf-bg-deep)] py-12 sm:py-14"
    >
      <div className="section-shell">
        <p className="cf-mono text-center text-xs uppercase tracking-[0.14em] text-[var(--cf-muted)]">
          {title}
        </p>
      </div>

      <div className="relative mt-9 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="marquee-track flex w-max items-center gap-12 pr-12">
          {[...AUTHORITIES, ...AUTHORITIES].map((name, index) => (
            <span
              key={`${name}-${index}`}
              className="cf-serif shrink-0 text-2xl font-medium tracking-tight text-[var(--cf-fg)]/45 sm:text-3xl"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
