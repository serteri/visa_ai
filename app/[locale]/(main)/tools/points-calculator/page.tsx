import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass, Shield } from "lucide-react";
import { getTranslations } from "@/lib/i18n/get-translations";
import type { Locale } from "@/lib/i18n/config";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = new URL(BASE_URL);

  return {
    metadataBase: siteUrl,
    title: "Visa Points Calculator Hub 2026 | Australia & Canada | LogiVisa",
    description:
      "Calculate your immigration points for Australia (Skilled Migration) and Canada (Express Entry) instantly.",
    alternates: {
      canonical: `/${locale}/tools/points-calculator`,
      languages: {
        en: `/en/tools/points-calculator`,
        tr: `/tr/tools/points-calculator`,
        "zh-Hans": `/zh-Hans/tools/points-calculator`,
      },
    },
    openGraph: {
      title: "Visa Points Calculator Hub 2026 | Australia & Canada | LogiVisa",
      description:
        "Calculate your immigration points for Australia (Skilled Migration) and Canada (Express Entry) instantly.",
      type: "website",
      url: `/${locale}/tools/points-calculator`,
      images: [{ url: "/og/default-og.png", width: 1200, height: 630 }],
    },
  };
}

export default async function PointsCalculatorHubPage({ params }: PageProps) {
  const { locale } = await params;
  const translations = await getTranslations(locale as Locale);
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";

  const title = isTr 
    ? "Göçmenlik Puan Hesaplama Merkezi" 
    : isZh 
    ? "移民积分计算中心" 
    : "Immigration Points Calculator Hub";

  const subtitle = isTr 
    ? "Avustralya veya Kanada göçmenlik puanlarınızı güncel kurallara göre saniyeler içinde hesaplayın." 
    : isZh 
    ? "根据2026年最新政策，快速评估您的澳大利亚或加拿大移民积分。" 
    : "Calculate your visa points for Australia or Canada based on the latest 2026 immigration rules.";

  const auTitle = isTr ? "Avustralya Puan Testi" : isZh ? "澳大利亚积分评估" : "Australia Points Test";
  const auDesc = isTr 
    ? "Subclass 189, 190 ve 491 vizeleri için genel yetenek puanınızı hesaplayın." 
    : isZh 
    ? "评估 189、190 和 491 签证的技术移民积分。" 
    : "Calculate your points score for Subclass 189, 190, and 491 GSM visas.";

  const caTitle = isTr ? "Kanada Express Entry" : isZh ? "加拿大快速通道" : "Canada Express Entry";
  const caDesc = isTr 
    ? "Kapsamlı Sıralama Sistemi (CRS) kullanarak Express Entry puanınızı hesaplayın." 
    : isZh 
    ? "采用综合排名系统 (CRS) 计算您的加拿大快速通道分数。" 
    : "Calculate your CRS score for Express Entry skilled worker streams.";

  const ctaBtn = isTr ? "Puanını Hesapla" : isZh ? "开始计算" : "Calculate Points";

  return (
    <main className="min-h-screen bg-slate-50 pb-20 dark:bg-zinc-950">
      {/* Ambient backgrounds */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-blue-200/25 blur-[120px] dark:bg-blue-900/10" />
        <div className="absolute top-1/2 right-1/4 h-[400px] w-[400px] rounded-full bg-indigo-200/20 blur-[100px] dark:bg-indigo-900/10" />
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <span className="inline-block rounded-full border border-blue-200 bg-blue-50 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-blue-600 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-400">
            {isTr ? "ARAÇLAR" : isZh ? "工具" : "TOOLS"}
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            {title}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Australia Card */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-gray-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="absolute top-0 right-0 -mt-6 -mr-6 h-28 w-28 rounded-full bg-gradient-to-br from-blue-500/10 to-indigo-500/10 blur-xl group-hover:scale-150 transition-all duration-300" />
            <div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                <Compass className="h-6 w-6" />
              </div>
              <h2 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">
                {auTitle}
              </h2>
              <p className="mt-3 text-slate-500 dark:text-slate-400">
                {auDesc}
              </p>
            </div>
            <div className="mt-8">
              <Link href={`/${locale}/tools/points-calculator/australia`}>
                <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-semibold text-white shadow-md hover:from-blue-700 hover:to-indigo-750 transition-all">
                  <span>{ctaBtn}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </div>
          </div>

          {/* Canada Card */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-gray-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="absolute top-0 right-0 -mt-6 -mr-6 h-28 w-28 rounded-full bg-gradient-to-br from-red-500/10 to-rose-500/10 blur-xl group-hover:scale-150 transition-all duration-300" />
            <div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                <Shield className="h-6 w-6" />
              </div>
              <h2 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">
                {caTitle}
              </h2>
              <p className="mt-3 text-slate-500 dark:text-slate-400">
                {caDesc}
              </p>
            </div>
            <div className="mt-8">
              <Link href={`/${locale}/tools/points-calculator/canada`}>
                <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 py-3 text-sm font-semibold text-white shadow-md hover:from-rose-700 hover:to-red-750 transition-all">
                  <span>{ctaBtn}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
