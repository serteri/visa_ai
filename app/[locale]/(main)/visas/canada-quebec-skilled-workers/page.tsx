import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, CircleDashed, ListChecks, WalletCards } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VisaPdfDownloadCard } from "@/components/visa-pdf-download-card";
import quebecData from "@/src/data/countries/ca/quebec-selected-skilled-workers.json";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

type PageProps = {
  params: Promise<{ locale: string }>;
};

type QuebecFederalData = {
  pathwayCovered?: string;
  pathwayCovered_tr?: string;
  pathwayCovered_zh?: string;
  lastVerified?: string;
  sourcePdfBlobUrl?: string;
  CRITICAL_STRUCTURAL_WARNING?: string;
  CRITICAL_STRUCTURAL_WARNING_tr?: string;
  CRITICAL_STRUCTURAL_WARNING_zh?: string;
  twoStageProcess?: {
    stage1_quebec?: {
      name?: string;
      authority?: string;
      status?: string;
      knownFacts?: string[];
    };
    stage2_federal_this_document?: {
      name?: string;
      authority?: string;
      prerequisite?: string;
      processingTime?: string;
      fee?: { currency?: string; from?: number; lastIncreaseDate?: string };
    };
  };
  twoStageProcess_tr?: {
    stage1_quebec?: {
      name?: string;
      authority?: string;
      status?: string;
      knownFacts?: string[];
    };
    stage2_federal_this_document?: {
      name?: string;
      authority?: string;
      prerequisite?: string;
      processingTime?: string;
      fee?: { currency?: string; from?: number; lastIncreaseDate?: string };
    };
  };
  twoStageProcess_zh?: {
    stage1_quebec?: {
      name?: string;
      authority?: string;
      status?: string;
      knownFacts?: string[];
    };
    stage2_federal_this_document?: {
      name?: string;
      authority?: string;
      prerequisite?: string;
      processingTime?: string;
      fee?: { currency?: string; from?: number; lastIncreaseDate?: string };
    };
  };
  eligibility?: string[];
  eligibility_tr?: string[];
  eligibility_zh?: string[];
  applicationProcess?: {
    mandatoryOnlineSince?: string;
    alternateFormatAvailable?: string[];
    portal?: string;
    instructionGuide?: string;
    quebecContactNote?: string;
  };
  documentsRequired?: {
    fillInPortal?: Array<{ form: string; name: string }>;
    downloadAndUpload_noSignatureNeeded?: Array<{ form: string; name: string; note?: string }>;
    conditionalForms_handSigned?: Array<{ form: string; name: string; condition?: string }>;
    representativeForms?: Array<{ form: string; name: string }>;
    photos?: string;
  };
  representativeRules?: {
    canDo?: string[];
    cannotDo?: string[];
    legalSignatureRule?: string;
  };
  fees?: {
    currency?: string;
    processingFeeFrom?: number;
    lastIncreaseDate?: string;
    components?: string[];
    note?: string;
  };
  afterApply?: {
    biometrics?: { ageRange?: string; deadline?: string; note?: string };
    medicalExam?: { appliesTo?: string; disqualifiers?: string[] };
    policeCertificates?: { rule?: string; differenceFromOtherPathways?: string };
    decisionCriteria?: string[];
    misrepresentationConsequence?: string;
    approvalOutcome?: string[];
    coprCannotBeExtended?: boolean;
  };
  missingDataFlags?: string[];
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    metadataBase: new URL(BASE_URL),
    title: "Quebec-selected skilled workers (Federal stage only) | LogiVisa",
    description:
      "Federal IRCC stage only after CSQ for Quebec-selected skilled workers. Quebec CSQ selection stage is separate and not fully documented in this page.",
    alternates: {
      canonical: `/${locale}/visas/canada-quebec-skilled-workers`,
      languages: {
        en: "/en/visas/canada-quebec-skilled-workers",
        tr: "/tr/visas/canada-quebec-skilled-workers",
        "zh-Hans": "/zh-Hans/visas/canada-quebec-skilled-workers",
      },
    },
  };
}

export default async function CanadaQuebecSkilledWorkersPage({ params }: PageProps) {
  const { locale } = await params;
  const localeSuffix = locale === "tr" ? "_tr" : locale === "zh-Hans" ? "_zh" : "";
  const localeKind = locale === "tr" ? "tr" : locale === "zh-Hans" ? "zh" : "en";
  const data = quebecData as QuebecFederalData;
  const ui = {
    back: locale === "tr" ? "Kanada vizelerine don" : locale === "zh-Hans" ? "返回加拿大签证" : "Back to Canada visas",
    check: locale === "tr" ? "Uygunlugunu kontrol et" : locale === "zh-Hans" ? "检查你的资格" : "Check your eligibility",
    openPdf: locale === "tr" ? "PDF Ac" : locale === "zh-Hans" ? "打开 PDF" : "Open PDF",
  };
  const localizedField = (base: string, fallback?: string) => {
    if (!localeSuffix) {
      return fallback ?? ((data as Record<string, unknown>)[base] as string | undefined) ?? "";
    }
    const source = data as Record<string, unknown>;
    const key = `${base}${localeSuffix}`;
    const value = (source[key] as string | undefined) ?? (source[base] as string | undefined);
    return value ?? fallback ?? "";
  };
  const t = {
    criticalWarningBody: localeKind === "tr"
      ? "Bu dosya Kanada'nın diğer pathway dosyalarından (Express Entry, PNP, AIP, RCIP/FCIP) köklü biçimde farklı bir uyarı taşır: BU SADECE İKİ AŞAMALI SÜRECİN İKİNCİ (federal/IRCC) AŞAMASIDIR. Quebec'in kendi seçim süreci (Certificat de selection du Quebec - CSQ alma; kendi puan tablosu - CRS değil; kendi portalı - Arrima; muhtemelen kendi ücretleri ve işlem süresi) BU DOSYADA YOK ve henüz araştırılmadı/JSON'a dökülmedi. Bu sayfayı 'Quebec'e göç etmenin tam süreci' gibi sunmak YANLIŞ olur; kullanıcı önce Quebec'ten CSQ almak zorunda, bu federal 11 ay/$1,590 aşaması ise CSQ alındıktan SONRA başlıyor. Quebec'in kendi tarafı (QSWP/PSTQ, Arrima) tamamen ayrı ve ayrıca ele alınması gereken bir araştırma/entegrasyon işidir."
      : localeKind === "zh"
        ? "此文件与加拿大其他路径文件（Express Entry、PNP、AIP、RCIP/FCIP）有根本不同的警告：这只是两阶段流程中的第二阶段（联邦阶段/IRCC）。魁北克自己的筛选流程（获取 Certificat de selection du Quebec - CSQ；自己的积分体系——不是 CRS；自己的门户——Arrima；以及可能不同的费用与处理时间）不在本文件中，且尚未研究/结构化入 JSON。把本页当作“移民魁北克的完整流程”是错误的：用户必须先获得魁北克 CSQ，之后才进入这里的联邦 11 个月/$1,590 阶段。魁北克端（QSWP/PSTQ、Arrima）是完全独立、尚待单独集成的工作。"
        : "This page covers the federal processing stage only, after you already hold a Quebec Selection Certificate (CSQ). Quebec's own selection process (Arrima, Quebec points logic, Quebec-side fees/timelines) is not covered in detail here yet.",
    pathwayCovered: localeKind === "tr"
      ? "Quebec seçilmiş nitelikli işçiler - yalnızca FEDERAL (IRCC) aşaması"
      : localeKind === "zh"
        ? "魁北克技术工人——仅联邦（IRCC）阶段"
        : "Quebec-selected skilled workers - Federal stage",
    stage1Name: localeKind === "tr"
      ? "Quebec Seçimi (Certificat de selection du Quebec - CSQ)"
      : localeKind === "zh"
        ? "魁北克筛选阶段（Certificat de selection du Quebec - CSQ）"
        : "Quebec Selection (Certificat de selection du Quebec - CSQ)",
    stage2Name: localeKind === "tr"
      ? "Federal Daimi Oturum Başvurusu (IRCC)"
      : localeKind === "zh"
        ? "联邦永久居留申请阶段（IRCC）"
        : "Federal Permanent Residence Application (IRCC)",
  };
  const localizedTwoStage = locale === "tr"
    ? (data.twoStageProcess_tr ?? data.twoStageProcess)
    : locale === "zh-Hans"
      ? (data.twoStageProcess_zh ?? data.twoStageProcess)
      : data.twoStageProcess;
  const localizedEligibility = locale === "tr"
    ? (data.eligibility_tr ?? data.eligibility ?? [])
    : locale === "zh-Hans"
      ? (data.eligibility_zh ?? data.eligibility ?? [])
      : (data.eligibility ?? []);

  const feeText = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: data.fees?.currency ?? "CAD",
    maximumFractionDigits: 0,
  }).format(data.fees?.processingFeeFrom ?? 1590);

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
          <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-100">Stage 2 of 2 - Federal only</Badge>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900 dark:border-amber-600/30 dark:bg-amber-950/20 dark:text-amber-100">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Critical scope warning</p>
              <p className="mt-1 text-sm leading-6">
                {localizedField(
                  "CRITICAL_STRUCTURAL_WARNING",
                  t.criticalWarningBody
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <div className="space-y-3">
                <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                  {localizedField("pathwayCovered", t.pathwayCovered)}
                </h1>
                <p className="max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
                  {localizedField("pathwayCovered")}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Two-stage process map</p>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stage 1 (Quebec)</p>
                    <p className="mt-1 font-semibold text-slate-900 dark:text-white">{localizedTwoStage?.stage1_quebec?.name ?? t.stage1Name}</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Separate process, not detailed here.</p>
                  </div>
                  <div className="flex justify-center text-slate-400">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-600/30 dark:bg-emerald-950/20">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-200">Stage 2 (Federal IRCC)</p>
                    <p className="mt-1 font-semibold text-emerald-900 dark:text-emerald-100">{localizedTwoStage?.stage2_federal_this_document?.name ?? t.stage2Name}</p>
                    <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">Detailed on this page.</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Federal processing time</p>
                  <p className="mt-2 text-xl font-bold text-slate-950 dark:text-white">{localizedTwoStage?.stage2_federal_this_document?.processingTime}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Federal fee from</p>
                  <p className="mt-2 text-xl font-bold text-slate-950 dark:text-white">{feeText}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Last verified</p>
                  <p className="mt-2 text-xl font-bold text-slate-950 dark:text-white">{data.lastVerified}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href={`/${locale}/full-check`}>
                  <Button className="bg-emerald-600 text-white hover:bg-emerald-700">
                    <span>{ui.check}</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-xl">What is missing (not documented yet)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
              {(data.missingDataFlags ?? []).map((flag) => (
                <p key={flag} className="flex gap-2">
                  <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <span>{flag}</span>
                </p>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-6 sm:px-6 lg:px-8">
        <VisaPdfDownloadCard
          pdfUrls={data.sourcePdfBlobUrl ? [data.sourcePdfBlobUrl] : []}
          title="Quebec-selected skilled workers (Federal stage only) - Official PDF"
          description="This PDF reflects the federal IRCC stage after CSQ and does not include Quebec's own selection stage details."
          primaryLabel={ui.openPdf}
        />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ListChecks className="h-5 w-5 text-emerald-600" />
                Eligibility and Application
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Eligibility</p>
                <ul className="mt-2 space-y-1">
                  {localizedEligibility.map((item) => (
                    <li key={item} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Application process</p>
                <p className="mt-1">Online mandatory since: {data.applicationProcess?.mandatoryOnlineSince}</p>
                <p>Alternate formats: {(data.applicationProcess?.alternateFormatAvailable ?? []).join(", ")}</p>
                <p>Portal: {data.applicationProcess?.portal}</p>
                <p>Instruction guide: {data.applicationProcess?.instructionGuide}</p>
                <p className="mt-1 text-amber-800 dark:text-amber-300">{data.applicationProcess?.quebecContactNote}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <WalletCards className="h-5 w-5 text-emerald-600" />
                Fees and After Apply
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <p>Federal fee from: <span className="font-semibold">{feeText}</span></p>
              <p>Last increase date: <span className="font-semibold">{data.fees?.lastIncreaseDate}</span></p>
              <p>Fee components: {(data.fees?.components ?? []).join(", ")}</p>
              <p className="text-amber-800 dark:text-amber-300">{data.fees?.note}</p>
              <p>Biometrics: {data.afterApply?.biometrics?.ageRange}, {data.afterApply?.biometrics?.deadline}</p>
              <p>{data.afterApply?.biometrics?.note}</p>
              <p>Medical exam applies to: {data.afterApply?.medicalExam?.appliesTo}</p>
              <p>Medical disqualifiers: {(data.afterApply?.medicalExam?.disqualifiers ?? []).join("; ")}</p>
              <p>{data.afterApply?.policeCertificates?.rule}</p>
              <p>{data.afterApply?.policeCertificates?.differenceFromOtherPathways}</p>
              <p>Decision criteria: {(data.afterApply?.decisionCriteria ?? []).join(", ")}</p>
              <p>{data.afterApply?.misrepresentationConsequence}</p>
              <p>Approval outcome: {(data.afterApply?.approvalOutcome ?? []).join(", ")}</p>
              <p>COPR cannot be extended: {data.afterApply?.coprCannotBeExtended ? "Yes" : "No"}</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle>Documents Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Fill in portal</p>
                <ul className="mt-1 space-y-1">
                  {(data.documentsRequired?.fillInPortal ?? []).map((item) => (
                    <li key={item.form}>{item.form} - {item.name}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Download and upload (no signature)</p>
                <ul className="mt-1 space-y-1">
                  {(data.documentsRequired?.downloadAndUpload_noSignatureNeeded ?? []).map((item) => (
                    <li key={item.form}>{item.form} - {item.name}{item.note ? ` (${item.note})` : ""}</li>
                  ))}
                </ul>
              </div>
              <p>{data.documentsRequired?.photos}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle>Conditional and Representative Forms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Conditional forms (hand-signed)</p>
                <ul className="mt-1 space-y-1">
                  {(data.documentsRequired?.conditionalForms_handSigned ?? []).map((item) => (
                    <li key={item.form}>{item.form} - {item.name}{item.condition ? ` (${item.condition})` : ""}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Representative forms</p>
                <ul className="mt-1 space-y-1">
                  {(data.documentsRequired?.representativeForms ?? []).map((item) => (
                    <li key={item.form}>{item.form} - {item.name}</li>
                  ))}
                </ul>
              </div>
              <p className="font-semibold text-slate-900 dark:text-white">Representatives can do</p>
              <ul className="space-y-1">
                {(data.representativeRules?.canDo ?? []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="font-semibold text-slate-900 dark:text-white">Representatives cannot do</p>
              <ul className="space-y-1">
                {(data.representativeRules?.cannotDo ?? []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="text-amber-800 dark:text-amber-300">{data.representativeRules?.legalSignatureRule}</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
