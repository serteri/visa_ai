import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ExternalLink, BadgeCheck, Clock3, DollarSign, ListChecks, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VisaPdfDownloadCard } from "@/components/visa-pdf-download-card";
import { getTranslations } from "@/lib/i18n/get-translations";
import type { Locale } from "@/lib/i18n/config";
import visaDetails from "@/src/data/visa-details.json";
import subclass186Raw from "@/src/data/visas/subclass-186.json";

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
  processingTime_tr?: string;
  processingTime_zh?: string;
  processingTimeUnit: string;
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
  pdfSnapshotUrls?: string[];
  feeConcessions?: Array<{
    label: string;
    label_tr?: string;
    label_zh?: string;
    amount: number;
  }>;
  pacificConcession?: {
    effectiveDate: string;
    note: string;
    note_tr?: string;
    note_zh?: string;
    eligibleCountries: string[];
    eligibleCountries_tr?: string[];
    eligibleCountries_zh?: string[];
  };
  secondInstalment?: {
    amount: number;
    note: string;
    note_tr?: string;
    note_zh?: string;
  };
  csit?: {
    effectiveDate: string;
    amount: number;
    previousAmount: number;
    note: string;
    note_tr?: string;
    note_zh?: string;
  };
  ageRequirement?: {
    standardMaxAge: number;
    extendedMaxAge: number;
    note: string;
    note_tr?: string;
    note_zh?: string;
  };
  englishRequirements?: {
    effectiveDate: string;
    note: string;
    note_tr?: string;
    note_zh?: string;
    tests: Array<{ test: string; score: string }>;
  };
  concession2026?: {
    effectiveDate: string;
    note: string;
    note_tr?: string;
    note_zh?: string;
    pacificCountries: string[];
    pacificCountries_tr?: string[];
    pacificCountries_zh?: string[];
    aseanCountries: string[];
    aseanCountries_tr?: string[];
    aseanCountries_zh?: string[];
  };
};

const VISA_DETAILS: VisaDetail[] = [
  ...(visaDetails as VisaDetail[]),
  ...(subclass186Raw as Array<Record<string, unknown>>).map((v) => ({
    ...v,
    nameKey: `visa${String(v.subclass).replace(/[^a-zA-Z0-9]/g, "")}`,
    officialUrl: v.sourceUrl,
    processingTimeUnit: "",
    secondInstalment: typeof v.secondInstallmentFee === "number"
      ? { amount: v.secondInstallmentFee, note: v.secondInstallmentTrigger }
      : undefined,
  })) as VisaDetail[],
];
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

export const dynamic = "force-static";
export const revalidate = false;

const VISA_SUBCLASSES = ["189", "190", "491", "482", "485", "500", "820", "801", "canada-express-entry", "186_direct_entry", "186_labour_agreement", "186_trt"] as const;

function normalizeSubclass(subclass: string) {
  const value = subclass.trim();
  // Legacy combined route/links — redirect to the temporary (entry-point) visa.
  if (value === "820_801" || value === "820/801" || value === "820-801") return "820";
  return value;
}

function getVisaDetail(subclass: string) {
  return VISA_DETAILS.find((visa) => visa.subclass === normalizeSubclass(subclass)) ?? null;
}

function formatFee(locale: string, fee: number, subclass: string) {
  const isCanada = subclass === "canada-express-entry";
  return new Intl.NumberFormat(locale === "zh-Hans" ? "zh-CN" : locale === "tr" ? "tr-TR" : (isCanada ? "en-CA" : "en-AU"), {
    style: "currency",
    currency: isCanada ? "CAD" : "AUD",
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

function getLocalizedFeeConcessionLabel(
  concession: NonNullable<VisaDetail["feeConcessions"]>[number],
  locale: string
) {
  if (locale === "tr") return concession.label_tr ?? concession.label;
  if (locale === "zh-Hans") return concession.label_zh ?? concession.label;
  return concession.label;
}

function getLocalizedPacificNote(pacificConcession: NonNullable<VisaDetail["pacificConcession"]>, locale: string) {
  if (locale === "tr") return pacificConcession.note_tr ?? pacificConcession.note;
  if (locale === "zh-Hans") return pacificConcession.note_zh ?? pacificConcession.note;
  return pacificConcession.note;
}

function getLocalizedEligibleCountries(
  pacificConcession: NonNullable<VisaDetail["pacificConcession"]>,
  locale: string
) {
  if (locale === "tr") return pacificConcession.eligibleCountries_tr ?? pacificConcession.eligibleCountries;
  if (locale === "zh-Hans") return pacificConcession.eligibleCountries_zh ?? pacificConcession.eligibleCountries;
  return pacificConcession.eligibleCountries;
}

function getLocalizedConcession2026Note(concession: NonNullable<VisaDetail["concession2026"]>, locale: string) {
  if (locale === "tr") return concession.note_tr ?? concession.note;
  if (locale === "zh-Hans") return concession.note_zh ?? concession.note;
  return concession.note;
}

function getLocalizedPacificCountries2026(concession: NonNullable<VisaDetail["concession2026"]>, locale: string) {
  if (locale === "tr") return concession.pacificCountries_tr ?? concession.pacificCountries;
  if (locale === "zh-Hans") return concession.pacificCountries_zh ?? concession.pacificCountries;
  return concession.pacificCountries;
}

function getLocalizedAseanCountries(concession: NonNullable<VisaDetail["concession2026"]>, locale: string) {
  if (locale === "tr") return concession.aseanCountries_tr ?? concession.aseanCountries;
  if (locale === "zh-Hans") return concession.aseanCountries_zh ?? concession.aseanCountries;
  return concession.aseanCountries;
}

function getLocalizedSecondInstalmentNote(secondInstalment: NonNullable<VisaDetail["secondInstalment"]>, locale: string) {
  if (locale === "tr") return secondInstalment.note_tr ?? secondInstalment.note;
  if (locale === "zh-Hans") return secondInstalment.note_zh ?? secondInstalment.note;
  return secondInstalment.note;
}

function getLocalizedCsitNote(csit: NonNullable<VisaDetail["csit"]>, locale: string) {
  if (locale === "tr") return csit.note_tr ?? csit.note;
  if (locale === "zh-Hans") return csit.note_zh ?? csit.note;
  return csit.note;
}

function getLocalizedAgeRequirementNote(ageRequirement: NonNullable<VisaDetail["ageRequirement"]>, locale: string) {
  if (locale === "tr") return ageRequirement.note_tr ?? ageRequirement.note;
  if (locale === "zh-Hans") return ageRequirement.note_zh ?? ageRequirement.note;
  return ageRequirement.note;
}

function getLocalizedEnglishRequirementsNote(
  englishRequirements: NonNullable<VisaDetail["englishRequirements"]>,
  locale: string
) {
  if (locale === "tr") return englishRequirements.note_tr ?? englishRequirements.note;
  if (locale === "zh-Hans") return englishRequirements.note_zh ?? englishRequirements.note;
  return englishRequirements.note;
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

function getProcessingTimeText(visa: VisaDetail, locale: string, translations: Record<string, unknown>) {
  const isVaries = visa.processingTime.toLowerCase().includes("varies");
  if (isVaries) {
    if (locale === "tr") return visa.processingTime_tr ?? "Programa göre değişir";
    if (locale === "zh-Hans") return visa.processingTime_zh ?? "视具体项目而定";
    return visa.processingTime;
  }
  const processingTimeUnit = t(translations, `timeUnits.${visa.processingTimeUnit}`, visa.processingTimeUnit);
  return `${visa.processingTime} ${processingTimeUnit}`.trim();
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
  const visitOfficialWebsiteLabel = t(translations, "visas.visitOfficialWebsite", "Visit official website");
  const visitIRCCLabel = t(translations, "visas.visitIRCC", locale === "tr" ? "IRCC Sitesini Ziyaret Et" : locale === "zh-Hans" ? "访问 IRCC 官网" : "Visit IRCC website");
  const backToVisasLabel = t(translations, "visas.backToVisas", "Back to visas");
  const processingTimeLabel = t(translations, "visas.processingTime", "Processing Time");
  const processingTimeText = getProcessingTimeText(visa, locale, translations);
  const visaFeeLabel = t(translations, "visas.visaFee", "Visa Fee");
  const minPointsLabel = t(translations, "visas.minPoints", "Minimum Points");
  const notRequiredLabel = t(translations, "visas.notRequired", "Not required");
  const requirements = getLocalizedVisaList(visa, locale, "requirements");
  const steps = getLocalizedVisaList(visa, locale, "steps");
  const officialUrl = visa.officialUrl;
  const pdfSnapshotUrls = visa.pdfSnapshotUrls?.filter((url) => Boolean(url)) ?? [];
  const fee = formatFee(locale, visa.fee, subclass);
  const minPointsText = getMinPointsLabel(translations, visa.minPoints);
  const feeConcessions = visa.feeConcessions ?? [];
  const pacificConcession = visa.pacificConcession;
  const feeConcessionsTitle = t(translations, "visas.feeConcessionsTitle", "Fee Concessions");
  const pacificConcessionTitle = t(
    translations,
    "visas.pacificConcessionTitle",
    "1 July 2026 Pacific & Timor-Leste Concession"
  );
  const eligibleCountriesLabel = t(translations, "visas.eligibleCountriesLabel", "Eligible passport countries");
  const concession2026 = visa.concession2026;
  const concession2026Title = t(
    translations,
    "visas.concession2026Title",
    "1 July 2026 Concessions & Exemptions"
  );
  const pacificCountriesLabel = t(translations, "visas.pacificCountriesLabel", "Pacific Island & Timor-Leste");
  const aseanCountriesLabel = t(translations, "visas.aseanCountriesLabel", "ASEAN");
  const secondInstalment = visa.secondInstalment;
  const secondInstalmentTitle = t(translations, "visas.secondInstalmentTitle", "Second Instalment Charge");
  const csit = visa.csit;
  const csitTitle = t(translations, "visas.csitTitle", "Core Skills Income Threshold (CSIT)");
  const ageRequirement = visa.ageRequirement;
  const ageRequirementTitle = t(translations, "visas.ageRequirementTitle", "Age Requirement");
  const englishRequirements = visa.englishRequirements;
  const englishRequirementsTitle = t(translations, "visas.englishRequirementsTitle", "English Language Requirement");
  const testLabel = t(translations, "visas.testLabel", "Test");
  const minimumScoreLabel = t(translations, "visas.minimumScoreLabel", "Minimum Score");

  const isCanada = subclass === "canada-express-entry";
  const officialBtnLabel = isCanada ? visitIRCCLabel : visitOfficialWebsiteLabel;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link
            href={`/${locale}/visas`}
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
                  <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                    {processingTimeText}
                  </p>
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
                  {officialBtnLabel}
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
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                  {processingTimeText}
                </p>
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
                <a
                  href={officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 break-all text-sm font-medium text-cyan-700 dark:text-cyan-300"
                >
                  {officialUrl}
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        {(feeConcessions.length > 0 ||
          pacificConcession ||
          concession2026 ||
          secondInstalment ||
          csit ||
          ageRequirement ||
          englishRequirements) && (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {ageRequirement && (
              <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <BadgeCheck className="h-5 w-5 text-cyan-600" />
                    {ageRequirementTitle}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-xl bg-slate-100 px-4 py-2 text-lg font-bold text-slate-950 dark:bg-slate-800 dark:text-white">
                      {ageRequirement.standardMaxAge}
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">→</span>
                    <span className="rounded-xl bg-slate-100 px-4 py-2 text-lg font-bold text-slate-950 dark:bg-slate-800 dark:text-white">
                      {ageRequirement.extendedMaxAge}
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
                    {getLocalizedAgeRequirementNote(ageRequirement, locale)}
                  </p>
                </CardContent>
              </Card>
            )}

            {englishRequirements && (
              <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <CardHeader>
                  <CardTitle className="text-xl">{englishRequirementsTitle}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800">
                        <th className="pb-2">{testLabel}</th>
                        <th className="pb-2">{minimumScoreLabel}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {englishRequirements.tests.map((row) => (
                        <tr key={row.test} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                          <td className="py-2 font-medium text-slate-900 dark:text-white">{row.test}</td>
                          <td className="py-2 text-slate-700 dark:text-slate-300">{row.score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {getLocalizedEnglishRequirementsNote(englishRequirements, locale)}
                  </p>
                </CardContent>
              </Card>
            )}

            {csit && (
              <Card className="border-cyan-300 bg-cyan-50 shadow-sm lg:col-span-2 dark:border-cyan-700 dark:bg-cyan-950/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl text-cyan-900 dark:text-cyan-200">
                    <DollarSign className="h-5 w-5" />
                    {csitTitle}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-4">
                  <p className="max-w-2xl text-sm leading-6 text-cyan-900 dark:text-cyan-100">
                    {getLocalizedCsitNote(csit, locale)}
                  </p>
                  <span className="shrink-0 rounded-xl bg-cyan-100 px-4 py-2 text-lg font-bold text-cyan-900 dark:bg-cyan-900/40 dark:text-cyan-100">
                    {formatFee(locale, csit.amount, subclass)}
                  </span>
                </CardContent>
              </Card>
            )}

            {secondInstalment && (
              <Card className="border-amber-300 bg-amber-50 shadow-sm lg:col-span-2 dark:border-amber-700 dark:bg-amber-950/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl text-amber-900 dark:text-amber-200">
                    <DollarSign className="h-5 w-5" />
                    {secondInstalmentTitle}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-4">
                  <p className="max-w-2xl text-sm leading-6 text-amber-900 dark:text-amber-100">
                    {getLocalizedSecondInstalmentNote(secondInstalment, locale)}
                  </p>
                  <span className="shrink-0 rounded-xl bg-amber-100 px-4 py-2 text-lg font-bold text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
                    {formatFee(locale, secondInstalment.amount, subclass)}
                  </span>
                </CardContent>
              </Card>
            )}

            {feeConcessions.length > 0 && (
              <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <DollarSign className="h-5 w-5 text-cyan-600" />
                    {feeConcessionsTitle}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {feeConcessions.map((concession) => (
                      <li
                        key={concession.label}
                        className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950/60"
                      >
                        <span className="text-slate-700 dark:text-slate-300">
                          {getLocalizedFeeConcessionLabel(concession, locale)}
                        </span>
                        <span className="shrink-0 font-bold text-slate-950 dark:text-white">
                          {formatFee(locale, concession.amount, subclass)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {pacificConcession && (
              <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <CardHeader>
                  <CardTitle className="text-xl">{pacificConcessionTitle}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
                    {getLocalizedPacificNote(pacificConcession, locale)}
                  </p>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {eligibleCountriesLabel}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
                      {getLocalizedEligibleCountries(pacificConcession, locale).join(" · ")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {concession2026 && (
              <Card className="border-slate-200 bg-white shadow-sm lg:col-span-2 dark:border-slate-800 dark:bg-slate-900">
                <CardHeader>
                  <CardTitle className="text-xl">{concession2026Title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
                    {getLocalizedConcession2026Note(concession2026, locale)}
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {pacificCountriesLabel}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
                        {getLocalizedPacificCountries2026(concession2026, locale).join(" · ")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {aseanCountriesLabel}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
                        {getLocalizedAseanCountries(concession2026, locale).join(" · ")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        {pdfSnapshotUrls.length > 0 ? (
          <div className="mb-6">
            <VisaPdfDownloadCard
              pdfUrls={pdfSnapshotUrls}
              sourceUrl={officialUrl}
              title={isCanada ? "Canada Express Entry Official Guide (PDF)" : "Official Migration Guide (PDF)"}
              description={
                isCanada
                  ? t(translations, "visas.checkEligibilityDesc", "Open the official Canada immigration guide snapshot hosted on Vercel Blob.")
                  : "Open the official guide snapshot hosted on Vercel Blob and keep the source handy."
              }
              primaryLabel="Open PDF"
              sourceLabel={visitOfficialWebsiteLabel}
            />
          </div>
        ) : null}

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
