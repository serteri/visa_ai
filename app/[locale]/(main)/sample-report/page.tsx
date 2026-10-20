import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SampleReportDocument } from "@/components/landing/SampleReportDocument";
import { ASSESSMENT_PRICE_LABEL } from "@/components/landing/AssessmentSection";
import { activeLocales, isValidLocale } from "@/lib/i18n/config";
import { researchText } from "@/lib/marketing/research-journey";
import { publicPath } from "@/lib/seo/urls";

type PageProps = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return activeLocales.map((locale) => ({ locale }));
}

// A product preview, not search content: static fictional mock, kept out of the index and out of the sitemap on purpose.
export const metadata: Metadata = { title: "Sample Assessment Report", robots: { index: false, follow: true }, referrer: "no-referrer" };

export default async function SampleReportPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const t = (en: string, tr: string, zh: string) => researchText(locale, en, tr, zh);
  return (
    <main className="case-file min-h-screen bg-[var(--cf-bg)] pb-16 pt-28">
      <div className="section-shell mx-auto max-w-3xl">
        <h1 className="cf-serif text-3xl text-[var(--cf-fg)] sm:text-4xl">{t("Sample Assessment report", "Örnek Değerlendirme raporu", "评估报告示例")}</h1>
        <p className="mt-4 text-base leading-relaxed text-[var(--cf-muted)]">{t("This page shows the structure of a LogiVisa Assessment report using fictional example information. Viewing it does not require payment or an account.", "Bu sayfa, kurgusal örnek bilgilerle bir LogiVisa Değerlendirme raporunun yapısını gösterir. Görüntülemek için ödeme veya hesap gerekmez.", "本页使用虚构示例信息展示 LogiVisa 评估报告的结构。查看无需付款或账户。")}</p>
        <div className="mt-8"><SampleReportDocument locale={locale} full /></div>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link href={publicPath(locale, "/full-check")} data-assessment-entry="sample_report_page" className="inline-flex min-h-12 items-center rounded-full bg-[var(--cf-accent)] px-6 py-3 text-sm font-semibold text-white">{t("Start Assessment", "Değerlendirme Başlat", "开始评估")} <span aria-hidden className="ml-3">→</span></Link>
          <span className="text-sm text-[var(--cf-muted)]">{ASSESSMENT_PRICE_LABEL} {t("including GST", "GST dahil", "含 GST")}</span>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-[var(--cf-muted)]">{t("Information and research support only. LogiVisa does not provide migration advice or determine visa eligibility.", "Yalnızca bilgi ve araştırma desteği. LogiVisa göçmenlik danışmanlığı sunmaz ve vize uygunluğunu belirlemez.", "仅提供信息与研究支持。LogiVisa 不提供移民建议，也不判定签证资格。")}</p>
      </div>
    </main>
  );
}
