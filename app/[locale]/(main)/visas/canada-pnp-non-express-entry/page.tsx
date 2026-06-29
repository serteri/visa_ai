import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Clock3, DollarSign, ExternalLink, ListChecks, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VisaPdfDownloadCard } from "@/components/visa-pdf-download-card";
import { getTranslations } from "@/lib/i18n/get-translations";
import type { Locale } from "@/lib/i18n/config";
import { sanitizeLocaleContent } from "@/lib/i18n/sanitize-locale-content";
import pnpProcessData from "@/src/data/countries/ca/pnp-non-express-process.json";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

type PageProps = {
  params: Promise<{ locale: string }>;
};

type PnpProcessData = {
  pathwayCovered?: string;
  pathwayCovered_tr?: string;
  pathwayCovered_zh?: string;
  note?: string;
  note_tr?: string;
  note_zh?: string;
  sourceUrl?: string;
  sourcePdfBlobUrl?: string;
  fees?: { currency?: string; processingFeeFrom?: number };
  processingTime?: { estimate?: string; estimate_tr?: string; estimate_zh?: string };
  processSteps?: Array<{ step: number; name: string; name_tr?: string; name_zh?: string; description?: string; description_tr?: string; description_zh?: string }>;
  documentsRequired?: {
    fillInPortal?: Array<{ form: string; name: string; name_tr?: string; name_zh?: string }>;
    downloadAndUpload?: Array<{ form: string; name: string; name_tr?: string; name_zh?: string }>;
    conditionalForms?: Array<{ form: string; name: string; name_tr?: string; name_zh?: string }>;
    supportingDocuments?: string[];
  };
  afterApply?: { decisionCriteria?: string[]; misrepresentationConsequence?: string };
  importantCaveats?: Array<{ topic: string; text: string }>;
};

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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const translations = await getTranslations(locale as Locale);
  const pnp = sanitizeLocaleContent(pnpProcessData as PnpProcessData, locale) as PnpProcessData;
  const title = `${t(translations, "visas.officialInfo", "Canada PNP Non-Express Entry")} | LogiVisa`;

  return {
    metadataBase: new URL(BASE_URL),
    title,
    description: pnp.pathwayCovered ?? "Provincial Nominee Program - Non-Express Entry process",
    alternates: {
      canonical: `/${locale}/visas/canada-pnp-non-express-entry`,
      languages: {
        en: `/en/visas/canada-pnp-non-express-entry`,
        tr: `/tr/visas/canada-pnp-non-express-entry`,
        "zh-Hans": `/zh-Hans/visas/canada-pnp-non-express-entry`,
      },
    },
  };
}

export default async function CanadaPnpNonExpressEntryPage({ params }: PageProps) {
  const { locale } = await params;
  const translations = await getTranslations(locale as Locale);
  const pnp = pnpProcessData as PnpProcessData;

  const localeSuffix = locale === "tr" ? "_tr" : locale === "zh-Hans" ? "_zh" : "";
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  const localized = (base: string, fallback?: string) => {
    if (!localeSuffix) {
      return fallback ?? ((pnp as Record<string, unknown>)[base] as string | undefined) ?? "";
    }
    const key = `${base}${localeSuffix}`;
    const source = pnp as Record<string, unknown>;
    const value = (source[key] as string | undefined) ?? fallback ?? (source[base] as string | undefined);
    return value ?? fallback ?? "";
  };
  const localizedField = <T extends Record<string, unknown>>(obj: T | undefined, base: string, fallback?: string) => {
    if (!obj) return fallback ?? "";
    const key = `${base}${localeSuffix}`;
    const value = (obj[key] as string | undefined) ?? fallback ?? (obj[base] as string | undefined);
    return value ?? fallback ?? "";
  };

  const title = localized(
    "pathwayCovered",
    isTr
      ? "Kanada Eyalet Aday Programi - Non-Express Entry"
      : isZh
        ? "加拿大省提名计划 - 非快速通道"
        : "Canada Provincial Nominee Program - Non-Express Entry"
  );
  const subtitle = localized(
    "note",
    isTr
      ? "Federal olarak dogrulanmis surec, ucret ve belge katmanini tek detay kartinda gorun."
      : isZh
        ? "在一个详情卡中查看联邦核验的流程、费用与文件层信息。"
        : "See the federally verified process, fee, and document layer in one detailed card."
  );

  const feeText = new Intl.NumberFormat(locale === "zh-Hans" ? "zh-CN" : locale === "tr" ? "tr-TR" : "en-CA", {
    style: "currency",
    currency: pnp.fees?.currency ?? "CAD",
    maximumFractionDigits: 0,
  }).format(pnp.fees?.processingFeeFrom ?? 1590);

  const processingTimeText = localizedField(
    pnp.processingTime,
    "estimate",
    isTr ? "yaklasik 13 ay" : isZh ? "约 13 个月" : "about 13 months"
  );
  const processSteps = pnp.processSteps ?? [];
  const documentsRequired = pnp.documentsRequired ?? {};
  const supportingDocuments = documentsRequired.supportingDocuments ?? [];
  const pnpCaveats = pnp.importantCaveats ?? [];

  const checkEligibilityLabel = t(translations, "visas.checkEligibility", "Check your eligibility");
  const visitOfficialWebsiteLabel = t(translations, "visas.visitOfficialWebsite", "Visit official website");
  const backToVisasLabel = t(translations, "visas.backToVisas", "Back to visas");
  const officialInfoLabel = t(translations, "visas.officialInfo", "Official Information");
  const ui = {
    fee: isTr ? "Ucret" : isZh ? "费用" : "Fee",
    processingTime: isTr ? "Islem suresi" : isZh ? "处理时间" : "Processing time",
    processSteps: isTr ? "Surec adimi" : isZh ? "流程步骤" : "Process steps",
    supportingDocs: isTr ? "Destekleyici belgeler" : isZh ? "支持文件" : "Supporting docs",
    source: isTr ? "Kaynak" : isZh ? "来源" : "Source",
    applicationSteps: isTr ? "Basvuru Adimlari" : isZh ? "申请步骤" : "Application Steps",
    documentsRequired: isTr ? "Gerekli Belgeler" : isZh ? "所需文件" : "Documents Required",
    formsFillPortal: isTr ? "Portalda doldurulacak formlar" : isZh ? "门户填写表格" : "Forms to fill in portal",
    downloadUpload: isTr ? "Indir ve yukle" : isZh ? "下载并上传" : "Download and upload",
    conditionalForms: isTr ? "Kosullu formlar" : isZh ? "条件表格" : "Conditional forms",
    afterApply: isTr ? "Basvuru Sonrasi" : isZh ? "递交后" : "After You Apply",
    caveats: isTr ? "Onemli Notlar" : isZh ? "重要注意事项" : "Important Caveats",
    badge: isTr ? "PNP Non-Express Entry" : isZh ? "省提名（非快速通道）" : "PNP Non-Express Entry",
    pdfTitle: isTr
      ? "Kanada PNP Non-Express Entry Resmi Rehber (PDF)"
      : isZh
        ? "加拿大省提名（非快速通道）官方指南（PDF）"
        : "Canada PNP Non-Express Entry Official Guide (PDF)",
    pdfDescription: isTr
      ? "Bu rehber Vercel Blob'da tutulur ve uygulamanin kullandigi resmi Canada.ca surec anlik goruntusunu yansitir."
      : isZh
        ? "本指南存储于 Vercel Blob，并映射应用使用的官方 Canada.ca 流程快照。"
        : "This guide is stored on Vercel Blob and mirrors the official Canada.ca process snapshot used by the app.",
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-28 sm:pt-32 dark:from-slate-950 dark:to-slate-900">
      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link
            href={`/${locale}/visas/canada`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {backToVisasLabel}
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
            <Sparkles className="h-4 w-4" />
            {officialInfoLabel}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100">Canada</Badge>
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-100">
                    {ui.badge}
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

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    {ui.fee}
                  </div>
                  <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{feeText}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <Clock3 className="h-4 w-4 text-emerald-600" />
                    {ui.processingTime}
                  </div>
                  <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{processingTimeText}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <BadgeCheck className="h-4 w-4 text-emerald-600" />
                    {ui.processSteps}
                  </div>
                  <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{processSteps.length}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href={`/${locale}/full-check`}>
                  <Button className="bg-emerald-600 text-white hover:bg-emerald-700">
                    <span>{checkEligibilityLabel}</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <a
                  href={pnp.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                >
                  {visitOfficialWebsiteLabel}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-xl">{officialInfoLabel}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{ui.fee}</p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{feeText}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{ui.processingTime}</p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{processingTimeText}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{ui.supportingDocs}</p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{supportingDocuments.length}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{ui.source}</p>
                <a
                  href={pnp.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 break-all text-sm font-medium text-emerald-700 dark:text-emerald-300"
                >
                  {pnp.sourceUrl}
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-6 sm:px-6 lg:px-8">
        <VisaPdfDownloadCard
          pdfUrls={pnp.sourcePdfBlobUrl ? [pnp.sourcePdfBlobUrl] : []}
          sourceUrl={pnp.sourceUrl}
          description={ui.pdfDescription}
          title={ui.pdfTitle}
          primaryLabel={locale === "tr" ? "PDF'yi Aç" : locale === "zh-Hans" ? "打开 PDF" : "Open PDF"}
          sourceLabel={visitOfficialWebsiteLabel}
        />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ListChecks className="h-5 w-5 text-emerald-600" />
                {ui.applicationSteps}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {processSteps.map((item) => (
                  <li key={`${item.step}-${item.name}`} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-100">
                      {item.step}
                    </span>
                    <span>
                      <span className="font-semibold text-slate-900 dark:text-white">{localizedField(item, "name")}</span>
                      {localizedField(item, "description") ? <span className="block pt-1 text-slate-600 dark:text-slate-400">{localizedField(item, "description")}</span> : null}
                    </span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ListChecks className="h-5 w-5 text-emerald-600" />
                {ui.documentsRequired}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">{ui.formsFillPortal}</p>
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  {documentsRequired.fillInPortal?.map((item) => (
                    <li key={item.form} className="flex gap-2">
                      <span className="text-emerald-600">•</span>
                      <span>{item.form} - {localizedField(item, "name")}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">{ui.downloadUpload}</p>
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  {documentsRequired.downloadAndUpload?.map((item) => (
                    <li key={item.form} className="flex gap-2">
                      <span className="text-emerald-600">•</span>
                      <span>{item.form} - {localizedField(item, "name")}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">{ui.conditionalForms}</p>
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  {documentsRequired.conditionalForms?.map((item) => (
                    <li key={item.form} className="flex gap-2">
                      <span className="text-emerald-600">•</span>
                      <span>{item.form} - {localizedField(item, "name")}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">{ui.supportingDocs}</p>
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  {supportingDocuments.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-emerald-600">•</span>
                      <span>{item}</span>
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
                <ListChecks className="h-5 w-5 text-emerald-600" />
                {ui.afterApply}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                {(pnp.afterApply?.decisionCriteria ?? []).map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    <span>{item}</span>
                  </li>
                ))}
                {pnp.afterApply?.misrepresentationConsequence ? (
                  <li className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                    {pnp.afterApply.misrepresentationConsequence}
                  </li>
                ) : null}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ListChecks className="h-5 w-5 text-emerald-600" />
                {ui.caveats}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                {pnpCaveats.map((item) => (
                  <li key={item.topic} className="flex gap-2">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}