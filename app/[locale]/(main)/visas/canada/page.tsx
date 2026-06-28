import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import expressEntryData from "@/src/data/countries/ca/express-entry.json";
import pnpProcessData from "@/src/data/countries/ca/pnp-non-express-process.json";
import physicianOverlayData from "@/src/data/countries/ca/occupation-overlays/physician.json";
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
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";

  const ee = expressEntryData as {
    fees?: { mainApplicant?: number; currency?: string };
    processingTimes?: string;
    pathwayCovered?: string;
  };
  const pnp = pnpProcessData as {
    pathwayCovered?: string;
    processingTime?: { estimate?: string };
    fees?: { processingFeeFrom?: number; currency?: string };
    processSteps?: Array<{ step: number; name: string }>;
    documentsRequired?: { supportingDocuments?: string[] };
    sourceUrl?: string;
  };
  const physicianOverlay = physicianOverlayData as {
    newFor2026?: string[];
  };
  const ruralFrancophone = ruralFrancophonePilotsData as {
    sharedFees?: { processingFeeFrom?: number; currency?: string };
    pilots?: Array<{
      id: string;
      name?: string;
      numberOfCommunities?: number;
      languageRequirement?: string;
      note?: string;
    }>;
  };
  const quebecFederal = quebecSelectedFederalData as {
    fees?: { processingFeeFrom?: number; currency?: string };
    twoStageProcess?: {
      stage2_federal_this_document?: { processingTime?: string };
    };
  };
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

  const title = isTr ? "Kanada Vize Yolları" : isZh ? "加拿大移民通道" : "Canada Visa Pathways";
  const subtitle = isTr 
    ? "Kanada'da daimi oturum sahibi olmak ve çalışmak için güncel vize seçeneklerini keşfedin." 
    : isZh 
    ? "探索在加拿大永久居留和工作的最新签证选择。" 
    : "Explore up-to-date visa options to work and settle permanently in Canada.";

  const viewDetailsLabel = isTr ? "Detayları İncele" : isZh ? "查看详情" : "View Details";

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

  const processingTimeText = ee.processingTimes ?? (isTr ? "Programa göre değişir" : isZh ? "视具体项目而定" : "Varies by program");
  const pnpProcessingTimeText = pnp.processingTime?.estimate ?? (isTr ? "Yaklaşık 13 ay" : isZh ? "约13个月" : "about 13 months");
  const pnpStepsCount = pnp.processSteps?.length ?? 0;
  const pnpDocsCount = pnp.documentsRequired?.supportingDocuments?.length ?? 0;
  const aipProvincesCount = aip?.target_provinces?.length ?? 4;
  const aipFeeText = aip?.fees ?? "From $1,590 (Increased April 30, 2026)";
  const aipProcessingTimeText = aip?.processing_time ?? "About 26 months (Does not include biometrics)";
  const aipTitle = aip?.program_name ?? "Atlantic Immigration Program (AIP)";
  const aipBody = aip?.overview ?? "A pathway to permanent residence for skilled foreign workers and international graduates who want to live and work in Atlantic Canada.";

  const familySponsorshipTitle = familySponsorship?.program_name ?? "Family Sponsorship (Spouse, Partner or Child)";
  const familySponsorshipBody = isTr
    ? "Eş, fiili birliktelik partneri veya bağımlı çocuğunuzu Kanada'da daimi oturma için sponsor edin. Bağlayıcı sponsorluk yükümlülüğü ve açık çalışma izni yolu dahildir."
    : isZh
      ? "为您的配偶、事实伴侣或受抚养子女申请加拿大永久居留担保，包含具有约束力的担保承诺与开放式工作许可路径。"
      : "Sponsor your spouse, common-law/conjugal partner, or dependent child for Canadian permanent residence, including the binding sponsorship undertaking and open work permit pathway.";
  const familySponsorshipFee = familySponsorship?.fees ?? "From $1,260 (spouse/partner) / $180 (child)";
  const familySponsorshipProcessingTime = familySponsorship?.processing_time ?? "Varies by complexity";

  const caregiversTitle = caregivers?.program_name ?? "Home Care Workers & Caregivers (TFWP)";
  const caregiversBody = isTr
    ? "Federal bakıcı pilot programları kapandı. Yeni başvurular artık LMIA destekli Geçici Yabancı İşçi Programı (TFWP) veya PNP üzerinden işleniyor."
    : isZh
      ? "联邦护理人员试点计划已关闭。新申请现通过获得 LMIA 支持的临时外国工人计划 (TFWP) 或省提名计划 (PNP) 处理。"
      : "Federal caregiver pilot programs are closed. New applications are now processed via the LMIA-backed Temporary Foreign Worker Program (TFWP) or a PNP.";
  const caregiversFee = caregivers?.fees ?? "Work Permit fees vary; LMIA processing fees apply per application.";
  const caregiversProcessingTime = caregivers?.processing_time ?? "Varies by LMIA approval and work permit stream.";

  const pnpTitle = isTr
    ? "Provincial Nominee Program (Non-Express Entry Süreci)"
    : isZh
      ? "省提名计划（非快速通道流程）"
      : "Provincial Nominee Program (Non-Express Entry Process)";

  const pnpBody = isTr
    ? "Federal düzeyde doğrulanmış başvuru süreci, ücret ve belge adımlarını kapsar. Eyalete göre hangi stream'e uygun olduğunuz değerlendirmesi ayrı bir katmandır."
    : isZh
      ? "覆盖联邦层面已核实的申请流程、费用和材料步骤。按省份判断您适合哪个类别属于单独模块。"
      : "Covers federally verified process, fee, and document requirements for non-Express Entry PNP applications. Province-by-province stream eligibility is a separate layer.";

  const provinceCaveat = isTr
    ? "Eyalet bazlı stream karşılaştırması yakında ayrı modülde sunulacaktır."
    : isZh
      ? "按省份的细分通道对比将在独立模块中上线。"
      : "Detailed province-by-province stream comparison will be provided in a separate module.";

  const physicianCardTitle = isTr
    ? "Live and work as a medical doctor in Canada"
    : isZh
      ? "Live and work as a medical doctor in Canada"
      : "Live and work as a medical doctor in Canada";
  const physicianCardBody = isTr
    ? "Doktorlar için yeni 2026 pathway güncellemeleri + göçten bağımsız tıbbi lisanslama adımlarını birlikte gösteren detay sayfası."
    : isZh
      ? "面向医生的 2026 新路径更新 + 独立医疗执照步骤，整合在一个详细页面中。"
      : "Physician-focused 2026 pathway updates plus separate medical licensing steps in one detailed page.";
  const physicianNewUpdatesCount = physicianOverlay.newFor2026?.length ?? 3;
  const pilotsFeeText = new Intl.NumberFormat(locale === "zh-Hans" ? "zh-CN" : locale === "tr" ? "tr-TR" : "en-CA", {
    style: "currency",
    currency: ruralFrancophone.sharedFees?.currency ?? "CAD",
    maximumFractionDigits: 0,
  }).format(ruralFrancophone.sharedFees?.processingFeeFrom ?? 1590);
  const rcip = ruralFrancophone.pilots?.find((pilot) => pilot.id === "rural_community_immigration_pilot");
  const fcip = ruralFrancophone.pilots?.find((pilot) => pilot.id === "francophone_community_immigration_pilot");
  const quebecFederalFeeText = new Intl.NumberFormat(locale === "zh-Hans" ? "zh-CN" : locale === "tr" ? "tr-TR" : "en-CA", {
    style: "currency",
    currency: quebecFederal.fees?.currency ?? "CAD",
    maximumFractionDigits: 0,
  }).format(quebecFederal.fees?.processingFeeFrom ?? 1590);
  const quebecFederalProcessing = quebecFederal.twoStageProcess?.stage2_federal_this_document?.processingTime ?? "11 months (federal only)";

  return (
    <main className="min-h-screen bg-slate-50 pt-28 pb-20 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <span className="inline-block rounded-full border border-red-200 bg-red-50 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-red-600 dark:border-red-950/30 dark:bg-red-950/20 dark:text-red-400">
            CANADA
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            {title}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        </div>

        {/* Visas Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                {isTr ? "Quebec-selected skilled workers (Federal stage)" : isZh ? "魁北克技术工人（联邦阶段）" : "Quebec-selected skilled workers (Federal stage)"}
              </h3>
              <p className="mt-2.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300 line-clamp-4">
                {isTr
                  ? "Bu kart yalnizca CSQ sonrasi federal IRCC asamasini kapsar. Quebec'in kendi secim sureci (Arrima/CSQ) burada detayli degildir."
                  : isZh
                    ? "此卡仅覆盖拿到 CSQ 之后的联邦 IRCC 阶段。魁北克自身筛选流程（Arrima/CSQ）未在此详细覆盖。"
                    : "This covers the federal processing stage only, after you already hold a Quebec Selection Certificate (CSQ). Quebec's own selection process (Arrima/CSQ) is not yet covered in detail here."}
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
                <span>{viewDetailsLabel}</span>
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
                {isTr ? "Canada Rural Community Immigration Pilot" : isZh ? "加拿大乡村社区移民试点" : "Canada Rural Community Immigration Pilot"}
              </h3>
              <p className="mt-2.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-4">
                {isTr
                  ? "14 topluluk odakli genel pilot. Gecerli is teklifi, topluluk tavsiyesi ve PR basvurusu adimlarini izler."
                  : isZh
                    ? "覆盖 14 个社区的通用试点。流程包含有效工作聘书、社区推荐和永居申请。"
                    : "General pilot across 14 communities with job offer, community recommendation, and PR application steps."}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span>{isTr ? "Topluluk" : isZh ? "社区" : "Communities"}: {rcip?.numberOfCommunities ?? 14}</span>
                <span>{isTr ? "Dil" : isZh ? "语言" : "Language"}: EN/FR</span>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4 dark:border-zinc-800">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>{isTr ? "Pilot Program" : isZh ? "试点项目" : "Pilot program"}</span>
                </div>
                <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-zinc-300">
                  <span>{pilotsFeeText}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end text-xs font-bold text-cyan-600 group-hover:translate-x-1 transition-transform dark:text-cyan-400">
                <span>{viewDetailsLabel}</span>
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
                {isTr ? "Canada Francophone Community Immigration Pilot" : isZh ? "加拿大法语社区移民试点" : "Canada Francophone Community Immigration Pilot"}
              </h3>
              <p className="mt-2.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-4">
                {isTr
                  ? "6 Francophone-minority topluluga odakli pilot. Ayristirici uygunluk farki: Fransizca iletisimi zorunlu."
                  : isZh
                    ? "面向 6 个法语少数社区。核心区分条件：必须具备法语沟通能力。"
                    : "Pilot across 6 Francophone-minority communities. Distinguishing eligibility: ability to communicate in French."}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span>{isTr ? "Topluluk" : isZh ? "社区" : "Communities"}: {fcip?.numberOfCommunities ?? 6}</span>
                <span>{isTr ? "Dil" : isZh ? "语言" : "Language"}: FR</span>
              </div>
              <p className="mt-2 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                {isTr
                  ? "Not: Sudbury ve Timmins iki pilotta da var; iki sayfayi da inceleyin."
                  : isZh
                    ? "注意：Sudbury 和 Timmins 同时存在于两个试点，请同时查看两页。"
                    : "Note: Sudbury and Timmins appear in both pilots; review both pages."}
              </p>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4 dark:border-zinc-800">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>{fcip?.languageRequirement ?? "French required"}</span>
                </div>
                <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-zinc-300">
                  <span>{pilotsFeeText}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform dark:text-indigo-400">
                <span>{viewDetailsLabel}</span>
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
                <span>{isTr ? "Yeni güncelleme" : isZh ? "新增更新" : "New updates"}: {physicianNewUpdatesCount}</span>
                <span>{isTr ? "Track" : isZh ? "路径" : "Tracks"}: 2</span>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4 dark:border-zinc-800">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>{isTr ? "Güncel 2026" : isZh ? "2026 已更新" : "Updated for 2026"}</span>
                </div>
                <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-zinc-300">
                  <span>Dual-track</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end text-xs font-bold text-red-600 group-hover:translate-x-1 transition-transform dark:text-red-400">
                <span>{viewDetailsLabel}</span>
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
                {isTr ? "Express Entry Canada" : isZh ? "加拿大快速通道 Express Entry" : "Express Entry Canada"}
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
                <span>{viewDetailsLabel}</span>
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
                <span>{isTr ? "Süreç adımı" : isZh ? "流程步骤" : "Process steps"}: {pnpStepsCount}</span>
                <span>{isTr ? "Destekleyici belge" : isZh ? "支持材料" : "Supporting docs"}: {pnpDocsCount}</span>
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
                <span>{viewDetailsLabel}</span>
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
                <span>{isTr ? "Hedef eyalet" : isZh ? "目标省份" : "Target provinces"}: {aipProvincesCount}</span>
                <span>{isTr ? "Durum" : isZh ? "状态" : "Status"}: Open</span>
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
                <span>{viewDetailsLabel}</span>
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
                <span>{viewDetailsLabel}</span>
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
                  {isTr ? "Pilot Kapandı" : isZh ? "试点已关闭" : "Pilots Closed"}
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
                <span>{viewDetailsLabel}</span>
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
