import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Globe2 } from "lucide-react";
import { activeCountries, countryLabels } from "@/lib/countries";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = new URL(BASE_URL);

  return {
    metadataBase: siteUrl,
    title: "Get Your Free Visa Readiness Report | LogiVisa",
    description: "Choose your destination country and get a free, structured visa readiness report.",
    alternates: {
      canonical: `/${locale}/reports`,
      languages: {
        en: `/en/reports`,
        tr: `/tr/reports`,
        "zh-Hans": `/zh-Hans/reports`,
      },
    },
  };
}

export default async function ReportsCountrySelectPage({ params }: PageProps) {
  const { locale } = await params;
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";

  const title = isTr
    ? "Önce hedef ülkenizi seçin"
    : isZh
      ? "请先选择您的目标国家"
      : "Choose your destination country";

  const subtitle = isTr
    ? "Hangi ülke için ücretsiz hazırlık raporu istiyorsunuz?"
    : isZh
      ? "您希望针对哪个国家生成免费准备度报告？"
      : "Which country would you like your free readiness report for?";

  const ctaBtn = isTr ? "Devam Et" : isZh ? "继续" : "Continue";

  return (
    <main className="min-h-screen bg-slate-50 pb-20 dark:bg-zinc-950">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-indigo-200/25 blur-[120px] dark:bg-indigo-900/10" />
        <div className="absolute top-1/2 right-1/4 h-[400px] w-[400px] rounded-full bg-purple-200/20 blur-[100px] dark:bg-purple-900/10" />
      </div>

      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <span className="inline-block rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:border-indigo-900/30 dark:bg-indigo-950/20 dark:text-indigo-400">
            {isTr ? "ÜCRETSİZ RAPOR" : isZh ? "免费报告" : "FREE REPORT"}
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            {title}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          {activeCountries.map((code) => (
            <div
              key={code}
              className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-gray-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="absolute top-0 right-0 -mt-6 -mr-6 h-28 w-28 rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 blur-xl transition-all duration-300 group-hover:scale-150" />
              <div>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                  <Globe2 className="h-6 w-6" />
                </div>
                <h2 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">
                  {countryLabels[code][isTr ? "tr" : isZh ? "zh-Hans" : "en"]}
                </h2>
              </div>
              <div className="mt-8">
                <Link href={`/${locale}/full-check?country=${code}`}>
                  <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3 text-sm font-semibold text-white shadow-md transition-all hover:from-indigo-600 hover:to-purple-700">
                    <span>{ctaBtn}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
