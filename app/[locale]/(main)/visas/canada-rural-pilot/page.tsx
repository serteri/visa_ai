import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink, Languages, ListChecks, MapPinned, WalletCards } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VisaPdfDownloadCard } from "@/components/visa-pdf-download-card";
import pilotData from "@/src/data/countries/ca/rural-francophone-pilots.json";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

type PageProps = {
  params: Promise<{ locale: string }>;
};

type SharedData = {
  sourcePdfBlobUrl?: string;
  pathwayGroup?: string;
  structuralNote?: string;
  lastVerified?: string;
  sharedEligibilityCore?: string[];
  sharedProcessSteps?: Array<{ step: number; name: string; description?: string }>;
  sharedFees?: {
    currency?: string;
    processingFeeFrom?: number;
    lastIncreaseDate?: string;
    otherFeeCategories?: string[];
  };
  sharedDocuments?: {
    fillInPortal?: Array<{ form: string; name: string }>;
    conditionalForms?: Array<{ form: string; name: string; condition?: string }>;
    supportingDocuments?: string[];
    translationRule?: string;
  };
  afterApply?: {
    biometrics?: { ageRange?: string; deadline?: string; method?: string; note?: string };
    medicalExam?: { required?: boolean; appliesTo?: string; disqualifiers?: string[] };
    qualityAssuranceReview?: string;
    withdrawal?: string;
  };
  pilots?: Array<{
    id: string;
    name: string;
    purpose?: string;
    numberOfCommunities?: number;
    communities?: string[];
    pilotSpecificForms?: Array<{ form: string; name: string }>;
    languageRequirement?: string;
    optionalWorkPermit?: boolean;
    note?: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    metadataBase: new URL(BASE_URL),
    title: "Canada Rural Community Immigration Pilot (RCIP) | LogiVisa",
    description: "Rural Community Immigration Pilot details: eligibility, community list, process steps, documents, and fees.",
    alternates: {
      canonical: `/${locale}/visas/canada-rural-pilot`,
      languages: {
        en: "/en/visas/canada-rural-pilot",
        tr: "/tr/visas/canada-rural-pilot",
        "zh-Hans": "/zh-Hans/visas/canada-rural-pilot",
      },
    },
  };
}

export default async function CanadaRuralPilotPage({ params }: PageProps) {
  const { locale } = await params;
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";

  const data = pilotData as SharedData;
  const rcip = (data.pilots ?? []).find((pilot) => pilot.id === "rural_community_immigration_pilot");
  const overlapCommunities = ["Sudbury, ON", "Timmins, ON"];

  const feeText = new Intl.NumberFormat(locale === "zh-Hans" ? "zh-CN" : locale === "tr" ? "tr-TR" : "en-CA", {
    style: "currency",
    currency: data.sharedFees?.currency ?? "CAD",
    maximumFractionDigits: 0,
  }).format(data.sharedFees?.processingFeeFrom ?? 1590);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-28 sm:pt-32 dark:from-slate-950 dark:to-slate-900">
      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link
            href={`/${locale}/visas/canada`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {isTr ? "Kanada vizelerine don" : isZh ? "返回加拿大签证" : "Back to Canada visas"}
          </Link>
          <Badge className="bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-100">RCIP</Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100">Canada</Badge>
                  <Badge className="bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-100">Rural Community Immigration Pilot</Badge>
                </div>
                <div className="space-y-3">
                  <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                    {rcip?.name ?? "Rural Community Immigration Pilot (RCIP)"}
                  </h1>
                  <p className="max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
                    {rcip?.purpose}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{data.structuralNote}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Fee</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{feeText}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Communities</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{rcip?.numberOfCommunities ?? 14}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Process steps</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{data.sharedProcessSteps?.length ?? 6}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href={`/${locale}/full-check`}>
                  <Button className="bg-cyan-600 text-white hover:bg-cyan-700">
                    <span>{isTr ? "Uygunlugunu kontrol et" : isZh ? "检查你的资格" : "Check your eligibility"}</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link
                  href={`/${locale}/visas/canada-francophone-pilot`}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                >
                  View FCIP page
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-xl">Quick Facts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pathway group</p>
                <p className="mt-1 font-medium text-slate-900 dark:text-white">{data.pathwayGroup}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last verified</p>
                <p className="mt-1 font-medium text-slate-900 dark:text-white">{data.lastVerified}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Language requirement</p>
                <p className="mt-1 font-medium text-slate-900 dark:text-white">{rcip?.languageRequirement}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Optional work permit</p>
                <p className="mt-1 font-medium text-slate-900 dark:text-white">{rcip?.optionalWorkPermit ? "Yes" : "No"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-6 sm:px-6 lg:px-8">
        <VisaPdfDownloadCard
          pdfUrls={data.sourcePdfBlobUrl ? [data.sourcePdfBlobUrl] : []}
          title="Rural and Francophone Community Immigration pilots (Official PDF)"
          description="Official pilot reference PDF snapshot used by this visa page."
          primaryLabel={isTr ? "PDF Ac" : isZh ? "打开 PDF" : "Open PDF"}
        />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ListChecks className="h-5 w-5 text-cyan-600" />
                Eligibility and Process
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Core eligibility</p>
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  {(data.sharedEligibilityCore ?? []).map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-cyan-600">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Application steps</p>
                <ol className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  {(data.sharedProcessSteps ?? []).map((step) => (
                    <li key={step.step} className="flex gap-2">
                      <span className="font-semibold text-cyan-700">{step.step}.</span>
                      <span>
                        <span className="font-medium">{step.name}</span>
                        {step.description ? ` - ${step.description}` : ""}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <MapPinned className="h-5 w-5 text-cyan-600" />
                Communities and Overlap
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="grid gap-2 text-sm text-slate-700 dark:text-slate-300 sm:grid-cols-2">
                {(rcip?.communities ?? []).map((community) => (
                  <li key={community} className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
                    {community}
                  </li>
                ))}
              </ul>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-600/30 dark:bg-amber-950/20 dark:text-amber-100">
                <p className="font-semibold">Overlap alert</p>
                <p className="mt-1">
                  {overlapCommunities.join(" and ")} are in both RCIP and FCIP. Users selecting these cities should review both pilots.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <WalletCards className="h-5 w-5 text-cyan-600" />
                Fees and After Apply
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <p>Processing fee from: <span className="font-semibold">{feeText}</span></p>
              <p>Last fee increase date: <span className="font-semibold">{data.sharedFees?.lastIncreaseDate}</span></p>
              <p>Other fee categories: {(data.sharedFees?.otherFeeCategories ?? []).join(", ")}</p>
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <p className="font-semibold">Biometrics</p>
                <p>Age: {data.afterApply?.biometrics?.ageRange}</p>
                <p>Deadline: {data.afterApply?.biometrics?.deadline}</p>
                <p>Method: {data.afterApply?.biometrics?.method}</p>
                <p>{data.afterApply?.biometrics?.note}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <p className="font-semibold">Medical exam</p>
                <p>{data.afterApply?.medicalExam?.appliesTo}</p>
                <p>Disqualifiers: {(data.afterApply?.medicalExam?.disqualifiers ?? []).join("; ")}</p>
              </div>
              <p>{data.afterApply?.qualityAssuranceReview}</p>
              <p>{data.afterApply?.withdrawal}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Languages className="h-5 w-5 text-cyan-600" />
                Forms and Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 text-sm text-slate-700 dark:text-slate-300">
              <div>
                <p className="mb-2 font-semibold text-slate-900 dark:text-white">Pilot-specific forms</p>
                <ul className="space-y-1">
                  {(rcip?.pilotSpecificForms ?? []).map((form) => (
                    <li key={form.form}>{form.form} - {form.name}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 font-semibold text-slate-900 dark:text-white">Portal forms</p>
                <ul className="space-y-1">
                  {(data.sharedDocuments?.fillInPortal ?? []).map((form) => (
                    <li key={form.form}>{form.form} - {form.name}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 font-semibold text-slate-900 dark:text-white">Conditional forms</p>
                <ul className="space-y-1">
                  {(data.sharedDocuments?.conditionalForms ?? []).map((form) => (
                    <li key={form.form}>{form.form} - {form.name}{form.condition ? ` (${form.condition})` : ""}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 font-semibold text-slate-900 dark:text-white">Supporting documents</p>
                <ul className="space-y-1">
                  {(data.sharedDocuments?.supportingDocuments ?? []).map((doc) => (
                    <li key={doc}>{doc}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-800">
                {data.sharedDocuments?.translationRule}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
