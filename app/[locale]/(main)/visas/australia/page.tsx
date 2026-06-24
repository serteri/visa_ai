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
    title: "Australia Visas and Skilled Pathways | LogiVisa",
    description: "Explore all major Australian visas including subclass 189, 190, 491, 482, 485, and partner visa pathways.",
    alternates: {
      canonical: `/${locale}/visas/australia`,
      languages: {
        en: `/en/visas/australia`,
        tr: `/tr/visas/australia`,
        "zh-Hans": `/zh-Hans/visas/australia`,
      },
    },
  };
}

const AU_SUBCLASSES = ["189", "190", "491", "482", "485", "500", "820", "801"];

export default async function AustraliaVisasPage({ params }: PageProps) {
  const { locale } = await params;
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";

  const visas = visaDetails.filter((v) => AU_SUBCLASSES.includes(v.subclass));

  const title = isTr ? "Avustralya Vize Yolları" : isZh ? "澳大利亚签证通道" : "Australia Visa Pathways";
  const subtitle = isTr
    ? "Avustralya'da eğitim almak, çalışmak veya yerleşmek için güncel vize seçeneklerini keşfedin."
    : isZh
    ? "探索在澳大利亚学习、工作或定居的最新签证选择。"
    : "Explore up-to-date visa options to study, work, or settle in Australia.";

  const viewDetailsLabel = isTr ? "Detayları İncele" : isZh ? "查看详情" : "View Details";

  return (
    <main className="min-h-screen bg-slate-50 pt-28 pb-20 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <span className="inline-block rounded-full border border-blue-200 bg-blue-50 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-blue-600 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-400">
            AUSTRALIA
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">{title}</h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>

        {/* Visas Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visas.map((v) => {
            const visaName = isTr ? v.name_tr : isZh ? v.name_zh : v.name;
            const visaDesc = isTr ? v.description_tr : isZh ? v.description_zh : v.description;

            // Format fee dynamically
            const feeText = new Intl.NumberFormat(locale === "zh-Hans" ? "zh-CN" : locale === "tr" ? "tr-TR" : "en-AU", {
              style: "currency",
              currency: "AUD",
              maximumFractionDigits: 0,
            }).format(v.fee);

            return (
              <Link
                key={v.subclass}
                href={`/${locale}/visas/${v.subclass}`}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-block rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-extrabold tracking-wider text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">
                      Subclass {v.subclass.replace("_", "/")}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">{v.type}</span>
                  </div>

                  <h3 className="mt-4 text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors dark:text-white dark:group-hover:text-indigo-400">{visaName}</h3>
                  <p className="mt-2.5 text-xs leading-relaxed text-slate-500 line-clamp-3 dark:text-slate-400">{visaDesc}</p>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4 dark:border-zinc-800">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{v.processingTime} {v.processingTimeUnit}</span>
                    </div>
                    <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-zinc-300"><span>From {feeText}</span></div>
                  </div>

                  <div className="mt-4 flex items-center justify-end text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform dark:text-indigo-400">
                    <span>{viewDetailsLabel}</span>
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}

