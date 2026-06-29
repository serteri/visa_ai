import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  ExternalLink,
  Globe2,
  HeartPulse,
  ListChecks,
  Sparkles,
  Stethoscope,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VisaPdfDownloadCard } from "@/components/visa-pdf-download-card";
import { sanitizeLocaleContent } from "@/lib/i18n/sanitize-locale-content";
import physicianData from "@/src/data/countries/ca/occupation-overlays/physician.json";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

type PageProps = {
  params: Promise<{ locale: string }>;
};

type PhysicianData = {
  sourceUrl?: string;
  sourcePdfBlobUrl?: string;
  lastVerified?: string;
  occupationOverlay?: string;
  occupationOverlay_tr?: string;
  occupationOverlay_zh?: string;
  structuralNote?: string;
  structuralNote_tr?: string;
  structuralNote_zh?: string;
  newFor2026?: string[];
  sectorStatistics?: {
    internationallyTrainedFamilyPhysiciansPercent2024?: number;
    immigrantHealthcareWorkersRatio?: string;
    healthcareWorkersArrived2024ViaEconomicPrograms?: string;
  };
  applicantTracks?: {
    hasCanadianMDExperience?: { description?: string; availablePathways?: string[] };
    noCanadianMDExperienceYet?: { description?: string; availablePathways?: string[]; prerequisite?: string };
  };
  immigrationPathways?: Array<{
    id: string;
    name: string;
    eligibility?: string[];
    processSteps?: string[];
    reservedSpaces?: number;
    expeditedWorkPermitDays?: number;
  }>;
  medicalLicensingPathway?: {
    note?: string;
    note_tr?: string;
    note_zh?: string;
    framework?: { name?: string; components?: Record<string, string> };
    centralPortal?: { name?: string; services?: string[]; specialNote?: string };
    exams?: {
      MCCQE?: { fullName?: string; format?: string; deliveredIn?: string; attemptLimit?: { max?: number; rule?: string } };
      NAC?: { fullName?: string; purpose?: string; orderFlexibility?: string };
    };
    postLicensureSteps?: string[];
    languageRequirements?: {
      generalRule?: string;
      englishTests?: Record<string, string>;
      frenchTestQuebec?: string;
      validityWindow?: string;
      possibleExemption?: string;
    };
    keyDeadlineExample?: { context?: string; deadline?: string; requirement?: string };
    regulatoryAuthorities?: string[];
  };
  foreignCredentialRecognition?: {
    process?: string;
    tool?: string;
    supportServices?: string[];
    otherNewcomerServices?: string[];
  };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;

  return {
    metadataBase: new URL(BASE_URL),
    title: "Live and work as a medical doctor in Canada | LogiVisa",
    description:
      "Physician-focused Canada pathway: 2026 Express Entry physician category, PNP reserved spaces, and separate medical licensing steps through MCC and provincial regulators.",
    alternates: {
      canonical: `/${locale}/visas/canada-medical-doctor`,
      languages: {
        en: "/en/visas/canada-medical-doctor",
        tr: "/tr/visas/canada-medical-doctor",
        "zh-Hans": "/zh-Hans/visas/canada-medical-doctor",
      },
    },
  };
}

function pathLabel(pathwayId: string) {
  return pathwayId
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function CanadaMedicalDoctorPage({ params }: PageProps) {
  const { locale } = await params;
  const localeSuffix = locale === "tr" ? "_tr" : locale === "zh-Hans" ? "_zh" : "";

  const data = sanitizeLocaleContent(physicianData as PhysicianData, locale) as PhysicianData;
  const ui = {
    back: locale === "tr" ? "Kanada vizelerine dön" : locale === "zh-Hans" ? "返回加拿大签证" : "Back to Canada visas",
    overlay: locale === "tr" ? "Meslek Overlay" : locale === "zh-Hans" ? "职业 Overlay" : "Occupation Overlay",
    check: locale === "tr" ? "Uygunlugunu kontrol et" : locale === "zh-Hans" ? "检查你的资格" : "Check your eligibility",
    openSource: locale === "tr" ? "Resmi kaynagi ac" : locale === "zh-Hans" ? "打开官方来源" : "Open official source",
    quickSummary: locale === "tr" ? "Hizli Ozet" : locale === "zh-Hans" ? "快速摘要" : "Quick Summary",
    openPdf: locale === "tr" ? "PDF Ac" : locale === "zh-Hans" ? "打开 PDF" : "Open PDF",
    officialPage: locale === "tr" ? "Resmi site" : locale === "zh-Hans" ? "官方页面" : "Official page",
    immigrationPathways: locale === "tr" ? "Gocmenlik Pathway'leri" : locale === "zh-Hans" ? "移民路径" : "Immigration Pathways",
    processSteps: locale === "tr" ? "Süreç adımı" : locale === "zh-Hans" ? "流程步骤" : "Process steps",
    licensing: locale === "tr" ? "Tibbi Lisanslama" : locale === "zh-Hans" ? "医疗执照路径" : "Medical Licensing Pathway",
    badgeTitle: locale === "tr" ? "Doktor / Hekim" : locale === "zh-Hans" ? "医生 / 医师" : "Medical Doctor / Physician",
    pageTitle: locale === "tr" ? "Kanada'da doktor olarak yasa ve calis" : locale === "zh-Hans" ? "在加拿大以医生身份生活和工作" : "Live and work as a medical doctor in Canada",
    lastVerified: locale === "tr" ? "Son dogrulama" : locale === "zh-Hans" ? "最近核验" : "Last verified",
    intlTrainedPhysicians: locale === "tr" ? "Uluslararasi egitimli aile hekimleri (2024)" : locale === "zh-Hans" ? "国际培训家庭医生（2024）" : "Internationally trained family physicians (2024)",
    immigrantHealthcareRatio: locale === "tr" ? "Gocmen saglik calisani orani" : locale === "zh-Hans" ? "移民医疗工作者占比" : "Immigrant healthcare workers ratio",
    arrivalsViaEconomic: locale === "tr" ? "Ekonomik programlarla gelen saglik calisanlari (2024)" : locale === "zh-Hans" ? "通过经济项目到达的医疗工作者（2024）" : "Healthcare workers arrived via economic programs (2024)",
    pdfTitle: locale === "tr" ? "Kanada'da doktor olarak yasa ve calis (Resmi PDF)" : locale === "zh-Hans" ? "在加拿大以医生身份生活和工作（官方 PDF）" : "Live and work as a medical doctor in Canada (Official PDF)",
    pdfDesc: locale === "tr" ? "IRCC doktor rehberinin Vercel Blob uzerindeki resmi anlik goruntusu." : locale === "zh-Hans" ? "IRCC 医生指南在 Vercel Blob 上的官方快照。" : "Official IRCC physician guide snapshot stored on Vercel Blob for public access.",
    examsDeadlines: locale === "tr" ? "Sinavlar ve Son Tarihler" : locale === "zh-Hans" ? "考试与截止日期" : "Exams and Deadlines",
    languageRegistration: locale === "tr" ? "Dil ve Kayit" : locale === "zh-Hans" ? "语言与注册" : "Language and Registration",
    englishTests: locale === "tr" ? "Ingilizce sinavlari" : locale === "zh-Hans" ? "英语考试" : "English tests",
    postLicensureSteps: locale === "tr" ? "Lisans sonrasi adimlar" : locale === "zh-Hans" ? "执照后步骤" : "Post-licensure steps",
    applicantTracks: locale === "tr" ? "Basvuru Sahibi Izlekleri" : locale === "zh-Hans" ? "申请人路径" : "Applicant Tracks",
    withCanadianMdExp: locale === "tr" ? "Kanada MD deneyimi olan" : locale === "zh-Hans" ? "有加拿大 MD 经验" : "With Canadian MD experience",
    noCanadianMdExp: locale === "tr" ? "Henuz Kanada MD deneyimi olmayan" : locale === "zh-Hans" ? "暂无加拿大 MD 经验" : "No Canadian MD experience yet",
    credentialSupport: locale === "tr" ? "Denklik ve Destek" : locale === "zh-Hans" ? "资历认证与支持" : "Credential Recognition and Support",
    supportServices: locale === "tr" ? "Destek hizmetleri" : locale === "zh-Hans" ? "支持服务" : "Support services",
    newcomerServices: locale === "tr" ? "Yeni gelen hizmetleri" : locale === "zh-Hans" ? "新移民服务" : "Newcomer services",
    maxAttempts: locale === "tr" ? "Maks deneme" : locale === "zh-Hans" ? "最多尝试次数" : "Max attempts",
  };
  const localizedField = (base: string, fallback?: string) => {
    if (!localeSuffix) {
      return fallback ?? ((data as Record<string, unknown>)[base] as string | undefined) ?? "";
    }
    const source = data as Record<string, unknown>;
    const key = `${base}${localeSuffix}`;
    const value = (source[key] as string | undefined) ?? fallback ?? (source[base] as string | undefined);
    return value ?? fallback ?? "";
  };
  const newFor2026 = data.newFor2026 ?? [];
  const immigrationPathways = data.immigrationPathways ?? [];
  const pnpPathway = immigrationPathways.find((item) => item.id === "pnp");
  const licensing = data.medicalLicensingPathway;
  const englishTests = Object.entries(licensing?.languageRequirements?.englishTests ?? {});
  const structuralNoteText = localizedField(
    "structuralNote",
    "This is not a single visa stream. It combines physician-specific immigration options and a separate medical licensing process. To practise in Canada, both tracks must be completed."
  );
  const licensingNote = locale === "tr"
    ? (licensing?.note_tr ?? "Bu surec IRCC/gocmenlikten ayridir; Medical Council of Canada (MCC) ve eyalet/bolge Medical Regulatory Authority'leri (MRA) tarafindan yonetilir. Gocmenlik statusunden bagimsiz tamamlanmalidir.")
    : locale === "zh-Hans"
      ? (licensing?.note_zh ?? "该流程独立于 IRCC 移民流程，由加拿大医学委员会（MCC）及各省/地区医学监管机构（MRA）管理，必须独立于移民身份单独完成。")
      : (licensing?.note ?? "This process is separate from IRCC immigration and managed by the Medical Council of Canada (MCC) and provincial/territorial Medical Regulatory Authorities (MRA). It must be completed independently from immigration status.");

  const stats = [
    {
      label: locale === "tr" ? "Yeni 2026 güncellemesi" : locale === "zh-Hans" ? "2026 新增更新" : "New in 2026",
      value: `${newFor2026.length}`,
    },
    {
      label: locale === "tr" ? "PNP rezerve kontenjan" : locale === "zh-Hans" ? "PNP 保留名额" : "PNP reserved spaces",
      value: `${pnpPathway?.reservedSpaces ?? 5000}`,
    },
    {
      label: locale === "tr" ? "Hızlandırılmış izin" : locale === "zh-Hans" ? "加速工签处理" : "Expedited permit",
      value: `${pnpPathway?.expeditedWorkPermitDays ?? 14} days`,
    },
  ];

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
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
            <Sparkles className="h-4 w-4" />
            {ui.overlay}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100">Canada</Badge>
                  <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-100">
                    {ui.badgeTitle}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                    {ui.pageTitle}
                  </h1>
                  <p className="max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
                    {structuralNoteText}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {stats.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{item.label}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href={`/${locale}/full-check`}>
                  <Button className="bg-rose-600 text-white hover:bg-rose-700">
                    <span>{ui.check}</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <a
                  href={data.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                >
                  {ui.openSource}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-xl">{ui.quickSummary}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{ui.lastVerified}</p>
                <p className="mt-1 font-medium text-slate-900 dark:text-white">{data.lastVerified ?? "2026-06-27"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{ui.intlTrainedPhysicians}</p>
                <p className="mt-1 font-medium text-slate-900 dark:text-white">
                  {data.sectorStatistics?.internationallyTrainedFamilyPhysiciansPercent2024 ?? 31}%
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{ui.immigrantHealthcareRatio}</p>
                <p className="mt-1 font-medium text-slate-900 dark:text-white">
                  {data.sectorStatistics?.immigrantHealthcareWorkersRatio ?? "1 in 4"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{ui.arrivalsViaEconomic}</p>
                <p className="mt-1 font-medium text-slate-900 dark:text-white">
                  {data.sectorStatistics?.healthcareWorkersArrived2024ViaEconomicPrograms ?? "11,000+"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-6 sm:px-6 lg:px-8">
        <VisaPdfDownloadCard
          pdfUrls={data.sourcePdfBlobUrl ? [data.sourcePdfBlobUrl] : []}
          sourceUrl={data.sourceUrl}
          title={ui.pdfTitle}
          description={ui.pdfDesc}
          primaryLabel={ui.openPdf}
          sourceLabel={ui.officialPage}
        />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Stethoscope className="h-5 w-5 text-rose-600" />
                {ui.immigrationPathways}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {immigrationPathways.map((pathway) => (
                <div key={pathway.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{pathway.name}</p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                    {(pathway.eligibility ?? []).map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="text-rose-500">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  {pathway.processSteps && pathway.processSteps.length > 0 ? (
                    <p className="mt-2 text-xs font-medium text-slate-500">
                      {ui.processSteps}: {pathway.processSteps.length}
                    </p>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <HeartPulse className="h-5 w-5 text-rose-600" />
                {ui.licensing}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <p>{licensingNote}</p>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white">{licensing?.framework?.name ?? "IMG-L Framework"}</p>
                <ul className="mt-2 space-y-1">
                  {Object.entries(licensing?.framework?.components ?? {}).map(([key, value]) => (
                    <li key={key} className="flex gap-2">
                      <span className="font-semibold text-rose-600">{key}</span>
                      <span>{value}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white">{licensing?.centralPortal?.name}</p>
                <ul className="mt-2 space-y-1">
                  {(licensing?.centralPortal?.services ?? []).map((service) => (
                    <li key={service} className="flex gap-2">
                      <span className="text-rose-500">•</span>
                      <span>{service}</span>
                    </li>
                  ))}
                </ul>
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
                <ListChecks className="h-5 w-5 text-rose-600" />
                {ui.examsDeadlines}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white">{licensing?.exams?.MCCQE?.fullName}</p>
                <p className="mt-1">{licensing?.exams?.MCCQE?.format}</p>
                <p className="mt-1">{licensing?.exams?.MCCQE?.deliveredIn}</p>
                <p className="mt-1">
                  {ui.maxAttempts}: {licensing?.exams?.MCCQE?.attemptLimit?.max ?? 4}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white">{licensing?.exams?.NAC?.fullName}</p>
                <p className="mt-1">{licensing?.exams?.NAC?.purpose}</p>
                <p className="mt-1">{licensing?.exams?.NAC?.orderFlexibility}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white">{licensing?.keyDeadlineExample?.context}</p>
                <p className="mt-1 flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-rose-600" />
                  {licensing?.keyDeadlineExample?.deadline}
                </p>
                <p className="mt-1">{licensing?.keyDeadlineExample?.requirement}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <BadgeCheck className="h-5 w-5 text-rose-600" />
                {ui.languageRegistration}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <p>{licensing?.languageRequirements?.generalRule}</p>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white">{ui.englishTests}</p>
                <ul className="mt-2 space-y-1">
                  {englishTests.map(([testName, scoreRule]) => (
                    <li key={testName} className="flex gap-2">
                      <span className="text-rose-500">•</span>
                      <span>{testName}: {scoreRule}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p>{licensing?.languageRequirements?.frenchTestQuebec}</p>
              <p>{licensing?.languageRequirements?.validityWindow}</p>
              <p>{licensing?.languageRequirements?.possibleExemption}</p>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white">{ui.postLicensureSteps}</p>
                <ul className="mt-2 space-y-1">
                  {(licensing?.postLicensureSteps ?? []).map((step) => (
                    <li key={step} className="flex gap-2">
                      <span className="text-rose-500">•</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
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
                <Globe2 className="h-5 w-5 text-rose-600" />
                {ui.applicantTracks}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{ui.withCanadianMdExp}</p>
                <p className="mt-1">{data.applicantTracks?.hasCanadianMDExperience?.description}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {(data.applicantTracks?.hasCanadianMDExperience?.availablePathways ?? []).map(pathLabel).join(" • ")}
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{ui.noCanadianMdExp}</p>
                <p className="mt-1">{data.applicantTracks?.noCanadianMDExperienceYet?.description}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {(data.applicantTracks?.noCanadianMDExperienceYet?.availablePathways ?? []).map(pathLabel).join(" • ")}
                </p>
                <p className="mt-1">{data.applicantTracks?.noCanadianMDExperienceYet?.prerequisite}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-xl">{ui.credentialSupport}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <p>{data.foreignCredentialRecognition?.process}</p>
              <p>{data.foreignCredentialRecognition?.tool}</p>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{ui.supportServices}</p>
                <ul className="mt-2 space-y-1">
                  {(data.foreignCredentialRecognition?.supportServices ?? []).map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-rose-500">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{ui.newcomerServices}</p>
                <ul className="mt-2 space-y-1">
                  {(data.foreignCredentialRecognition?.otherNewcomerServices ?? []).map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-rose-500">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
