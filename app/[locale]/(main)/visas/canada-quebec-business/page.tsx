import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BriefcaseBusiness, Building2, ListChecks, UserRoundSearch } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VisaPdfDownloadCard } from "@/components/visa-pdf-download-card";
import businessData from "@/src/data/countries/ca/quebec-investors-entrepreneurs-self-employed.json";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

type PageProps = {
  params: Promise<{ locale: string }>;
};

type BusinessData = {
  pathwayCovered?: string;
  pathwayCovered_tr?: string;
  pathwayCovered_zh?: string;
  lastVerified?: string;
  sourcePdfBlobUrl?: string;
  relationToOtherQuebecFile?: string;
  relationToOtherQuebecFile_tr?: string;
  relationToOtherQuebecFile_zh?: string;
  twoStageProcess?: {
    stage1_quebec?: { authority?: string; outcome?: string; note?: string; note_tr?: string; note_zh?: string };
    stage2_federal?: { authority?: string; prerequisite?: string; prerequisite_tr?: string; prerequisite_zh?: string; fee?: { currency?: string; from?: number; note?: string; note_tr?: string; note_zh?: string } };
  };
  twoStageProcess_tr?: {
    stage1_quebec?: { authority?: string; outcome?: string; note?: string };
    stage2_federal?: { authority?: string; prerequisite?: string; fee?: { currency?: string; from?: number; note?: string } };
  };
  twoStageProcess_zh?: {
    stage1_quebec?: { authority?: string; outcome?: string; note?: string };
    stage2_federal?: { authority?: string; prerequisite?: string; fee?: { currency?: string; from?: number; note?: string } };
  };
  ineligibleSectorsGeneral?: string[];
  subStreams?: {
    investor?: {
      conditions?: {
        managementExperience?: { minimumYears?: number; window?: string };
        netWorth?: { minimumCAD?: number };
        frenchLanguage?: { minimumLevel?: string; acceptedTests?: string[]; acceptedTestProviders?: string[] };
        investmentAndContribution?: { investmentCAD?: number; financialContributionCAD?: number; investmentTerm?: string };
        quebecStayRequirement?: { totalMonths?: number; windowYears?: number; minimumPersonalMonths?: number };
      };
    };
    entrepreneur?: {
      subStreamsNamedOnly_notDetailedInSource?: Array<{ id: string; name: string; description?: string }>;
      note?: string;
    };
    selfEmployedPerson?: {
      conditions?: {
        workExperience?: { minimumYears?: number; window?: string };
        netWorth?: { minimumCAD?: number };
        startUpDeposit?: { outsideCMM_CAD?: number; withinCMM_CAD?: number; CMM_meaning?: string };
        regulatedProfessionRequirement?: { processSteps?: string[] };
      };
    };
  };
  federalApplicationStage?: {
    documentChecklists?: { investorsAndEntrepreneurs?: string; selfEmployedPersons?: string };
    fillInPortal?: Array<{ form: string; name: string }>;
    uploadOnly_noSignature?: Array<{ form: string; name: string; appliesTo?: string[] }>;
    conditionalForms_handSigned?: Array<{ form: string; name: string; condition?: string; note?: string }>;
    supportingDocuments?: string[];
  };
  afterApply?: {
    biometrics?: { ageRange?: string; deadline?: string };
    medicalExam?: { required?: boolean; appliesTo?: string };
    decisionOutcomes?: { approved?: string; refused?: string; withdrawal?: string };
  };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    metadataBase: new URL(BASE_URL),
    title: "Quebec investors, entrepreneurs and self-employed persons | LogiVisa",
    description:
      "Quebec business pathways with investor, entrepreneur, and self-employed sections, plus federal PR stage requirements.",
    alternates: {
      canonical: `/${locale}/visas/canada-quebec-business`,
      languages: {
        en: "/en/visas/canada-quebec-business",
        tr: "/tr/visas/canada-quebec-business",
        "zh-Hans": "/zh-Hans/visas/canada-quebec-business",
      },
    },
  };
}

export default async function CanadaQuebecBusinessPage({ params }: PageProps) {
  const { locale } = await params;
  const localeSuffix = locale === "tr" ? "_tr" : locale === "zh-Hans" ? "_zh" : "";
  const data = businessData as BusinessData;
  const ui = {
    back: locale === "tr" ? "Kanada vizelerine don" : locale === "zh-Hans" ? "返回加拿大签证" : "Back to Canada visas",
    check: locale === "tr" ? "Uygunlugunu kontrol et" : locale === "zh-Hans" ? "检查你的资格" : "Check your eligibility",
    openPdf: locale === "tr" ? "PDF Ac" : locale === "zh-Hans" ? "打开 PDF" : "Open PDF",
  };
  const localizedField = <T extends Record<string, unknown>>(obj: T | undefined, base: string, fallback?: string) => {
    if (!obj) return fallback ?? "";
    const key = `${base}${localeSuffix}`;
    const value = (obj[key] as string | undefined) ?? (obj[base] as string | undefined);
    return value ?? fallback ?? "";
  };
  const titleText = localizedField(
    data as unknown as Record<string, unknown>,
    "pathwayCovered",
    "Quebec investors, entrepreneurs and self-employed persons"
  );
  const relationText = localizedField(
    data as unknown as Record<string, unknown>,
    "relationToOtherQuebecFile",
    "This fills part of missingDataFlags from canada-quebec-selected-skilled-workers.json, but only for the investor/entrepreneur/self-employed business class. The general skilled-worker flow (QSWP/PSTQ, Arrima portal) remains separate and not fully documented here."
  );
  const localizedTwoStage = locale === "tr"
    ? (data.twoStageProcess_tr ?? data.twoStageProcess)
    : locale === "zh-Hans"
      ? (data.twoStageProcess_zh ?? data.twoStageProcess)
      : data.twoStageProcess;

  const federalFeeText = new Intl.NumberFormat(locale === "zh-Hans" ? "zh-CN" : locale === "tr" ? "tr-TR" : "en-CA", {
    style: "currency",
    currency: data.twoStageProcess?.stage2_federal?.fee?.currency ?? "CAD",
    maximumFractionDigits: 0,
  }).format(data.twoStageProcess?.stage2_federal?.fee?.from ?? 2495);

  const investor = data.subStreams?.investor?.conditions;
  const entrepreneur = data.subStreams?.entrepreneur;
  const selfEmployed = data.subStreams?.selfEmployedPerson?.conditions;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-28 sm:pt-32 dark:from-slate-950 dark:to-slate-900">
      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link
            href={`/${locale}/visas/canada`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {ui.back}
          </Link>
          <Badge className="bg-violet-100 text-violet-900 dark:bg-violet-500/15 dark:text-violet-100">Quebec Business Streams</Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <div className="space-y-3">
                <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                  {titleText}
                </h1>
                <p className="max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
                  {titleText}
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-300">{relationText}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Two-stage process</p>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stage 1 (Quebec)</p>
                    <p className="mt-1 font-semibold text-slate-900 dark:text-white">{localizedTwoStage?.stage1_quebec?.authority}</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Outcome: {localizedTwoStage?.stage1_quebec?.outcome}</p>
                    <p className="mt-1 text-xs text-slate-500">{localizedTwoStage?.stage1_quebec?.note ?? "Unlike the previous skilled-worker file, this file includes Quebec-side selection criteria in detail; see the subStreams section below."}</p>
                  </div>
                  <div className="flex justify-center text-slate-400">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                  <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 dark:border-violet-600/30 dark:bg-violet-950/20">
                    <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-200">Stage 2 (Federal)</p>
                    <p className="mt-1 font-semibold text-violet-900 dark:text-violet-100">{localizedTwoStage?.stage2_federal?.authority}</p>
                    <p className="mt-1 text-sm text-violet-800 dark:text-violet-200">Prerequisite: {localizedTwoStage?.stage2_federal?.prerequisite}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Federal fee from</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{federalFeeText}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Sub-streams</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">3</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Last verified</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{data.lastVerified}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href={`/${locale}/full-check`}>
                  <Button className="bg-violet-600 text-white hover:bg-violet-700">
                    <span>{ui.check}</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-xl">General ineligible sectors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
              {(data.ineligibleSectorsGeneral ?? []).map((item) => (
                <p key={item}>- {item}</p>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-6 sm:px-6 lg:px-8">
        <VisaPdfDownloadCard
          pdfUrls={data.sourcePdfBlobUrl ? [data.sourcePdfBlobUrl] : []}
          title="Quebec investors, entrepreneurs and self-employed persons (Official PDF)"
          description="Official snapshot for Quebec business immigration pathways and related federal-stage requirements."
          primaryLabel={ui.openPdf}
        />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Building2 className="h-5 w-5 text-violet-600" />
                Investor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
              <p>Management experience: {investor?.managementExperience?.minimumYears} years ({investor?.managementExperience?.window})</p>
              <p>Net worth minimum: CAD {investor?.netWorth?.minimumCAD?.toLocaleString("en-CA")}</p>
              <p>French minimum: {investor?.frenchLanguage?.minimumLevel}</p>
              <p>Investment: CAD {investor?.investmentAndContribution?.investmentCAD?.toLocaleString("en-CA")} for {investor?.investmentAndContribution?.investmentTerm}</p>
              <p>Financial contribution: CAD {investor?.investmentAndContribution?.financialContributionCAD?.toLocaleString("en-CA")}</p>
              <p>Quebec stay requirement: {investor?.quebecStayRequirement?.totalMonths} months within {investor?.quebecStayRequirement?.windowYears} years ({investor?.quebecStayRequirement?.minimumPersonalMonths} months personally)</p>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50 shadow-sm dark:border-amber-700/30 dark:bg-amber-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-amber-900 dark:text-amber-100">
                <AlertTriangle className="h-5 w-5" />
                Entrepreneur
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-amber-900 dark:text-amber-100">
              <p className="font-semibold">Detailed criteria for entrepreneur sub-streams are coming soon.</p>
              <p>{entrepreneur?.note}</p>
              <ul className="space-y-2">
                {(entrepreneur?.subStreamsNamedOnly_notDetailedInSource ?? []).map((stream) => (
                  <li key={stream.id}>
                    <p className="font-semibold">{stream.name}</p>
                    <p>{stream.description}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <UserRoundSearch className="h-5 w-5 text-violet-600" />
                Self-employed person
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
              <p>Work experience: {selfEmployed?.workExperience?.minimumYears} years ({selfEmployed?.workExperience?.window})</p>
              <p>Net worth minimum: CAD {selfEmployed?.netWorth?.minimumCAD?.toLocaleString("en-CA")}</p>
              <p>Startup deposit outside CMM: CAD {selfEmployed?.startUpDeposit?.outsideCMM_CAD?.toLocaleString("en-CA")}</p>
              <p>Startup deposit within CMM: CAD {selfEmployed?.startUpDeposit?.withinCMM_CAD?.toLocaleString("en-CA")}</p>
              <p className="text-xs">{selfEmployed?.startUpDeposit?.CMM_meaning}</p>
              <p className="font-semibold">Regulated profession process:</p>
              <ul className="space-y-1">
                {(selfEmployed?.regulatedProfessionRequirement?.processSteps ?? []).map((step) => (
                  <li key={step}>- {step}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ListChecks className="h-5 w-5 text-violet-600" />
                Federal application stage forms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <p>Checklist (investors/entrepreneurs): {data.federalApplicationStage?.documentChecklists?.investorsAndEntrepreneurs}</p>
              <p>Checklist (self-employed): {data.federalApplicationStage?.documentChecklists?.selfEmployedPersons}</p>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Fill in portal</p>
                <ul className="mt-1 space-y-1">
                  {(data.federalApplicationStage?.fillInPortal ?? []).map((item) => (
                    <li key={item.form}>{item.form} - {item.name}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Upload only (no signature)</p>
                <ul className="mt-1 space-y-1">
                  {(data.federalApplicationStage?.uploadOnly_noSignature ?? []).map((item) => (
                    <li key={item.form}>{item.form} - {item.name}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <BriefcaseBusiness className="h-5 w-5 text-violet-600" />
                Supporting docs and after apply
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Conditional forms (hand-signed)</p>
                <ul className="mt-1 space-y-1">
                  {(data.federalApplicationStage?.conditionalForms_handSigned ?? []).map((item) => (
                    <li key={item.form}>{item.form} - {item.name}{item.condition ? ` (${item.condition})` : ""}{item.note ? ` - ${item.note}` : ""}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Supporting documents</p>
                <ul className="mt-1 space-y-1">
                  {(data.federalApplicationStage?.supportingDocuments ?? []).map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </div>
              <p>Biometrics: {data.afterApply?.biometrics?.ageRange}, {data.afterApply?.biometrics?.deadline}</p>
              <p>Medical exam required: {data.afterApply?.medicalExam?.required ? "Yes" : "No"} ({data.afterApply?.medicalExam?.appliesTo})</p>
              <p>Approved: {data.afterApply?.decisionOutcomes?.approved}</p>
              <p>Refused: {data.afterApply?.decisionOutcomes?.refused}</p>
              <p>Withdrawal: {data.afterApply?.decisionOutcomes?.withdrawal}</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
