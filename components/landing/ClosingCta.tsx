import Link from "next/link";

interface ClosingCtaProps {
  locale: string;
}

/** Final CTA closer, matching the reference mockup's ".closer" section. */
export function ClosingCta({ locale }: ClosingCtaProps) {
  return (
    <section className="case-file bg-[var(--cf-bg)] py-24 text-center">
      <div className="section-shell">
        <p className="cf-mono mb-4 text-xs uppercase tracking-[0.14em] text-[var(--cf-accent)]">
          {locale === "tr" ? "Hazır Olduğunuzda" : locale === "zh-Hans" ? "随时准备" : "Ready When You Are"}
        </p>
        <h2 className="cf-serif mx-auto max-w-[26ch] text-3xl font-medium text-[var(--cf-fg)] sm:text-5xl">
          {locale === "tr"
            ? "Dosyanızı açın. İki dakika, tahmin yok."
            : locale === "zh-Hans"
              ? "打开您的案卷。两分钟，无需猜测。"
              : "Open your case file. Two minutes, no guesswork."}
        </h2>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href={`/${locale}/full-check?country=AU`}
            className="inline-flex items-center justify-center gap-2 rounded-sm bg-[var(--cf-accent)] px-8 py-4 text-base font-semibold text-[var(--cf-bg-deep)] shadow-[0_20px_40px_-15px_var(--cf-shadow)] transition-transform hover:-translate-y-0.5"
          >
            {locale === "tr" ? "🇦🇺 Avustralya Değerlendirmesini Başlat" : "🇦🇺 Start Australia Assessment"} <span aria-hidden>→</span>
          </Link>
          <Link
            href={`/${locale}/full-check?country=CA`}
            className="inline-flex items-center justify-center gap-2 rounded-sm border border-[var(--cf-line)] px-8 py-4 text-base font-semibold text-[var(--cf-fg)] transition-colors hover:border-[var(--cf-fg)]"
          >
            {locale === "tr" ? "🇨🇦 Kanada Değerlendirmesini Başlat" : "🇨🇦 Start Canada Assessment"} <span aria-hidden>→</span>
          </Link>
        </div>
        <p className="cf-mono mt-6 text-xs text-[var(--cf-muted)]">
          {locale === "tr"
            ? "Yalnızca genel bilgi amaçlıdır. Göçmenlik danışmanlığı değildir."
            : locale === "zh-Hans"
              ? "仅供一般信息参考，非移民建议。"
              : "General information only. Not migration advice."}
        </p>
      </div>
    </section>
  );
}
