import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import visaDetails from "@/src/data/visa-details.json";
import subclass186 from "@/src/data/visas/subclass-186.json";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

type PageProps = {
  params: Promise<{ locale: string }>;
};

type AustraliaVisaCard = {
  subclass: string;
  parentSubclass?: string;
  stream?: string;
  name: string;
  name_tr?: string;
  name_zh?: string;
  description: string;
  description_tr?: string;
  description_zh?: string;
  fee: number;
  type: string;
  type_tr?: string;
  type_zh?: string;
  processingTime: string;
  processingTime_tr?: string;
  processingTime_zh?: string;
  processingTimeUnit: string;
  processingTimeUnit_tr?: string;
  processingTimeUnit_zh?: string;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title =
    locale === "tr"
      ? "Avustralya Vizeleri ve Nitelikli Goc Yollari | LogiVisa"
      : locale === "zh-Hans"
        ? "澳大利亚签证与技术移民通道 | LogiVisa"
        : "Australia Visas and Skilled Pathways | LogiVisa";
  const description =
    locale === "tr"
      ? "189, 190, 491, 482, 485 ve partner vize yollari dahil baslica Avustralya vizelerini kesfedin."
      : locale === "zh-Hans"
        ? "查看澳大利亚主要签证通道，包括 189、190、491、482、485 及伴侣签证路径。"
        : "Explore all major Australian visas including subclass 189, 190, 491, 482, 485, and partner visa pathways.";
  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
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
const AU_PARENT_SUBCLASSES = ["186"];

export default async function AustraliaVisasPage({ params }: PageProps) {
  const { locale } = await params;
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";

  const allVisaData = [...(visaDetails as Array<Partial<AustraliaVisaCard>>), ...subclass186 as Array<Partial<AustraliaVisaCard>>];
  const visas = allVisaData.filter(
    (v): v is AustraliaVisaCard => typeof v.subclass === "string" && (
      AU_SUBCLASSES.includes(v.subclass) ||
      Boolean(v.parentSubclass && AU_PARENT_SUBCLASSES.includes(v.parentSubclass))
    )
  );

  const title = isTr ? "Avustralya Vize Yolları" : isZh ? "澳大利亚签证通道" : "Australia Visa Pathways";
  const subtitle = isTr
    ? "Avustralya'da eğitim almak, çalışmak veya yerleşmek için güncel vize seçeneklerini keşfedin."
    : isZh
    ? "探索在澳大利亚学习、工作或定居的最新签证选择。"
    : "Explore up-to-date visa options to study, work, or settle in Australia.";

  const viewDetailsLabel = isTr ? "Detayları İncele" : isZh ? "查看详情" : "View Details";
  const fromLabel = isTr ? "Baslangic" : isZh ? "起" : "From";
  const countryBadge = isTr ? "AVUSTRALYA" : isZh ? "澳大利亚" : "AUSTRALIA";
  const localizeType = (visa: AustraliaVisaCard) => {
    if (isTr) {
      return (
        visa.type_tr ??
        ({
          Permanent: "Kalici",
          Temporary: "Gecici",
          "Provisional (5 years)": "Gecici (5 yil)",
          "Temporary (2-6 years)": "Gecici (2-6 yil)",
          "Temporary (course duration)": "Gecici (kurs suresi)",
          "Temporary (up to 4 years; up to 5 for some Hong Kong passport holders)": "Gecici (4 yila kadar; bazi Hong Kong pasaportlulari icin 5 yil)",
        } as Record<string, string>)[visa.type] ??
        visa.type
      );
    }
    if (isZh) {
      return (
        visa.type_zh ??
        ({
          Permanent: "永久",
          Temporary: "临时",
          "Provisional (5 years)": "临时（5年）",
          "Temporary (2-6 years)": "临时（2-6年）",
          "Temporary (course duration)": "临时（课程期间）",
          "Temporary (up to 4 years; up to 5 for some Hong Kong passport holders)": "临时（最长4年；部分香港护照持有人最长5年）",
        } as Record<string, string>)[visa.type] ??
        visa.type
      );
    }
    return visa.type;
  };
  const localizeProcessing = (visa: AustraliaVisaCard) => {
    const baseText = isTr ? visa.processingTime_tr ?? visa.processingTime : isZh ? visa.processingTime_zh ?? visa.processingTime : visa.processingTime;
    const text =
      isTr && baseText === "Varies (see processing time guide)"
        ? "Degisken (islem suresi rehberine bakin)"
        : isZh && baseText === "Varies (see processing time guide)"
          ? "视情况而定（参见审理时间指南）"
          : baseText;
    const unit = isTr
      ? visa.processingTimeUnit_tr ?? (visa.processingTimeUnit === "months" ? "ay" : visa.processingTimeUnit)
      : isZh
        ? visa.processingTimeUnit_zh ?? (visa.processingTimeUnit === "months" ? "个月" : visa.processingTimeUnit)
        : visa.processingTimeUnit;
    return `${text}${unit ? ` ${unit}` : ""}`;
  };

  return (
    <main className="min-h-screen bg-slate-50 pb-20 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <span className="inline-block rounded-full border border-blue-200 bg-blue-50 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-blue-600 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-400">
            {countryBadge}
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
                      {v.parentSubclass
                        ? `Subclass ${v.parentSubclass}`
                        : `Subclass ${v.subclass.replace("_", "/")}`}
                      {v.stream && <span className="ml-1 font-semibold opacity-70">· {v.stream}</span>}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">{localizeType(v)}</span>
                  </div>

                  <h3 className="mt-4 text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors dark:text-white dark:group-hover:text-indigo-400">{visaName}</h3>
                  <p className="mt-2.5 text-xs leading-relaxed text-slate-500 line-clamp-3 dark:text-slate-400">{visaDesc}</p>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4 dark:border-zinc-800">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{localizeProcessing(v)}</span>
                    </div>
                    <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-zinc-300"><span>{fromLabel} {feeText}</span></div>
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

