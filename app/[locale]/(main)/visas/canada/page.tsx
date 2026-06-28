import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import expressEntryData from "@/src/data/countries/ca/express-entry.json";
import pnpProcessData from "@/src/data/countries/ca/pnp-non-express-process.json";
import physicianOverlayData from "@/src/data/countries/ca/occupation-overlays/physician.json";
import pausedClosedProgramsData from "@/src/data/countries/ca/paused-closed-programs.json";
import quebecBusinessData from "@/src/data/countries/ca/quebec-investors-entrepreneurs-self-employed.json";
import quebecSelectedFederalData from "@/src/data/countries/ca/quebec-selected-skilled-workers.json";
import ruralFrancophonePilotsData from "@/src/data/countries/ca/rural-francophone-pilots.json";
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
  const localeKind = locale === "tr" ? "tr" : locale === "zh-Hans" ? "zh" : "en";
  const localize = (obj: Record<string, unknown> | undefined, base: string, fallback?: string) => {
    if (!obj) return fallback ?? "";
    if (localeKind === "tr") {
      return (obj[`${base}_tr`] as string | undefined) ?? (obj[base] as string | undefined) ?? fallback ?? "";
    }
    if (localeKind === "zh") {
      return (obj[`${base}_zh`] as string | undefined) ?? (obj[base] as string | undefined) ?? fallback ?? "";
    }
    return fallback ?? (obj[base] as string | undefined) ?? "";
  };
  const localizeStatus = (obj: Record<string, unknown>) => {
    const localized = localize(obj, "status", "");
    if (localized) return localized;
    const raw = String(obj.status ?? "").toLowerCase();
    if (localeKind === "tr") {
      if (raw.includes("pause")) return "duraklatıldı";
      if (raw.includes("close")) return "kapatıldı";
    }
    if (localeKind === "zh") {
      if (raw.includes("pause")) return "暂停";
      if (raw.includes("close")) return "已关闭";
    }
    return obj.status as string | undefined;
  };

  const ee = expressEntryData as Record<string, any>;
  const pnp = pnpProcessData as Record<string, any>;
  const physicianOverlay = physicianOverlayData as Record<string, any>;
  const ruralFrancophone = ruralFrancophonePilotsData as Record<string, any>;
  const quebecFederal = quebecSelectedFederalData as Record<string, any>;
  const quebecBusiness = quebecBusinessData as Record<string, any>;
  const pausedClosedRegistry = pausedClosedProgramsData as Record<string, any>;
  const aip = (visaDetails as Array<{
    id?: string;
    program_name?: string;
    status?: string;
    overview?: string;
    fees?: string;
    processing_time?: string;
    target_provinces?: string[];
  }>).find((item) => item.id === "canada-atlantic-immigration-program");

  const familySponsorship = (visaDetails as Array<{
    id?: string;
    program_name?: string;
    status?: string;
    overview?: string;
    fees?: string;
    processing_time?: string;
  }>).find((item) => item.id === "canada-family-sponsorship");

  const caregivers = (visaDetails as Array<{
    id?: string;
    program_name?: string;
    status?: string;
    overview?: string;
    fees?: string;
    processing_time?: string;
  }>).find((item) => item.id === "canada-caregivers-tfwp");

  const ui = {
    title: localeKind === "tr" ? "Kanada Vize Yolları" : localeKind === "zh" ? "加拿大移民通道" : "Canada Visa Pathways",
    subtitle: localeKind === "tr"
      ? "Kanada'da daimi oturum sahibi olmak ve çalışmak için güncel vize seçeneklerini keşfedin."
      : localeKind === "zh"
        ? "探索在加拿大永久居留和工作的最新签证选择。"
        : "Explore up-to-date visa options to work and settle permanently in Canada.",
    viewDetails: localeKind === "tr" ? "Detayları İncele" : localeKind === "zh" ? "查看详情" : "View Details",
    communities: localeKind === "tr" ? "Topluluk" : localeKind === "zh" ? "社区" : "Communities",
    language: localeKind === "tr" ? "Dil" : localeKind === "zh" ? "语言" : "Language",
    pilotProgram: localeKind === "tr" ? "Pilot Program" : localeKind === "zh" ? "试点项目" : "Pilot program",
    newUpdates: localeKind === "tr" ? "Yeni güncelleme" : localeKind === "zh" ? "新增更新" : "New updates",
    tracks: localeKind === "tr" ? "Track" : localeKind === "zh" ? "路径" : "Tracks",
    updated2026: localeKind === "tr" ? "Güncel 2026" : localeKind === "zh" ? "2026 已更新" : "Updated for 2026",
    processSteps: localeKind === "tr" ? "Süreç adımı" : localeKind === "zh" ? "流程步骤" : "Process steps",
    supportingDocs: localeKind === "tr" ? "Destekleyici belge" : localeKind === "zh" ? "支持材料" : "Supporting docs",
    targetProvinces: localeKind === "tr" ? "Hedef eyalet" : localeKind === "zh" ? "目标省份" : "Target provinces",
    status: localeKind === "tr" ? "Durum" : localeKind === "zh" ? "状态" : "Status",
    pilotsClosed: localeKind === "tr" ? "Pilot Kapandı" : localeKind === "zh" ? "试点已关闭" : "Pilots Closed",
    pausedClosedSummary: localeKind === "tr" ? "Duraklatilan veya Kapatilan Programlar (genisletmek icin tikla)" : localeKind === "zh" ? "暂停或关闭项目（点击展开）" : "Paused or Closed Programs (click to expand)",
    referenceOnly: localeKind === "tr" ? "Referans" : localeKind === "zh" ? "参考" : "Reference only",
    qcSelfEmployedNote: localeKind === "tr"
      ? "Not: Quebec resmi sayfasinda self-employed worker akisinda basvurunun acik oldugu ('You can submit an application at any time') ifadesi goruldu; yine de MIFI guncellemeleri duzenli kontrol edilmelidir."
      : localeKind === "zh"
        ? "注：魁北克官方 self-employed 页面显示“可随时提交申请”；仍需持续核对 MIFI 更新。"
        : "Note: Quebec official self-employed page states applications can be submitted at any time; still re-check MIFI updates regularly.",
  };

  // Format fee dynamically (CAD)
  const feeText = new Intl.NumberFormat(locale === "zh-Hans" ? "zh-CN" : locale === "tr" ? "tr-TR" : "en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(ee.fees?.mainApplicant ?? 1590);

  const pnpFeeText = new Intl.NumberFormat(locale === "zh-Hans" ? "zh-CN" : locale === "tr" ? "tr-TR" : "en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(pnp.fees?.processingFeeFrom ?? 1590);

  const processingTimeText = localize(ee, "processingTimes", "Varies by program");
  const pnpProcessingTimeText = localize(pnp.processingTime, "estimate", "about 13 months");
  const pnpStepsCount = pnp.processSteps?.length ?? 0;
  const pnpDocsCount = pnp.documentsRequired?.supportingDocuments?.length ?? 0;
  const aipProvincesCount = aip?.target_provinces?.length ?? 4;
  const aipFeeText = aip?.fees ?? "From $1,590 (Increased April 30, 2026)";
  const aipProcessingTimeText = aip?.processing_time ?? "About 26 months (Does not include biometrics)";
  const aipTitle = aip?.program_name ?? "Atlantic Immigration Program (AIP)";
  const aipBody = aip?.overview ?? "A pathway to permanent residence for skilled foreign workers and international graduates who want to live and work in Atlantic Canada.";

  const familySponsorshipTitle = familySponsorship?.program_name ?? "Family Sponsorship (Spouse, Partner or Child)";
  const familySponsorshipBody = localeKind === "tr"
    ? "Eş, fiili birliktelik partneri veya bağımlı çocuğunuzu Kanada'da daimi oturma için sponsor edin. Bağlayıcı sponsorluk yükümlülüğü ve açık çalışma izni yolu dahildir."
    : localeKind === "zh"
      ? "为您的配偶、事实伴侣或受抚养子女申请加拿大永久居留担保，包含具有约束力的担保承诺与开放式工作许可路径。"
      : "Sponsor your spouse, common-law/conjugal partner, or dependent child for Canadian permanent residence, including the binding sponsorship undertaking and open work permit pathway.";
  const familySponsorshipFee = familySponsorship?.fees ?? "From $1,260 (spouse/partner) / $180 (child)";
  const familySponsorshipProcessingTime = familySponsorship?.processing_time ?? "Varies by complexity";

  const caregiversTitle = caregivers?.program_name ?? "Home Care Workers & Caregivers (TFWP)";
  const caregiversBody = localeKind === "tr"
    ? "Federal bakıcı pilot programları kapandı. Yeni başvurular artık LMIA destekli Geçici Yabancı İşçi Programı (TFWP) veya PNP üzerinden işleniyor."
    : localeKind === "zh"
      ? "联邦护理人员试点计划已关闭。新申请现通过获得 LMIA 支持的临时外国工人计划 (TFWP) 或省提名计划 (PNP) 处理。"
      : "Federal caregiver pilot programs are closed. New applications are now processed via the LMIA-backed Temporary Foreign Worker Program (TFWP) or a PNP.";
  const caregiversFee = caregivers?.fees ?? "Work Permit fees vary; LMIA processing fees apply per application.";
  const caregiversProcessingTime = caregivers?.processing_time ?? "Varies by LMIA approval and work permit stream.";

  const pnpTitle = localize(pnp, "pathwayCovered", "Provincial Nominee Program (Non-Express Entry Process)");
  const pnpBody = localize(
    pnp,
    "note",
    "Covers federally verified process, fee, and document requirements for non-Express Entry PNP applications. Province-by-province stream eligibility is a separate layer."
  );

  const provinceCaveat = localeKind === "tr"
    ? "Eyalet bazlı stream karşılaştırması yakında ayrı modülde sunulacaktır."
    : localeKind === "zh"
      ? "按省份的细分通道对比将在独立模块中上线。"
      : "Detailed province-by-province stream comparison will be provided in a separate module.";

  const physicianCardTitle = localize(physicianOverlay, "occupationOverlay", "Live and work as a medical doctor in Canada");
  const physicianCardBody = localize(
    physicianOverlay,
    "structuralNote",
    "Physician-focused 2026 pathway updates plus separate medical licensing steps in one detailed page."
  );
  const physicianNewUpdatesCount = physicianOverlay.newFor2026?.length ?? 3;
  const pilotsFeeText = new Intl.NumberFormat(locale === "zh-Hans" ? "zh-CN" : locale === "tr" ? "tr-TR" : "en-CA", {
    style: "currency",
    currency: ruralFrancophone.sharedFees?.currency ?? "CAD",
    maximumFractionDigits: 0,
  }).format(ruralFrancophone.sharedFees?.processingFeeFrom ?? 1590);
  const rcip = (ruralFrancophone.pilots ?? []).find((pilot: Record<string, unknown>) => pilot.id === "rural_community_immigration_pilot") as Record<string, unknown> | undefined;
  const fcip = (ruralFrancophone.pilots ?? []).find((pilot: Record<string, unknown>) => pilot.id === "francophone_community_immigration_pilot") as Record<string, unknown> | undefined;
  const ruralSharedStructuralNote = localize(
    ruralFrancophone,
    "structuralNote",
    "General pilot across 14 communities with job offer, community recommendation, and PR application steps."
  );
  const rcipName = localize(
    rcip,
    "name",
    localeKind === "tr" ? "Kırsal Topluluk Göç Pilot Programı" : localeKind === "zh" ? "加拿大农村社区移民试点" : "Canada Rural Community Immigration Pilot"
  );
  const rcipPurpose = localize(rcip, "purpose", ruralSharedStructuralNote);
  const fcipName = localize(
    fcip,
    "name",
    localeKind === "tr" ? "Frankofon Topluluk Göç Pilot Programı" : localeKind === "zh" ? "加拿大法语社区移民试点" : "Canada Francophone Community Immigration Pilot"
  );
  const fcipPurpose = localize(fcip, "purpose", "Pilot across 6 Francophone-minority communities. Distinguishing eligibility: ability to communicate in French.");
  const fcipNote = localize(fcip, "note", "Note: Sudbury and Timmins appear in both pilots; review both pages.");
  const fcipLanguage = localize(fcip, "languageRequirement", "French required");
  const quebecFederalFeeText = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: quebecFederal.fees?.currency ?? "CAD",
    maximumFractionDigits: 0,
  }).format(quebecFederal.fees?.processingFeeFrom ?? 1590);
  const quebecFederalStage = localeKind === "tr"
    ? (quebecFederal.twoStageProcess_tr ?? quebecFederal.twoStageProcess)
    : localeKind === "zh"
      ? (quebecFederal.twoStageProcess_zh ?? quebecFederal.twoStageProcess)
      : quebecFederal.twoStageProcess;
  const quebecFederalProcessing = quebecFederalStage?.stage2_federal_this_document?.processingTime ?? "11 months (federal only)";
  const quebecBusinessFeeText = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: ((localeKind === "tr" ? quebecBusiness.twoStageProcess_tr : localeKind === "zh" ? quebecBusiness.twoStageProcess_zh : quebecBusiness.twoStageProcess)?.stage2_federal?.fee?.currency) ?? "CAD",
    maximumFractionDigits: 0,
  }).format(((localeKind === "tr" ? quebecBusiness.twoStageProcess_tr : localeKind === "zh" ? quebecBusiness.twoStageProcess_zh : quebecBusiness.twoStageProcess)?.stage2_federal?.fee?.from) ?? 2495);
  const pausedPrograms = pausedClosedRegistry.paused ?? [];
  const closedPrograms = pausedClosedRegistry.closed ?? [];

  return (
    <main className="min-h-screen bg-slate-50 pt-28 pb-20 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <span className="inline-block rounded-full border border-red-200 bg-red-50 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-red-600 dark:border-red-950/30 dark:bg-red-950/20 dark:text-red-400">
            CANADA
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            {ui.title}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-slate-500 dark:text-slate-400">
            {ui.subtitle}
          </p>
        </div>

        {/* Visas Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href={`/${locale}/visas/canada-quebec-business`}
            className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-violet-200 bg-violet-50 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-violet-700/40 dark:bg-violet-950/20"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-block rounded-lg bg-violet-100 px-3 py-1.5 text-xs font-extrabold tracking-wider text-violet-900 dark:bg-violet-700/30 dark:text-violet-100">
                  Quebec Business
                </span>
                <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">3 streams</span>
              </div>

              <h3 className="mt-4 text-xl font-bold text-slate-900 group-hover:text-violet-700 transition-colors dark:text-white dark:group-hover:text-violet-300">
                {localize(quebecBusiness, "pathwayCovered", "Quebec investors, entrepreneurs, self-employed")}
              </h3>
              <p className="mt-2.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300 line-clamp-4">
                {localize(quebecBusiness, "relationToOtherQuebecFile", "Three sub-streams in one page: investor, entrepreneur, and self-employed. Entrepreneur sub-stream details are marked as incomplete in source.")}
              </p>
            </div>

            <div className="mt-6 border-t border-violet-200 pt-4 dark:border-violet-800/40">
              <div className="flex items-center justify-between gap-2 text-xs text-violet-800 dark:text-violet-300">
                <div className="flex items-center gap-1 min-w-0">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Stage 2 federal fee tier (higher)</span>
                </div>
                <div className="font-semibold">
                  <span>{quebecBusinessFeeText}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end text-xs font-bold text-violet-800 group-hover:translate-x-1 transition-transform dark:text-violet-300">
                <span>{ui.viewDetails}</span>
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </div>
            </div>
          </Link>

          <Link
            href={`/${locale}/visas/canada-quebec-skilled-workers`}
            className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-amber-300 bg-amber-50 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-amber-700/40 dark:bg-amber-950/20"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-block rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-extrabold tracking-wider text-amber-900 dark:bg-amber-700/30 dark:text-amber-100">
                  Stage 2 of 2
                </span>
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Federal only</span>
              </div>

              <h3 className="mt-4 text-xl font-bold text-slate-900 group-hover:text-amber-700 transition-colors dark:text-white dark:group-hover:text-amber-300">
                {localize(
                  quebecFederal,
                  "pathwayCovered",
                  localeKind === "tr" ? "Quebec seçilmiş nitelikli işçiler (Federal aşama)" : localeKind === "zh" ? "魁北克技术工人（联邦阶段）" : "Quebec-selected skilled workers (Federal stage)"
                )}
              </h3>
              <p className="mt-2.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300 line-clamp-4">
                {localize(
                  quebecFederal,
                  "CRITICAL_STRUCTURAL_WARNING",
                  localeKind === "tr"
                    ? "Bu kart yalnızca CSQ sonrası federal IRCC aşamasını kapsar. Quebec'in kendi seçim süreci (Arrima/CSQ) burada detaylı değildir."
                    : localeKind === "zh"
                      ? "本卡仅覆盖获得 CSQ 后的联邦 IRCC 阶段；魁北克自有筛选流程（Arrima/CSQ）未在此详述。"
                      : "This covers the federal processing stage only, after you already hold a Quebec Selection Certificate (CSQ). Quebec's own selection process (Arrima/CSQ) is not yet covered in detail here."
                )}
              </p>
            </div>

            <div className="mt-6 border-t border-amber-200 pt-4 dark:border-amber-800/40">
              <div className="flex items-center justify-between gap-2 text-xs text-amber-800 dark:text-amber-300">
                <div className="flex items-center gap-1 min-w-0">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{quebecFederalProcessing}</span>
                </div>
                <div className="font-semibold">
                  <span>{quebecFederalFeeText}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end text-xs font-bold text-amber-800 group-hover:translate-x-1 transition-transform dark:text-amber-300">
                <span>{ui.viewDetails}</span>
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </div>
            </div>
          </Link>

          <Link
            href={`/${locale}/visas/canada-rural-pilot`}
            className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-block rounded-lg bg-cyan-50 px-3 py-1.5 text-xs font-extrabold tracking-wider text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400">
                  RCIP
                </span>
                <span className="text-xs font-semibold text-slate-400">Open</span>
              </div>

              <h3 className="mt-4 text-xl font-bold text-slate-900 group-hover:text-cyan-600 transition-colors dark:text-white dark:group-hover:text-cyan-400">
                {rcipName}
              </h3>
              <p className="mt-2.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-4">
                {rcipPurpose}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span>{ui.communities}: {(rcip?.numberOfCommunities as number | undefined) ?? 14}</span>
                <span>{ui.language}: EN/FR</span>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4 dark:border-zinc-800">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>{ui.pilotProgram}</span>
                </div>
                <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-zinc-300">
                  <span>{pilotsFeeText}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end text-xs font-bold text-cyan-600 group-hover:translate-x-1 transition-transform dark:text-cyan-400">
                <span>{ui.viewDetails}</span>
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </div>
            </div>
          </Link>

          <Link
            href={`/${locale}/visas/canada-francophone-pilot`}
            className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-block rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-extrabold tracking-wider text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">
                  FCIP
                </span>
                <span className="text-xs font-semibold text-slate-400">Open</span>
              </div>

              <h3 className="mt-4 text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors dark:text-white dark:group-hover:text-indigo-400">
                {fcipName}
              </h3>
              <p className="mt-2.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-4">
                {fcipPurpose}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span>{ui.communities}: {(fcip?.numberOfCommunities as number | undefined) ?? 6}</span>
                <span>{ui.language}: FR</span>
              </div>
              <p className="mt-2 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                {fcipNote}
              </p>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4 dark:border-zinc-800">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>{fcipLanguage}</span>
                </div>
                <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-zinc-300">
                  <span>{pilotsFeeText}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform dark:text-indigo-400">
                <span>{ui.viewDetails}</span>
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </div>
            </div>
          </Link>

          <Link
            href={`/${locale}/visas/canada-medical-doctor`}
            className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-block rounded-lg bg-red-50 px-3 py-1.5 text-xs font-extrabold tracking-wider text-red-700 dark:bg-red-950/40 dark:text-red-400">
                  Physician Overlay
                </span>
                <span className="text-xs font-semibold text-slate-400">2026</span>
              </div>

              <h3 className="mt-4 text-xl font-bold text-slate-900 group-hover:text-red-600 transition-colors dark:text-white dark:group-hover:text-red-400">
                {physicianCardTitle}
              </h3>
              <p className="mt-2.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-4">
                {physicianCardBody}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span>{ui.newUpdates}: {physicianNewUpdatesCount}</span>
                <span>{ui.tracks}: 2</span>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4 dark:border-zinc-800">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>{ui.updated2026}</span>
                </div>
                <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-zinc-300">
                  <span>Dual-track</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end text-xs font-bold text-red-600 group-hover:translate-x-1 transition-transform dark:text-red-400">
                <span>{ui.viewDetails}</span>
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </div>
            </div>
          </Link>

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
                  Permanent
                </span>
              </div>

              <h3 className="mt-4 text-xl font-bold text-slate-900 group-hover:text-rose-600 transition-colors dark:text-white dark:group-hover:text-rose-450">
                {localize(ee, "pathwayCovered", "Express Entry Canada")}
              </h3>
              <p className="mt-2.5 text-xs leading-relaxed text-slate-500 line-clamp-3 dark:text-slate-400">
                {ee.pathwayCovered ?? "Express Entry only (CEC, FSW, FSTP, CRS)"}
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
                <span>{ui.viewDetails}</span>
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </div>
            </div>
          </Link>

          <Link
            href={`/${locale}/visas/canada-pnp-non-express-entry`}
            className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-block rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-extrabold tracking-wider text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                  PNP Non-Express Entry
                </span>
                <span className="text-xs font-semibold text-slate-400">Open</span>
              </div>

              <h3 className="mt-4 text-xl font-bold text-slate-900 group-hover:text-emerald-600 transition-colors dark:text-white dark:group-hover:text-emerald-400">
                {pnpTitle}
              </h3>
              <p className="mt-2.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {pnpBody}
              </p>
              <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                {provinceCaveat}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span>{ui.processSteps}: {pnpStepsCount}</span>
                <span>{ui.supportingDocs}: {pnpDocsCount}</span>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4 dark:border-zinc-800">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>{pnpProcessingTimeText}</span>
                </div>
                <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-zinc-300">
                  <span>{pnpFeeText}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform dark:text-emerald-400">
                <span>{ui.viewDetails}</span>
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </div>
            </div>
          </Link>

          <Link
            href={`/${locale}/visas/atlantic-immigration-program`}
            className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-block rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-extrabold tracking-wider text-sky-700 dark:bg-sky-950/40 dark:text-sky-400">
                  Atlantic Immigration Program
                </span>
                <span className="text-xs font-semibold text-slate-400">Open</span>
              </div>

              <h3 className="mt-4 text-xl font-bold text-slate-900 group-hover:text-sky-600 transition-colors dark:text-white dark:group-hover:text-sky-400">
                {aipTitle}
              </h3>
              <p className="mt-2.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-4">
                {aipBody}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span>{ui.targetProvinces}: {aipProvincesCount}</span>
                <span>{ui.status}: Open</span>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4 dark:border-zinc-800">
              <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
                <div className="flex items-center gap-1 min-w-0">
                  <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{aipProcessingTimeText}</span>
                </div>
                <div className="font-semibold text-slate-700 dark:text-zinc-300 text-right">
                  <span>{aipFeeText}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end text-xs font-bold text-sky-600 group-hover:translate-x-1 transition-transform dark:text-sky-400">
                <span>{ui.viewDetails}</span>
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </div>
            </div>
          </Link>

          <Link
            href={`/${locale}/visas/canada-family-sponsorship`}
            className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-block rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-extrabold tracking-wider text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                  Family Sponsorship
                </span>
                <span className="text-xs font-semibold text-slate-400">Open</span>
              </div>

              <h3 className="mt-4 text-xl font-bold text-slate-900 group-hover:text-rose-600 transition-colors dark:text-white dark:group-hover:text-rose-400">
                {familySponsorshipTitle}
              </h3>
              <p className="mt-2.5 text-xs leading-relaxed text-slate-500 line-clamp-4 dark:text-slate-400">
                {familySponsorshipBody}
              </p>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4 dark:border-zinc-800">
              <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
                <div className="flex items-center gap-1 min-w-0">
                  <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{familySponsorshipProcessingTime}</span>
                </div>
                <div className="font-semibold text-slate-700 dark:text-zinc-300 text-right">
                  <span className="truncate">{familySponsorshipFee}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end text-xs font-bold text-rose-600 group-hover:translate-x-1 transition-transform dark:text-rose-400">
                <span>{ui.viewDetails}</span>
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </div>
            </div>
          </Link>

          <Link
            href={`/${locale}/visas/canada-caregivers`}
            className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-block rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-extrabold tracking-wider text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                  TFWP / LMIA-based
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {ui.pilotsClosed}
                </span>
              </div>

              <h3 className="mt-4 text-xl font-bold text-slate-900 group-hover:text-amber-600 transition-colors dark:text-white dark:group-hover:text-amber-400">
                {caregiversTitle}
              </h3>
              <p className="mt-2.5 text-xs leading-relaxed text-slate-500 line-clamp-4 dark:text-slate-400">
                {caregiversBody}
              </p>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4 dark:border-zinc-800">
              <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
                <div className="flex items-center gap-1 min-w-0">
                  <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{caregiversProcessingTime}</span>
                </div>
                <div className="font-semibold text-slate-700 dark:text-zinc-300 text-right">
                  <span className="truncate">{caregiversFee}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end text-xs font-bold text-amber-600 group-hover:translate-x-1 transition-transform dark:text-amber-400">
                <span>{ui.viewDetails}</span>
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </div>
            </div>
          </Link>
        </div>

        <section className="mt-14">
          <details className="group rounded-2xl border border-slate-200 bg-slate-100/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-800 dark:text-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>
                  {ui.pausedClosedSummary}
                </span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {ui.referenceOnly} - {pausedPrograms.length + closedPrograms.length}
                </span>
              </div>
            </summary>

            <div className="mt-4 space-y-5 border-t border-slate-200 pt-4 dark:border-zinc-800">
              <p className="text-xs leading-5 text-slate-600 dark:text-slate-400">{localize(pausedClosedRegistry, "purpose")}</p>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-700/30 dark:bg-amber-950/20 dark:text-amber-100">
                <p className="font-semibold">Cross-reference warning</p>
                <p className="mt-1">{localize(pausedClosedRegistry.importantCrossReference as Record<string, unknown> | undefined, "warning")}</p>
                <p className="mt-1">{localize(pausedClosedRegistry.importantCrossReference as Record<string, unknown> | undefined, "actionNeeded")}</p>
                <p className="mt-1">
                  {ui.qcSelfEmployedNote}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Paused</p>
                <div className="space-y-2">
                  {pausedPrograms.map((item) => (
                    <div key={item.name} className="rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 dark:text-white">
                          {localize(item as Record<string, unknown>, "name", item.name)}
                        </a>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                          {localizeStatus(item as Record<string, unknown>) ?? "paused"}
                        </span>
                      </div>
                      {(localize(item as Record<string, unknown>, "note") || item.note) ? <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{localize(item as Record<string, unknown>, "note", item.note)}</p> : null}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Closed</p>
                <div className="space-y-2">
                  {closedPrograms.map((item) => (
                    <div key={item.name} className="rounded-lg border border-slate-200 bg-white p-3 text-sm opacity-85 dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 dark:text-white">
                          {localize(item as Record<string, unknown>, "name", item.name)}
                        </a>
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-rose-900 dark:bg-rose-900/40 dark:text-rose-200">
                          {localizeStatus(item as Record<string, unknown>) ?? "closed"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{localize(item as Record<string, unknown>, "category", item.category)}</p>
                      {(localize(item as Record<string, unknown>, "note") || item.note) ? <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{localize(item as Record<string, unknown>, "note", item.note)}</p> : null}
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Last verified: {pausedClosedRegistry.lastVerified}
              </p>
            </div>
          </details>
        </section>
      </div>
    </main>
  );
}
