import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ExternalLink, BadgeCheck, Clock3, DollarSign, ListChecks, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import visaDetails from "@/src/data/visa-details.json";

type PageProps = {
  params: Promise<{ locale: string; subclass: string }>;
};

type VisaDetail = {
  subclass: string;
  name: string;
  nameKey: string;
  type: string;
  processingTime: string;
  fee: number;
  minPoints: number | null;
  description: string;
  requirements: string[];
  steps: string[];
  officialUrl: string;
};

const VISA_DETAILS = visaDetails as VisaDetail[];
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

export const dynamic = "force-static";
export const revalidate = false;

const VISA_SUBCLASSES = ["189", "190", "491", "482", "485", "500", "820_801"] as const;

const OFFICIAL_DOHA_URLS: Record<string, string> = {
  "189": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-independent-189",
  "190": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-nominated-190",
  "491": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-work-regional-provisional-491",
  "482": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skills-in-demand-482",
  "485": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/temporary-graduate-485",
  "500": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
  "820_801": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/partner-onshore-820-801",
};

function txLocale(locale: string, zh: string, tr: string, en: string) {
  if (locale === "tr") return tr;
  if (locale === "zh-Hans") return zh;
  return en;
}

function normalizeSubclass(subclass: string) {
  const value = subclass.trim();
  if (value === "820/801" || value === "820-801") return "820_801";
  return value;
}

function getVisaDetail(subclass: string) {
  return VISA_DETAILS.find((visa) => visa.subclass === normalizeSubclass(subclass)) ?? null;
}

function formatFee(locale: string, fee: number) {
  return new Intl.NumberFormat(locale === "zh-Hans" ? "zh-CN" : locale === "tr" ? "tr-TR" : "en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(fee);
}

export function generateStaticParams() {
  return VISA_SUBCLASSES.map((subclass) => ({ subclass }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, subclass } = await params;
  const detail = getVisaDetail(subclass);

  if (!detail) {
    return {
      metadataBase: new URL(BASE_URL),
      title: txLocale(locale, "Vize bulunamadı", "Vize bulunamadı", "Visa not found"),
    };
  }

  const title = `${detail.name} | LogiVisa Hub`;
  const description = detail.description;

  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    alternates: {
      canonical: `/${locale}/visas/${detail.subclass}`,
      languages: {
        en: `/en/visas/${detail.subclass}`,
        tr: `/tr/visas/${detail.subclass}`,
        "zh-Hans": `/zh-Hans/visas/${detail.subclass}`,
      },
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/${locale}/visas/${detail.subclass}`,
    },
  };
}

export default async function VisaSubclassPage({ params }: PageProps) {
  const { locale, subclass } = await params;
  const normalizedSubclass = normalizeSubclass(subclass);
  const visa = getVisaDetail(normalizedSubclass);

  if (!visa) notFound();

  const officialUrl = visa.officialUrl || OFFICIAL_DOHA_URLS[normalizedSubclass];
  const fee = formatFee(locale, visa.fee);
  const minPointsText = visa.minPoints === null ? txLocale(locale, "不适用", "Uygulanmaz", "N/A") : String(visa.minPoints);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-28 sm:pt-32 dark:from-slate-950 dark:to-slate-900">
      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-100">
          <Sparkles className="h-4 w-4" />
          {txLocale(locale, "官方签证详情", "Resmi vize bilgisi", "Official visa details")}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                    {visa.subclass}
                  </Badge>
                  <Badge className="bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-100">
                    {visa.type}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                    {visa.name}
                  </h1>
                  <p className="max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
                    {visa.description}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <DollarSign className="h-4 w-4 text-cyan-600" />
                    {txLocale(locale, "签证费用", "Vize ücreti", "Visa fee")}
                  </div>
                  <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{fee}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <Clock3 className="h-4 w-4 text-cyan-600" />
                    {txLocale(locale, "处理时间", "İşlem süresi", "Processing time")}
                  </div>
                  <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{visa.processingTime}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <BadgeCheck className="h-4 w-4 text-cyan-600" />
                    {txLocale(locale, "最低分", "Minimum points", "Minimum points")}
                  </div>
                  <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{minPointsText}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href={`/${locale}/full-check`}>
                  <Button className="bg-cyan-600 text-white hover:bg-cyan-700">
                    {txLocale(locale, "检查你的资格", "Uygunluğunu kontrol et", "Check your eligibility")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <a
                  href={officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                >
                  {txLocale(locale, "查看官方 DoHA 页面", "Resmi DoHA sayfasını aç", "Official DoHA page")}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-xl">
                {txLocale(locale, "快速概览", "Hızlı özet", "Quick overview")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {txLocale(locale, "类别", "Kategori", "Category")}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{visa.type}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {txLocale(locale, "官方网址", "Resmi bağlantı", "Official link")}
                </p>
                <p className="mt-1 break-all text-sm font-medium text-cyan-700 dark:text-cyan-300">{officialUrl}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {txLocale(locale, "关键点数", "Kritik puan", "Key points")}
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {visa.minPoints === null
                    ? txLocale(locale, "不适用", "Uygulanmaz", "Not applicable")
                    : txLocale(locale, `至少 ${visa.minPoints} 分`, `${visa.minPoints} puan veya daha fazla`, `${visa.minPoints}+ points`)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ListChecks className="h-5 w-5 text-cyan-600" />
                {txLocale(locale, "要求", "Gereksinimler", "Requirements")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {visa.requirements.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ListChecks className="h-5 w-5 text-cyan-600" />
                {txLocale(locale, "申请步骤", "Başvuru adımları", "Application steps")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {visa.steps.map((item, index) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-xs font-bold text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-100">
                      {index + 1}
                    </span>
                    <span className="pt-0.5">{item}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
