import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import visaDetails from "@/src/data/visa-details.json";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    metadataBase: new URL(BASE_URL),
    title: "Canada Immigration Visas and Pathways | LogiVisa",
    description: "Explore Canadian immigration streams under Express Entry, including FSWP, CEC, and FSTP.",
    alternates: {
      canonical: `/${locale}/visas/canada`,
      languages: {
        en: `/en/visas/canada`,
        tr: `/tr/visas/canada`,
        "zh-Hans": `/zh-Hans/visas/canada`,
      },
    },
  };
}

export default async function CanadaVisasPage({ params }: PageProps) {
  const { locale } = await params;
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";

  const visa = visaDetails.find((v) => v.subclass === "canada-express-entry");

  const title = isTr ? "Kanada Vize Yolları" : isZh ? "加拿大移民通道" : "Canada Visa Pathways";
  const subtitle = isTr 
    ? "Kanada'da daimi oturum sahibi olmak ve çalışmak için güncel vize seçeneklerini keşfedin." 
    : isZh 
    ? "探索在加拿大永久居留和工作的最新签证选择。" 
    : "Explore up-to-date visa options to work and settle permanently in Canada.";

  const viewDetailsLabel = isTr ? "Detayları İncele" : isZh ? "查看详情" : "View Details";

  if (!visa) return null;

  const visaName = isTr ? visa.name_tr : isZh ? visa.name_zh : visa.name;
  const visaDesc = isTr ? visa.description_tr : isZh ? visa.description_zh : visa.description;

  // Format fee dynamically (CAD)
  const feeText = new Intl.NumberFormat(locale === "zh-Hans" ? "zh-CN" : locale === "tr" ? "tr-TR" : "en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(visa.fee);

  const processingTimeText = isTr ? "Programa göre değişir" : isZh ? "视具体项目而定" : "Varies by program";

  return (
    <main className="min-h-screen bg-slate-50 pt-28 pb-20 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <span className="inline-block rounded-full border border-red-200 bg-red-50 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-red-600 dark:border-red-950/30 dark:bg-red-950/20 dark:text-red-400">
            CANADA
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            {title}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        </div>

        {/* Visas Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link 
            href={`/${locale}/visas/canada-express-entry`}
            className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-block rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-extrabold tracking-wider text-rose-755 dark:bg-rose-950/40 dark:text-rose-400">
                  Express Entry
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {visa.type}
                </span>
              </div>

              <h3 className="mt-4 text-xl font-bold text-slate-900 group-hover:text-rose-600 transition-colors dark:text-white dark:group-hover:text-rose-450">
                {visaName}
              </h3>
              <p className="mt-2.5 text-xs leading-relaxed text-slate-500 line-clamp-3 dark:text-slate-400">
                {visaDesc}
              </p>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4 dark:border-zinc-800">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>{processingTimeText}</span>
                </div>
                <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-zinc-300">
                  <span>{feeText}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end text-xs font-bold text-rose-600 group-hover:translate-x-1 transition-transform dark:text-rose-400">
                <span>{viewDetailsLabel}</span>
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
