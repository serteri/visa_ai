import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ExternalLink, BadgeCheck, Clock3, DollarSign, ListChecks, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTranslations } from "@/lib/i18n/get-translations";
import type { Locale } from "@/lib/i18n/config";
import visaDetails from "@/src/data/visa-details.json";

type PageProps = {
  params: Promise<{ locale: string; subclass: string }>;
};

type VisaDetail = {
  subclass: string;
  name: string;
  name_tr?: string;
  name_zh?: string;
  nameKey: string;
  type: string;
  processingTime: string;
  fee: number;
  minPoints: number | null;
  description: string;
  description_tr?: string;
  description_zh?: string;
  requirements: string[];
  requirements_tr?: string[];
  requirements_zh?: string[];
  steps: string[];
  steps_tr?: string[];
  steps_zh?: string[];
  officialUrl: string;
};

const VISA_DETAILS = visaDetails as VisaDetail[];
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

export const dynamic = "force-static";
export const revalidate = false;

const VISA_SUBCLASSES = ["189", "190", "491", "482", "485", "500", "820_801"] as const;

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

function resolveNestedTranslation(translations: Record<string, unknown>, key: string) {
  return key.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    return (current as Record<string, unknown>)[segment];
  }, translations);
}

function t(translations: Record<string, unknown>, key: string, defaultValue?: string) {
  const value = resolveNestedTranslation(translations, key);
  return typeof value === "string" ? value : defaultValue || key;
}

function getLocalizedVisaName(visa: VisaDetail, locale: string) {
  if (locale === "tr") return visa.name_tr ?? visa.name;
  if (locale === "zh-Hans") return visa.name_zh ?? visa.name;
  return visa.name;
}

function getLocalizedVisaDescription(visa: VisaDetail, locale: string) {
  if (locale === "tr") return visa.description_tr ?? visa.description;
  if (locale === "zh-Hans") return visa.description_zh ?? visa.description;
  return visa.description;
}

function getLocalizedVisaList(visa: VisaDetail, locale: string, key: "requirements" | "steps") {
  if (locale === "tr") return visa[`${key}_tr` as const] ?? visa[key];
  if (locale === "zh-Hans") return visa[`${key}_zh` as const] ?? visa[key];
  return visa[key];
}

function getVisaTypeLabel(translations: Record<string, unknown>, type: string) {
  const normalizedType = type.toLowerCase();
  if (normalizedType.includes("temporary then permanent")) {
    return t(translations, "visas.temporaryThenPermanent", "Temporary then Permanent");
  }
  if (normalizedType.includes("permanent")) {
    return t(translations, "visas.permanent", "Permanent");
  }
  return t(translations, "visas.temporary", "Temporary");
}

function getMinPointsLabel(translations: Record<string, unknown>, minPoints: number | null) {
  if (minPoints === null) {
    return t(translations, "visas.notRequired", "Not required");
  }
  return String(minPoints);
}

export function generateStaticParams() {
  return VISA_SUBCLASSES.map((subclass) => ({ subclass }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, subclass } = await params;
  const translations = await getTranslations(locale as Locale);
  const visa = getVisaDetail(subclass);

  if (!visa) {
    return {
      metadataBase: new URL(BASE_URL),
      title: t(translations, "visas.backToVisas", "Visa details"),
    };
  }

  const normalizedSubclass = normalizeSubclass(subclass);
  const visaName = t(translations, `visas.visa${normalizedSubclass}name`, getLocalizedVisaName(visa, locale));
  const visaDescription = t(translations, `visas.visa${normalizedSubclass}desc`, getLocalizedVisaDescription(visa, locale));
  const title = `${visaName} | LogiVisa Hub`;

  return {
    metadataBase: new URL(BASE_URL),
    title,
    description: visaDescription,
    alternates: {
      canonical: `/${locale}/visas/${visa.subclass}`,
      languages: {
        en: `/en/visas/${visa.subclass}`,
        tr: `/tr/visas/${visa.subclass}`,
        "zh-Hans": `/zh-Hans/visas/${visa.subclass}`,
      },
    },
    openGraph: {
      title,
      description: visaDescription,
      type: "website",
      url: `/${locale}/visas/${visa.subclass}`,
    },
  };
}

export default async function VisaSubclassPage({ params }: PageProps) {
  const { locale, subclass } = await params;
  const translations = await getTranslations(locale as Locale);
  const normalizedSubclass = normalizeSubclass(subclass);
  const visa = getVisaDetail(normalizedSubclass);

  if (!visa) notFound();

  const visaName = t(translations, `visas.visa${normalizedSubclass}name`, getLocalizedVisaName(visa, locale));
  const visaDescription = t(translations, `visas.visa${normalizedSubclass}desc`, getLocalizedVisaDescription(visa, locale));
  const visaType = getVisaTypeLabel(translations, visa.type);
  const requirementsLabel = t(translations, "visas.requirements", "Requirements");
  const applicationStepsLabel = t(translations, "visas.applicationSteps", "Application Steps");
  const officialInfoLabel = t(translations, "visas.officialInfo", "Official Information");
  const checkEligibilityLabel = t(translations, "visas.checkEligibility", "Check your eligibility");
  const checkEligibilityDesc = t(translations, "visas.checkEligibilityDesc", "Get your free PR readiness report");
  const visitDohaLabel = t(translations, "visas.visitDoHA", "Visit DoHA website");
  const backToVisasLabel = t(translations, "visas.backToVisas", "Back to visas");
  const processingTimeLabel = t(translations, "visas.processingTime", "Processing Time");
  const visaFeeLabel = t(translations, "visas.visaFee", "Visa Fee");
  const minPointsLabel = t(translations, "visas.minPoints", "Minimum Points");
  const notRequiredLabel = t(translations, "visas.notRequired", "Not required");
  const requirements = getLocalizedVisaList(visa, locale, "requirements");
  const steps = getLocalizedVisaList(visa, locale, "steps");
  const officialUrl = visa.officialUrl;
  const fee = formatFee(locale, visa.fee);
  const minPointsText = getMinPointsLabel(translations, visa.minPoints);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-28 sm:pt-32 dark:from-slate-950 dark:to-slate-900">
      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {backToVisasLabel}
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-100">
            <Sparkles className="h-4 w-4" />
            {officialInfoLabel}
          </div>
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
                    {visaType}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                    {visaName}
                  </h1>
                  <p className="max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
                    {visaDescription}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <DollarSign className="h-4 w-4 text-cyan-600" />
                    {visaFeeLabel}
                  </div>
                  <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{fee}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <Clock3 className="h-4 w-4 text-cyan-600" />
                    {processingTimeLabel}
                  </div>
                  <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{visa.processingTime}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <BadgeCheck className="h-4 w-4 text-cyan-600" />
                    {minPointsLabel}
                  </div>
                  <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{minPointsText}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href={`/${locale}/full-check`}>
                  <Button className="bg-cyan-600 text-white hover:bg-cyan-700">
                    <span>{checkEligibilityLabel}</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <a
                  href={officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                >
                  {visitDohaLabel}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>

              <p className="text-sm text-slate-500 dark:text-slate-400">{checkEligibilityDesc}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-xl">{officialInfoLabel}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {processingTimeLabel}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{visa.processingTime}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {visaFeeLabel}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{fee}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {minPointsLabel}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                  {visa.minPoints === null ? notRequiredLabel : minPointsText}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {officialInfoLabel}
                </p>
                <p className="mt-1 break-all text-sm font-medium text-cyan-700 dark:text-cyan-300">{officialUrl}</p>
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
                {requirementsLabel}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {requirements.map((item) => (
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
                {applicationStepsLabel}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {steps.map((item, index) => (
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
