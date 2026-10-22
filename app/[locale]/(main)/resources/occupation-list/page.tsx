import type { Metadata } from "next";
import { FileText, CheckCircle, Info } from "lucide-react";

import Link from "next/link";

import { LeadMagnetForm } from "@/components/LeadMagnetForm";
import { OccupationPdfEvents } from "@/components/occupations/occupation-pdf-events";
import { OCCUPATION_PDF } from "@/lib/occupations/hub-content";
import { longDate } from "@/lib/reports/public-sources";
import { pageAlternates, publicPath, publicUrl } from "@/lib/seo/urls";
import type { Locale } from "@/lib/i18n/config";

import { LEAD_MAGNETS, pick } from "@/lib/lead-magnets";

type L3 = { en: string; tr: string; zh: string };
const COPY = {
  title: {
    en: "Australian Skilled Occupation List 2026 PDF",
    tr: "Avustralya Kalifiye Meslek Listesi 2026 PDF",
    zh: "澳大利亚技术职业清单 2026 PDF",
  } as L3,
  description: {
    en: "Get a dated, LogiVisa-compiled PDF of the Australian skilled occupation lists with ANZSCO codes, list placement and assessing authorities. Not an official government PDF.",
    tr: "ANZSCO kodları, liste yeri ve değerlendirme kurumlarıyla Avustralya kalifiye meslek listelerinin tarihli, LogiVisa tarafından derlenmiş PDF’ini alın. Resmî bir devlet PDF’i değildir.",
    zh: "获取由 LogiVisa 整理的带日期的澳大利亚技术职业清单 PDF，含 ANZSCO 代码、清单归属和评估机构。不是政府官方 PDF。",
  } as L3,
  badge: { en: "LogiVisa-compiled reference", tr: "LogiVisa tarafından derlenmiş referans", zh: "LogiVisa 整理的参考资料" } as L3,
  h1: { en: "Australian Skilled Occupation List 2026 PDF", tr: "Avustralya Kalifiye Meslek Listesi 2026 PDF", zh: "澳大利亚技术职业清单 2026 PDF" } as L3,
  intro: (compiled: string): L3 => ({
    en: `A dated reference compiled by LogiVisa from official sources (Department of Home Affairs list data and ABS ANZSCO), compiled ${compiled}. It is not an official government PDF, and current Home Affairs information remains authoritative. Enter your details and we will email it to you.`,
    tr: `LogiVisa tarafından resmî kaynaklardan (İçişleri Bakanlığı liste verileri ve ABS ANZSCO) derlenmiş tarihli bir referanstır; derleme tarihi ${compiled}. Resmî bir devlet PDF’i değildir; güncel İçişleri Bakanlığı bilgileri esas alınır. Bilgilerinizi girin, size e-postayla gönderelim.`,
    zh: `由 LogiVisa 根据官方来源（内政部清单数据和 ABS ANZSCO）整理的带日期参考资料，整理于 ${compiled}。它不是政府官方 PDF，当前内政部信息仍具权威性。填写您的信息，我们会发送到您的邮箱。`,
  }),
  kicker: { en: "Free · sent by email", tr: "Ücretsiz · e-postayla gönderilir", zh: "免费 · 通过邮件发送" } as L3,
  formTitle: { en: "Get the PDF in your inbox", tr: "PDF'i gelen kutunuza alın", zh: "将 PDF 发送到您的邮箱" } as L3,
  whatTitle: { en: "What the 2026 occupation list PDF contains", tr: "2026 meslek listesi PDF’inin içeriği", zh: "2026 年职业清单 PDF 的内容" } as L3,
  what: (count: number): L3 => ({
    en: `The PDF gives you one reference table covering ${count} occupations, with each occupation’s ANZSCO code, list placement, relevant visa subclasses, assessing authority and source date.`,
    tr: `PDF, ${count} mesleği kapsayan tek bir referans tablosu sunar; her mesleğin ANZSCO kodu, liste yeri, ilgili vize alt sınıfları, değerlendirme kurumu ve kaynak tarihi yer alır.`,
    zh: `这份 PDF 提供一张涵盖 ${count} 个职业的参考表，列出每个职业的 ANZSCO 代码、清单归属、相关签证子类、评估机构和来源日期。`,
  }),
  highlights: [
    { en: "ANZSCO code and occupation title", tr: "ANZSCO kodu ve meslek unvanı", zh: "ANZSCO 代码和职业名称" },
    { en: "List placement: CSOL, MLTSSL, STSOL and ROL", tr: "Liste yeri: CSOL, MLTSSL, STSOL ve ROL", zh: "清单归属：CSOL、MLTSSL、STSOL 和 ROL" },
    { en: "The visa subclasses associated with the published lists", tr: "Yayımlanmış listelerle ilişkili vize alt sınıfları", zh: "已公布清单对应的签证子类" },
    { en: "Assessing authority", tr: "Değerlendirme kurumu", zh: "评估机构" },
    { en: "The compilation date and the sources, printed on the cover", tr: "Derleme tarihi ve kaynaklar, kapakta basılıdır", zh: "整理日期和来源，印在封面上" },
  ] as L3[],
  note: {
    en: "General information only: check the current lists with the Department of Home Affairs.",
    tr: "Yalnızca genel bilgi: güncel listeleri İçişleri Bakanlığı’ndan kontrol edin.",
    zh: "仅为一般信息：请向内政部核对当前清单。",
  } as L3,
  searchCta: { en: "Search occupations online", tr: "Meslekleri çevrimiçi arayın", zh: "在线搜索职业" } as L3,
  searchText: {
    en: "Looking up one occupation or ANZSCO code? The occupation index lets you search and browse it, with the list placement and sources for each.",
    tr: "Tek bir meslek veya ANZSCO kodu mu arıyorsunuz? Meslek dizini, her biri için liste yeri ve kaynaklarla birlikte arama ve göz atma imkânı sunar.",
    zh: "只想查某个职业或 ANZSCO 代码？职业索引可搜索和浏览，并列出每个职业的清单归属和来源。",
  } as L3,
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const title = pick(COPY.title, locale);
  const description = pick(COPY.description, locale);
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/resources/occupation-list"),
    openGraph: { title, description, type: "website", url: publicUrl(locale, "/resources/occupation-list") },
  };
}

export default async function OccupationListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const compiled = longDate(OCCUPATION_PDF.compiledOn, locale as Locale);
  const pageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: pick(COPY.title, locale),
    description: pick(COPY.description, locale),
    url: publicUrl(locale, "/resources/occupation-list"),
    inLanguage: locale,
  };

  return (
    <OccupationPdfEvents locale={locale}>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-indigo-950/20">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 pb-12 pt-12 sm:px-6 lg:px-8">
        {/* Decorative blobs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 right-0 h-96 w-96 rounded-full bg-indigo-200/30 blur-3xl dark:bg-indigo-900/20"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-violet-200/30 blur-3xl dark:bg-violet-900/20"
        />

        <div className="relative mx-auto max-w-3xl text-center">
          {/* Badge */}
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
            <FileText className="h-3.5 w-3.5" />
            {pick(COPY.badge, locale)}
          </span>

          <h1 className="mt-2 bg-gradient-to-br from-slate-900 via-indigo-900 to-violet-800 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl dark:from-white dark:via-indigo-200 dark:to-violet-300">
            {pick(COPY.h1, locale)}
          </h1>

          <p className="mt-5 text-lg leading-relaxed text-slate-700">{pick(COPY.intro(compiled), locale)}</p>
        </div>
      </section>

      {/* ── Lead capture + highlights ── */}
      <section className="px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2">
          {/* Lead capture card */}
          <div className="rounded-2xl border border-indigo-100 bg-white/90 p-8 shadow-md backdrop-blur-sm dark:border-indigo-900/50 dark:bg-zinc-900/70">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-indigo-500">
              {pick(COPY.kicker, locale)}
            </p>
            <h2 className="mb-6 text-xl font-bold text-slate-800 dark:text-white">
              {pick(COPY.formTitle, locale)}
            </h2>

            <LeadMagnetForm
              locale={locale}
              documentId="csol-2026"
              documentName={pick(LEAD_MAGNETS.occupation.name, locale)}
              emailOnly
            />
          </div>

          {/* What's in the list */}
          <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-8 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/60">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/50">
                <Info className="h-5 w-5 text-indigo-800" />
              </span>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                {pick(COPY.whatTitle, locale)}
              </h2>
            </div>

            <p className="mb-4 text-sm leading-relaxed text-slate-700">{pick(COPY.what(OCCUPATION_PDF.occupationCount), locale)}</p>

            <ul className="space-y-3">
              {COPY.highlights.map((point) => (
                <li key={point.en} className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                  <span className="text-sm text-slate-700">{pick(point, locale)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs text-slate-600">{pick(COPY.note, locale)}</p>

            <div className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-700">
              <p>{pick(COPY.searchText, locale)}</p>
              <Link
                href={publicPath(locale, "/occupations")}
                data-pdf-event="occupation_pdf_to_search_click"
                className="mt-2 inline-block font-semibold text-indigo-800 underline underline-offset-4"
              >
                {pick(COPY.searchCta, locale)}
              </Link>
            </div>
          </div>
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
    </div>
    </OccupationPdfEvents>
  );
}
