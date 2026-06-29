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
  const title = `${data.program_name ?? "Canada Home Care Workers & Caregivers"} | LogiVisa`;

  return {
    metadataBase: new URL(BASE_URL),
    title,
    description: data.overview ?? "Federal caregiver pilots are closed; caregivers now apply via TFWP (LMIA) or PNP.",
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

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-28 pb-20 sm:pt-32 dark:from-slate-950 dark:to-slate-900">
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
                    TFWP / LMIA-based
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
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-950 dark:text-white">{data.fees}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <Clock3 className="h-4 w-4 text-rose-600" />
                    {isTr ? "İşlem süresi" : isZh ? "处理时间" : "Processing time"}
                  </div>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-950 dark:text-white">{data.processing_time}</p>
                </div>
              </div>

              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{data.overview}</p>

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
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {isTr ? "Ücret" : isZh ? "费用" : "Fee"}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{data.fees}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {isTr ? "İşlem süresi" : isZh ? "处理时间" : "Processing time"}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{data.processing_time}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {isTr ? "Durum" : isZh ? "状态" : "Status"}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{data.status}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* PDF Download Card */}
      <section className="mx-auto max-w-6xl px-4 pb-6 sm:px-6 lg:px-8">
        <VisaPdfDownloadCard
          pdfUrls={pdfUrls}
          description="This guide is stored on Vercel Blob and mirrors the official Canada.ca process snapshot used by the app."
          title="Home Care Workers & Caregivers (TFWP) - Official Guide (PDF)"
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
                      <span>{item}</span>
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
                      <span>{item}</span>
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
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{lmiaProcess.recruitment}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {isTr ? "Adım 2 — Başvuru yöntemi" : isZh ? "步骤二 — 申请方式" : "Step 2 — Application method"}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{lmiaProcess.application_method}</p>
              </div>
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-500/20 dark:bg-sky-500/10">
                <p className="text-sm font-semibold text-sky-900 dark:text-sky-100">
                  {isTr ? "Quebec'e özel" : isZh ? "魁北克特别说明" : "Quebec-specific"}
                </p>
                <p className="mt-1 text-sm leading-6 text-sky-900 dark:text-sky-100">{lmiaProcess.quebec_specific}</p>
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
            <p className="text-sm leading-6 text-amber-900 dark:text-amber-100">{proofOfExperience.scope}</p>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
                {isTr ? "Gerekli belgeler" : isZh ? "所需材料" : "Required documentation"}
              </p>
              <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                {(proofOfExperience.documentation ?? []).map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-white p-4 dark:border-amber-500/20 dark:bg-slate-950/40">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                {isTr ? "Web Form gönderim protokolü" : isZh ? "Web Form 提交规则" : "Web Form submission protocol"}
              </p>
              <p className="mt-2 text-sm leading-6 text-amber-900 dark:text-amber-100">{proofOfExperience.submission_protocol}</p>
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
