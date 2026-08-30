import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Clock3,
  DollarSign,
  ExternalLink,
  FileWarning,
  ListChecks,
  MapPin,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VisaPdfDownloadCard } from "@/components/visa-pdf-download-card";
import { getTranslations } from "@/lib/i18n/get-translations";
import type { Locale } from "@/lib/i18n/config";
import visaDetails from "@/src/data/visa-details.json";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

type PageProps = {
  params: Promise<{ locale: string }>;
};

type CaregiversData = {
  id?: string;
  program_name?: string;
  status?: string;
  fees?: string;
  processing_time?: string;
  pdfSnapshotUrls?: string[];
  overview?: string;
  temporary_work_permit?: {
    requirements?: {
      who_can_apply?: string[];
      who_cannot_apply?: string[];
    };
    employer_lmia_process?: {
      recruitment?: string;
      application_method?: string;
      quebec_specific?: string;
    };
  };
  proof_of_experience_submission?: {
    scope?: string;
    documentation?: string[];
    submission_protocol?: string;
  };
};

function getData(): CaregiversData {
  const data = (visaDetails as CaregiversData[]).find(
    (item) => item.id === "canada-caregivers-tfwp"
  );
  if (!data) {
    throw new Error("canada-caregivers-tfwp entry missing from visa-details.json");
  }
  return data;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const data = getData();
  const title =
    locale === "tr"
      ? "Kanada Evde Bakim Calisanlari ve Bakicilar (TFWP) | LogiVisa"
      : locale === "zh-Hans"
        ? "加拿大家庭护理工作者与护理人员（TFWP）| LogiVisa"
        : `${data.program_name ?? "Canada Home Care Workers & Caregivers"} | LogiVisa`;
  const description =
    locale === "tr"
      ? "Federal bakici pilotlari kapandi; yeni bakici basvurulari artik TFWP (LMIA) veya PNP uzerinden ilerler."
      : locale === "zh-Hans"
        ? "联邦护理人员试点已关闭；新申请现通过 TFWP（LMIA）或 PNP 进行。"
        : data.overview ?? "Federal caregiver pilots are closed; caregivers now apply via TFWP (LMIA) or PNP.";

  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    alternates: {
      canonical: `/${locale}/visas/canada-caregivers`,
      languages: {
        en: `/en/visas/canada-caregivers`,
        tr: `/tr/visas/canada-caregivers`,
        "zh-Hans": `/zh-Hans/visas/canada-caregivers`,
      },
    },
  };
}

const PROVINCIAL_NOTES: Array<{ code: string; label: { en: string; tr: string; "zh-Hans": string }; note: { en: string; tr: string; "zh-Hans": string } }> = [
  {
    code: "BC",
    label: { en: "British Columbia", tr: "British Columbia", "zh-Hans": "British Columbia" },
    note: {
      en: "Home support workers may also be considered under the BC PNP Skilled Worker stream once a valid job offer and LMIA (or LMIA-exempt work permit) are in place.",
      tr: "Geçerli bir iş teklifi ve LMIA (veya LMIA'dan muaf çalışma izni) bulunduğunda, ev bakım işçileri BC PNP Skilled Worker akımı kapsamında da değerlendirilebilir.",
      "zh-Hans": "在获得有效工作邀约及 LMIA（或免 LMIA 工作许可）后，家庭护理工作者也可被纳入 BC PNP 技术工人类别考虑。",
    },
  },
  {
    code: "MB",
    label: { en: "Manitoba", tr: "Manitoba", "zh-Hans": "Manitoba" },
    note: {
      en: "Manitoba's Skilled Worker in Manitoba stream can register caregivers with an existing work permit and qualifying job offer for provincial nomination.",
      tr: "Manitoba'nın Skilled Worker in Manitoba akımı, mevcut bir çalışma izni ve uygun iş teklifi olan bakıcıları eyalet adaylığı için kaydedebilir.",
      "zh-Hans": "曼尼托巴省技术工人类别可为已持有工作许可并获得符合条件工作邀约的护理人员注册省提名。",
    },
  },
  {
    code: "SK",
    label: { en: "Saskatchewan", tr: "Saskatchewan", "zh-Hans": "Saskatchewan" },
    note: {
      en: "Saskatchewan's International Skilled Worker - Employment Offer sub-category accepts caregiver job offers supported by a positive LMIA.",
      tr: "Saskatchewan'ın International Skilled Worker - Employment Offer alt kategorisi, olumlu LMIA ile desteklenen bakıcı iş tekliflerini kabul eder.",
      "zh-Hans": "萨斯喀彻温省国际技术工人—工作邀约子类别接受获得正面 LMIA 支持的护理工作邀约。",
    },
  },
  {
    code: "NS",
    label: { en: "Nova Scotia", tr: "Nova Scotia", "zh-Hans": "Nova Scotia" },
    note: {
      en: "Nova Scotia Demand: Express Entry stream can register CLB 5+ caregivers with NOC eligibility and a recent LMIA-supported job offer.",
      tr: "Nova Scotia Demand: Express Entry akımı, NOC uygunluğu ve güncel LMIA destekli iş teklifi olan CLB 5+ bakıcıları kaydedebilir.",
      "zh-Hans": "Nova Scotia Demand: Express Entry 类别可为符合 NOC 资格、CLB 5 以上且持有近期 LMIA 支持工作邀约的护理人员注册。",
    },
  },
  {
    code: "QC",
    label: { en: "Quebec (MIFI / CAQ)", tr: "Quebec (MIFI / CAQ)", "zh-Hans": "魁北克 (MIFI / CAQ)" },
    note: {
      en: "Quebec-bound caregivers must file a Certificat d'acceptation du Québec (CAQ) application with the Ministère de l'Immigration, de la Francisation et de l'Intégration (MIFI) at the same time as the federal work permit application, for any work period over 30 days.",
      tr: "Quebec'e gidecek bakıcılar, 30 günü aşan tüm çalışma dönemleri için federal çalışma izni başvurusuyla eş zamanlı olarak Ministère de l'Immigration, de la Francisation et de l'Intégration (MIFI) nezdinde Certificat d'acceptation du Québec (CAQ) başvurusu yapmalıdır.",
      "zh-Hans": "前往魁北克的护理人员，凡工作期限超过30天，须在提交联邦工作许可申请的同时，向魁北克移民、法语推广与融入部（MIFI）提交《魁北克接受证书》（CAQ）申请。",
    },
  },
];

export default async function CanadaCaregiversPage({ params }: PageProps) {
  const { locale } = await params;
  const translations = await getTranslations(locale as Locale);
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const data = getData();

  const title = isTr
    ? "Kanada Ev Bakım İşçileri ve Bakıcılar (TFWP)"
    : isZh
      ? "加拿大家庭护理工作者与护理人员 (TFWP)"
      : "Canada Home Care Workers & Caregivers (TFWP)";
  const subtitle = isTr
    ? "Federal pilot programları kapandı. Yeni bakıcılar artık LMIA destekli Geçici Yabancı İşçi Programı (TFWP) veya PNP üzerinden başvuruyor."
    : isZh
      ? "联邦试点计划已关闭。新护理人员现须通过获得 LMIA 支持的临时外国工人计划 (TFWP) 或省提名计划 (PNP) 申请。"
      : "The federal pilot programs are closed. New caregivers now apply through the LMIA-backed Temporary Foreign Worker Program (TFWP) or a PNP.";

  const checkEligibilityLabel = t(translations, "visas.checkEligibility", "Check your eligibility");
  const visitOfficialWebsiteLabel = t(translations, "visas.visitOfficialWebsite", "Visit official website");
  const backToVisasLabel = t(translations, "visas.backToVisas", "Back to visas");
  const officialInfoLabel = t(translations, "visas.officialInfo", "Official Information");

  const requirements = data.temporary_work_permit?.requirements ?? {};
  const lmiaProcess = data.temporary_work_permit?.employer_lmia_process ?? {};
  const proofOfExperience = data.proof_of_experience_submission ?? {};
  const pdfUrls = data.pdfSnapshotUrls ?? [];

  const lang = isTr ? "tr" : isZh ? "zh-Hans" : "en";
  const trMap: Record<string, string> = {
    "TFWP / LMIA-based": "TFWP / LMIA tabanli",
    "Pilot Programs Closed; TFWP (LMIA) Open": "Pilot Programlar Kapali; TFWP (LMIA) Acik",
    "Work Permit fees vary; LMIA processing fees apply per application.": "Calisma izni ucretleri degisir; LMIA islem ucretleri her basvuru icin ayrica uygulanir.",
    "Varies by LMIA approval and work permit stream.": "LMIA onayi ve calisma izni akimina gore degisir.",
    "Federal caregiver pilot programs (Home Child Care Provider/Support Worker) are CLOSED as of June 2024. New caregivers must now enter through the Temporary Foreign Worker Program (TFWP) with a positive Labour Market Impact Assessment (LMIA).": "Federal bakici pilot programlari (Home Child Care Provider/Support Worker) Haziran 2024 itibariyla KAPALIDIR. Yeni bakicilar artik pozitif Labour Market Impact Assessment (LMIA) ile Temporary Foreign Worker Program (TFWP) uzerinden basvurur.",
    "Outside Canada: Only if working in Quebec.": "Kanada disindan: Yalnizca Quebec'te calisacaksa.",
    "Inside Canada: If you have a valid study/work permit OR are allowed to work without a permit.": "Kanada icinden: Gecerli ogrenci/calisma izniniz varsa VEYA izinsiz calisma hakkiniz varsa.",
    "Quebec-bound workers may apply from inside Canada if eligible.": "Quebec'e gidecek calisanlar uygunluk varsa Kanada icinden basvurabilir.",
    "Applying from outside Canada (excluding Quebec).": "Kanada disindan basvuru (Quebec haric).",
    "Applying at a port of entry.": "Sinir giris noktasinda basvuru.",
    "Currently in Canada as a visitor (with limited exceptions).": "Su anda Kanada'da ziyaretci statusunde olmak (sinirli istisnalar disinda).",
    "Employer must advertise the position for 4 weeks (high-wage) or 8 weeks (low-wage) to prove no Canadians are available.": "Isveren, Kanadali aday bulunamadigini gostermek icin pozisyonu 4 hafta (yuksek ucret) veya 8 hafta (dusuk ucret) ilan etmelidir.",
    "Must use 'LMIA Online' with a Job Bank for Employers account.": "Isveren hesabiyla Job Bank uzerinden 'LMIA Online' kullanilmalidir.",
    "Must file simultaneously with MIFI (CAQ) and Service Canada (LMIA) for periods over 30 days.": "30 gunden uzun sureler icin MIFI (CAQ) ve Service Canada (LMIA) basvurulari es zamanli yapilmalidir.",
    "Only for those who already submitted applications to the now-closed pilots.": "Yalnizca artik kapali olan pilotlara daha once basvuru yapmis kisiler icindir.",
    "Schedule 19b: Home Child Care Provider or Home Support Worker – Work Experience form [IMM 5910].": "Schedule 19b: Home Child Care Provider veya Home Support Worker – Work Experience formu [IMM 5910].",
    "T4 tax slips and Notice of Assessment (NOA) (Must mask SIN).": "T4 vergi dokumleri ve Notice of Assessment (NOA) (SIN bilgisi maskelenmelidir).",
    "Detailed Reference Letters: Start/end dates, NOC code, duties, salary/hours, employer contact/signature/letterhead.": "Detayli referans mektuplari: baslangic/bitis tarihleri, NOC kodu, gorevler, maas/saat, isveren iletisim/imza/antet.",
    "Proof of payment: Bank deposits, pay stubs, work contracts, ROEs.": "Odeme kaniti: banka yatirimlari, maas bordrolari, is sozlesmeleri, ROE belgeleri.",
    "Must be sent via Web Form. Naming convention: 'Proof of experience - #'. Max size 2MB per file (3.5MB total). Use E-number (not W-number) for PR applications.": "Cevrimici form uzerinden gonderilmelidir. Dosya adlandirmasi: 'Proof of experience - #'. Dosya basi en fazla 2MB (toplam 3.5MB). PR basvurularinda W numarasi yerine E numarasi kullanin."
  };
  const zhMap: Record<string, string> = {
    "TFWP / LMIA-based": "基于 TFWP / LMIA",
    "Pilot Programs Closed; TFWP (LMIA) Open": "试点项目已关闭；TFWP（LMIA）开放中",
    "Work Permit fees vary; LMIA processing fees apply per application.": "工签费用因情况而异；每份申请均需支付 LMIA 处理费。",
    "Varies by LMIA approval and work permit stream.": "取决于 LMIA 审批及工签类别。",
    "Federal caregiver pilot programs (Home Child Care Provider/Support Worker) are CLOSED as of June 2024. New caregivers must now enter through the Temporary Foreign Worker Program (TFWP) with a positive Labour Market Impact Assessment (LMIA).": "联邦护理人员试点（家庭儿童护理提供者/家庭支持工作者）自 2024 年 6 月起已关闭。新申请人现须通过获得正面劳动力市场影响评估（LMIA）的临时外国工人计划（TFWP）进入。",
    "Outside Canada: Only if working in Quebec.": "加拿大境外：仅限在魁北克工作的申请人。",
    "Inside Canada: If you have a valid study/work permit OR are allowed to work without a permit.": "加拿大境内：持有有效学习/工作许可，或依法可无需许可工作。",
    "Quebec-bound workers may apply from inside Canada if eligible.": "如符合条件，赴魁北克工作者可在加拿大境内申请。",
    "Applying from outside Canada (excluding Quebec).": "从加拿大境外申请（魁北克除外）。",
    "Applying at a port of entry.": "在入境口岸申请。",
    "Currently in Canada as a visitor (with limited exceptions).": "当前以访客身份在加拿大（少数例外除外）。",
    "Employer must advertise the position for 4 weeks (high-wage) or 8 weeks (low-wage) to prove no Canadians are available.": "雇主须发布职位广告 4 周（高薪）或 8 周（低薪），以证明无加拿大本地候选人可用。",
    "Must use 'LMIA Online' with a Job Bank for Employers account.": "必须使用雇主 Job Bank 账户通过 'LMIA Online' 提交。",
    "Must file simultaneously with MIFI (CAQ) and Service Canada (LMIA) for periods over 30 days.": "工作期超过 30 天时，须同时向 MIFI（CAQ）与 Service Canada（LMIA）提交申请。",
    "Only for those who already submitted applications to the now-closed pilots.": "仅适用于已向现已关闭试点提交过申请的人士。",
    "Schedule 19b: Home Child Care Provider or Home Support Worker – Work Experience form [IMM 5910].": "Schedule 19b：家庭儿童护理提供者或家庭支持工作者—工作经验证明表 [IMM 5910]。",
    "T4 tax slips and Notice of Assessment (NOA) (Must mask SIN).": "T4 税单与评税通知（NOA）（须遮盖 SIN）。",
    "Detailed Reference Letters: Start/end dates, NOC code, duties, salary/hours, employer contact/signature/letterhead.": "详细推荐信：起止日期、NOC 代码、职责、薪资/工时、雇主联系方式/签名/抬头纸。",
    "Proof of payment: Bank deposits, pay stubs, work contracts, ROEs.": "付款证明：银行入账记录、工资单、劳动合同、ROE。",
    "Must be sent via Web Form. Naming convention: 'Proof of experience - #'. Max size 2MB per file (3.5MB total). Use E-number (not W-number) for PR applications.": "必须通过在线表单提交。命名规则：'Proof of experience - #'。每个文件最大 2MB（总计 3.5MB）。PR 申请请使用 E 编号（非 W 编号）。"
  };
  const l = (value?: string) => {
    if (!value) return "";
    if (isTr) return trMap[value] ?? value;
    if (isZh) return zhMap[value] ?? value;
    return value;
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20 dark:from-slate-950 dark:to-slate-900">
      <section className="mx-auto max-w-6xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link
            href={`/${locale}/visas/canada`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {backToVisasLabel}
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
            <Sparkles className="h-4 w-4" />
            {officialInfoLabel}
          </div>
        </div>

        {/* Primary Banner: Pilot Programs Closed */}
        <div className="mb-8 rounded-2xl border-2 border-red-300 bg-red-50 p-5 dark:border-red-500/40 dark:bg-red-500/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
            <p className="text-sm font-bold leading-6 text-red-900 dark:text-red-100 sm:text-base">
              {isTr
                ? "🚨 FEDERAL PİLOT PROGRAMLAR KAPANDI: Home Child Care Provider ve Home Support Worker pilotları 17 Haziran 2024'te kapandı. Başvurular artık TFWP (LMIA) veya PNP üzerinden işleniyor."
                : isZh
                  ? "🚨 联邦试点计划已关闭：家庭儿童护理提供者及家庭支持工作者试点计划已于2024年6月17日关闭。申请现通过 TFWP（LMIA）或 PNP 处理。"
                  : "🚨 FEDERAL PILOT PROGRAMS CLOSED: Home Child Care Provider and Home Support Worker pilots closed on June 17, 2024. Applications are now processed via TFWP (LMIA) or PNP."}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100">Canada</Badge>
                  <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-100">
                    {l("TFWP / LMIA-based")}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                    {title}
                  </h1>
                  <p className="max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
                    {subtitle}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <DollarSign className="h-4 w-4 text-rose-600" />
                    {isTr ? "Ücret" : isZh ? "费用" : "Fee"}
                  </div>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-950 dark:text-white">{l(data.fees)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <Clock3 className="h-4 w-4 text-rose-600" />
                    {isTr ? "İşlem süresi" : isZh ? "处理时间" : "Processing time"}
                  </div>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-950 dark:text-white">{l(data.processing_time)}</p>
                </div>
              </div>

              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{l(data.overview)}</p>

              <div className="flex flex-wrap gap-3">
                <Link href={`/${locale}/full-check?country=CA`}>
                  <Button className="bg-rose-600 text-white hover:bg-rose-700">
                    <span>{checkEligibilityLabel}</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-xl">{officialInfoLabel}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {isTr ? "Ücret" : isZh ? "费用" : "Fee"}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{l(data.fees)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {isTr ? "İşlem süresi" : isZh ? "处理时间" : "Processing time"}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{l(data.processing_time)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {isTr ? "Durum" : isZh ? "状态" : "Status"}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{l(data.status)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* PDF Download Card */}
      <section className="mx-auto max-w-6xl px-4 pb-6 sm:px-6 lg:px-8">
        <VisaPdfDownloadCard
          pdfUrls={pdfUrls}
          description={isTr ? "Bu rehber Vercel Blob'da saklanir ve uygulamanin kullandigi resmi Canada.ca surec goruntusunu yansitir." : isZh ? "本指南存储在 Vercel Blob 中，并映射应用使用的官方 Canada.ca 流程快照。" : "This guide is stored on Vercel Blob and mirrors the official Canada.ca process snapshot used by the app."}
          title={isTr ? "Ev Bakim Iscileri ve Bakicilar (TFWP) - Resmi Rehber (PDF)" : isZh ? "家庭护理工作者与护理人员（TFWP）- 官方指南（PDF）" : "Home Care Workers & Caregivers (TFWP) - Official Guide (PDF)"}
          primaryLabel={isTr ? "PDF'yi Aç" : isZh ? "打开 PDF" : "Open PDF"}
          sourceLabel={visitOfficialWebsiteLabel}
        />
      </section>

      {/* Section 1: Work Permit (LMIA-based) */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Briefcase className="h-5 w-5 text-rose-600" />
                {isTr ? "Çalışma İzni (LMIA Temelli)" : isZh ? "工作许可（基于 LMIA）" : "Work Permit (LMIA-based)"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
                  {isTr ? "Kimler başvurabilir" : isZh ? "可申请人群" : "Who can apply"}
                </p>
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  {(requirements.who_can_apply ?? []).map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                      <span>{l(item)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  {isTr ? "Kimler başvuramaz" : isZh ? "不可申请人群" : "Who cannot apply"}
                </p>
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  {(requirements.who_cannot_apply ?? []).map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                      <span>{l(item)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ListChecks className="h-5 w-5 text-rose-600" />
                {isTr ? "İşveren LMIA Süreci" : isZh ? "雇主 LMIA 流程" : "Employer LMIA Process"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {isTr ? "Adım 1 — İlan / İşe alım" : isZh ? "步骤一 — 招聘广告" : "Step 1 — Recruitment advertising"}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{l(lmiaProcess.recruitment)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {isTr ? "Adım 2 — Başvuru yöntemi" : isZh ? "步骤二 — 申请方式" : "Step 2 — Application method"}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{l(lmiaProcess.application_method)}</p>
              </div>
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-500/20 dark:bg-sky-500/10">
                <p className="text-sm font-semibold text-sky-900 dark:text-sky-100">
                  {isTr ? "Quebec'e özel" : isZh ? "魁北克特别说明" : "Quebec-specific"}
                </p>
                <p className="mt-1 text-sm leading-6 text-sky-900 dark:text-sky-100">{l(lmiaProcess.quebec_specific)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Provincial registration notes */}
        <Card className="mt-6 border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <MapPin className="h-5 w-5 text-rose-600" />
              {isTr ? "Eyalet Bazlı Kayıt Notları" : isZh ? "省级注册说明" : "Provincial Registration Notes"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PROVINCIAL_NOTES.map((province) => (
                <div key={province.code} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{province.label[lang]}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{province.note[lang]}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Section 2: Proof of Experience (For Previous Applicants) */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <Card className="border-amber-200 bg-amber-50/50 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-amber-900 dark:text-amber-100">
              <FileWarning className="h-5 w-5 text-amber-600" />
              {isTr
                ? "Deneyim Kanıtı (Önceki Pilot Başvuru Sahipleri İçin)"
                : isZh
                  ? "经验证明（适用于此前的试点申请人）"
                  : "Proof of Experience (For Previous Pilot Applicants)"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm leading-6 text-amber-900 dark:text-amber-100">{l(proofOfExperience.scope)}</p>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
                {isTr ? "Gerekli belgeler" : isZh ? "所需材料" : "Required documentation"}
              </p>
              <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                {(proofOfExperience.documentation ?? []).map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                    <span>{l(item)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-white p-4 dark:border-amber-500/20 dark:bg-slate-950/40">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                {isTr ? "Cevrimici form gonderim protokolu" : isZh ? "在线表单提交规则" : "Web Form submission protocol"}
              </p>
              <p className="mt-2 text-sm leading-6 text-amber-900 dark:text-amber-100">{l(proofOfExperience.submission_protocol)}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-4 sm:px-6 lg:px-8">
        <a
          href="https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/permit/caregiver.html"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
        >
          {visitOfficialWebsiteLabel}
          <ExternalLink className="h-4 w-4" />
        </a>
      </section>
    </main>
  );
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
