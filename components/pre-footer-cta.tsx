import Link from "next/link";

/**
 * Final conversion nudge shown right above the footer on every (main) page —
 * a dark, high-contrast band so it reads as a distinct closing section
 * rather than blending into the footer's muted background.
 */
export function PreFooterCta({ locale }: { locale: string }) {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";

  return (
    <section className="section-shell">
      <div className="rounded-3xl bg-transparent px-6 py-12 text-center sm:px-12">
        <h2 className="text-2xl font-extrabold tracking-tight text-[var(--cf-fg)] sm:text-3xl">
          {isTr
            ? "Vize Yolunuzu Bulmaya Hazır mısınız?"
            : isZh
              ? "准备好找到您的签证路径了吗？"
              : "Ready to Find Your Visa Pathway?"}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--cf-muted)] sm:text-base">
          {isTr
            ? "2 dakikada, gerçek verilere dayalı, kişiselleştirilmiş bir analiz alın."
            : isZh
              ? "2分钟内获得基于真实数据的个性化分析。"
              : "Get a personalized, data-driven analysis in 2 minutes."}
        </p>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href={`/${locale}/full-check?country=AU`}
            className="group inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-[var(--cf-accent)] px-8 py-4 text-base font-extrabold text-white shadow-xl transition-all duration-300 hover:scale-105 sm:w-auto sm:px-10 sm:text-lg"
          >
            {isTr ? "Avustralya Değerlendirmesini Başlat" : isZh ? "开始澳大利亚评估" : "Start Australia Assessment"}
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
          <Link
            href={`/${locale}/full-check?country=CA`}
            className="group inline-flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-[var(--cf-line)] bg-transparent px-8 py-4 text-base font-extrabold text-[var(--cf-fg)] shadow-xl transition-all duration-300 hover:scale-105 hover:bg-slate-100 sm:w-auto sm:px-10 sm:text-lg"
          >
            {isTr ? "Kanada Değerlendirmesini Başlat" : isZh ? "开始加拿大评估" : "Start Canada Assessment"}
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
