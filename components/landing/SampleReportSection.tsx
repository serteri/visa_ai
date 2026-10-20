import Link from "next/link";
import { publicPath } from "@/lib/seo/urls";
import { researchText } from "@/lib/marketing/research-journey";
import { ASSESSMENT_PRICE_LABEL } from "@/components/landing/AssessmentSection";
import { PremiumReportShowcase } from "@/components/sections/PremiumReportShowcase";

/** Heading, price and calls to action around the real report-page gallery (PremiumReportShowcase). */
export function SampleReportIntro({ locale, sequence = false }: { locale: string; sequence?: boolean }) {
  const t = (en: string, tr: string, zh: string) => researchText(locale, en, tr, zh);
  const Heading = sequence ? "h1" : "h2";
  return (
    <div className="max-w-3xl">
      <p className="cf-mono text-xs font-semibold uppercase tracking-wider text-[var(--cf-accent)]">{t("Sample report", "Örnek rapor", "示例报告")}</p>
      <Heading className="cf-serif mt-4 text-3xl text-[var(--cf-fg)] sm:text-4xl">{t("See what your Assessment report looks like", "Değerlendirme raporunuzun nasıl göründüğünü görün", "查看您的评估报告是什么样子")}</Heading>
      <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--cf-muted)]">{t("Preview pages generated from the same report format used by the LogiVisa Assessment. The example uses fictional information.", "LogiVisa Değerlendirmesinde kullanılan aynı rapor biçiminden oluşturulan önizleme sayfaları. Örnekte kurgusal bilgiler kullanılır.", "预览页面由 LogiVisa 评估所用的同一报告格式生成。示例使用虚构信息。")}</p>
      <p className="mt-5 flex items-baseline gap-2"><span className="cf-serif text-3xl text-[var(--cf-fg)]">{ASSESSMENT_PRICE_LABEL}</span><span className="text-sm text-[var(--cf-muted)]">{t("including GST", "GST dahil", "含 GST")}</span></p>
      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link href={publicPath(locale, "/full-check")} data-assessment-entry={sequence ? "sample_report_page" : "homepage_sample_report"} className="inline-flex min-h-12 items-center rounded-full bg-[var(--cf-accent)] px-6 py-3 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4">{t("Start Assessment", "Değerlendirme Başlat", "开始评估")} <span aria-hidden className="ml-3">→</span></Link>
        {!sequence && <Link href={publicPath(locale, "/sample-report")} className="py-3 text-sm font-semibold text-[var(--cf-accent)] underline underline-offset-4">{t("View sample report (opens a page)", "Örnek raporu görüntüle (sayfa açılır)", "查看示例报告（打开新页面）")}</Link>}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-[var(--cf-muted)]">{t("Information and research support only. LogiVisa does not provide migration advice or determine visa eligibility.", "Yalnızca bilgi ve araştırma desteği. LogiVisa göçmenlik danışmanlığı sunmaz ve vize uygunluğunu belirlemez.", "仅提供信息与研究支持。LogiVisa 不提供移民建议，也不判定签证资格。")}</p>
    </div>
  );
}

export function SampleReportSection({ locale }: { locale: string }) {
  return (
    <div data-home-sample-report>
      <PremiumReportShowcase intro={<SampleReportIntro locale={locale} />} />
    </div>
  );
}
