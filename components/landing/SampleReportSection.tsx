import Link from "next/link";
import { publicPath } from "@/lib/seo/urls";
import { researchText } from "@/lib/marketing/research-journey";
import { ASSESSMENT_PRICE_LABEL } from "@/components/landing/AssessmentSection";
import { SampleReportDocument } from "@/components/landing/SampleReportDocument";

export function SampleReportSection({ locale }: { locale: string }) {
  const t = (en: string, tr: string, zh: string) => researchText(locale, en, tr, zh);
  return (
    <section data-home-sample-report className="case-file py-12 sm:py-20">
      <div className="section-shell grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-14">
        <div>
          <p className="cf-mono text-xs font-semibold uppercase tracking-wider text-[var(--cf-accent)]">{t("Sample report", "Örnek rapor", "示例报告")}</p>
          <h2 className="cf-serif mt-4 text-3xl text-[var(--cf-fg)] sm:text-4xl">{t("See what the Assessment report looks like", "Değerlendirme raporunun nasıl göründüğünü görün", "查看评估报告的样式")}</h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--cf-muted)]">{t("Preview the structure of a LogiVisa Assessment report before you start. The example shows how supplied information, published requirements, sources and research questions are organised.", "Başlamadan önce bir LogiVisa Değerlendirme raporunun yapısını önizleyin. Örnek, sağlanan bilgilerin, yayımlanmış şartların, kaynakların ve araştırma sorularının nasıl düzenlendiğini gösterir.", "开始前先预览 LogiVisa 评估报告的结构。示例展示了所提供的信息、公开要求、来源和研究问题是如何组织的。")}</p>
          <p className="mt-5 flex items-baseline gap-2"><span className="cf-serif text-3xl text-[var(--cf-fg)]">{ASSESSMENT_PRICE_LABEL}</span><span className="text-sm text-[var(--cf-muted)]">{t("including GST", "GST dahil", "含 GST")}</span></p>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href={publicPath(locale, "/full-check")} data-assessment-entry="homepage_sample_report" className="inline-flex min-h-12 items-center rounded-full bg-[var(--cf-accent)] px-6 py-3 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4">{t("Start Assessment", "Değerlendirme Başlat", "开始评估")} <span aria-hidden className="ml-3">→</span></Link>
            <Link href={publicPath(locale, "/sample-report")} className="py-3 text-sm font-semibold text-[var(--cf-accent)] underline underline-offset-4">{t("View sample report (opens a page)", "Örnek raporu görüntüle (sayfa açılır)", "查看示例报告（打开新页面）")}</Link>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-[var(--cf-muted)]">{t("Information and research support only. LogiVisa does not provide migration advice or determine visa eligibility.", "Yalnızca bilgi ve araştırma desteği. LogiVisa göçmenlik danışmanlığı sunmaz ve vize uygunluğunu belirlemez.", "仅提供信息与研究支持。LogiVisa 不提供移民建议，也不判定签证资格。")}</p>
        </div>
        <SampleReportDocument locale={locale} />
      </div>
    </section>
  );
}
