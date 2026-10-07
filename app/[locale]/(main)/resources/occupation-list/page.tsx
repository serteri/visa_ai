import type { Metadata } from "next";
import { FileText, CheckCircle, Info } from "lucide-react";

import { LeadMagnetForm } from "@/components/LeadMagnetForm";

import { LEAD_MAGNETS, pick } from "@/lib/lead-magnets";

type L3 = { en: string; tr: string; zh: string };
const COPY = {
  title: {
    en: "2026 Australian Skilled Occupation List (compiled from official sources)",
    tr: "2026 Avustralya Kalifiye Meslek Listesi (resmi kaynaklardan derlenmiştir)",
    zh: "2026 澳大利亚技术职业清单（根据官方来源整理）",
  } as L3,
  description: {
    en: "A PDF of the Australian skilled occupation lists with ANZSCO codes, visa subclasses and assessing authorities, compiled by LogiVisa from official sources. The source and date are inside the PDF. It is not a government document.",
    tr: "ANZSCO kodları, vize alt sınıfları ve değerlendirme kurumlarıyla Avustralya kalifiye meslek listelerinin, LogiVisa tarafından resmi kaynaklardan derlenmiş PDF'i. Kaynak ve tarih PDF'in içindedir. Resmi bir devlet belgesi değildir.",
    zh: "由 LogiVisa 根据官方来源整理的澳大利亚技术职业清单 PDF，含 ANZSCO 代码、签证子类和评估机构。来源和日期见 PDF 内部。它不是政府文件。",
  } as L3,
  badge: { en: "Compiled from official sources", tr: "Resmi kaynaklardan derlenmiştir", zh: "根据官方来源整理" } as L3,
  h1: { en: "2026 Australian Skilled Occupation List", tr: "2026 Avustralya Kalifiye Meslek Listesi", zh: "2026 澳大利亚技术职业清单" } as L3,
  intro: {
    en: "A reference table of occupations on the Australian skilled occupation lists, compiled by LogiVisa from the Department of Home Affairs lists. It is not an official or government document; the source and the date it was compiled are inside the PDF. Enter your details and we will send it to your inbox.",
    tr: "Avustralya kalifiye meslek listelerindeki mesleklerin, LogiVisa tarafından İçişleri Bakanlığı listelerinden derlenmiş başvuru tablosu. Resmi veya devlet belgesi değildir; kaynak ve derleme tarihi PDF'in içindedir. Bilgilerinizi girin, gelen kutunuza gönderelim.",
    zh: "由 LogiVisa 根据内政部清单整理的澳大利亚技术职业清单参考表。它不是官方或政府文件；来源和整理日期见 PDF 内部。填写您的信息，我们会发送到您的邮箱。",
  } as L3,
  kicker: { en: "Free · sent by email", tr: "Ücretsiz · e-postayla gönderilir", zh: "免费 · 通过邮件发送" } as L3,
  formTitle: { en: "Get the PDF in your inbox", tr: "PDF'i gelen kutunuza alın", zh: "将 PDF 发送到您的邮箱" } as L3,
  whatTitle: { en: "What is in this document?", tr: "Bu belgede neler var?", zh: "此文件包含什么？" } as L3,
  what: {
    en: "The PDF lists occupations by their ANZSCO code (the Australian and New Zealand Standard Classification of Occupations), with the lists they appear on, the visa subclasses those lists relate to and the assessing authority.",
    tr: "PDF, mesleklerin ANZSCO kodunu (Avustralya ve Yeni Zelanda Standart Meslek Sınıflandırması), hangi listelerde yer aldığını, bu listelerin ilişkili olduğu vize alt sınıflarını ve değerlendirme kurumunu listeler.",
    zh: "PDF 按 ANZSCO 代码（澳大利亚和新西兰标准职业分类）列出职业，以及其所在清单、这些清单对应的签证子类和评估机构。",
  } as L3,
  highlights: [
    { en: "ANZSCO code, occupation title, list, visa subclasses and assessing authority for each entry", tr: "Her kayıt için ANZSCO kodu, meslek adı, liste, vize alt sınıfları ve değerlendirme kurumu", zh: "每个条目的 ANZSCO 代码、职业名称、清单、签证子类和评估机构" },
    { en: "Compiled by LogiVisa from Department of Home Affairs lists; the source and date are printed on the cover", tr: "LogiVisa tarafından İçişleri Bakanlığı listelerinden derlenmiştir; kaynak ve tarih kapakta yazılıdır", zh: "由 LogiVisa 根据内政部清单整理；来源和日期印在封面上" },
    { en: "General information only: check the current lists with the Department of Home Affairs", tr: "Yalnızca genel bilgi: güncel listeleri İçişleri Bakanlığı'ndan kontrol edin", zh: "仅为一般信息：请向内政部核对现行清单" },
  ] as L3[],
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: pick(COPY.title, locale), description: pick(COPY.description, locale) };
}

export default async function OccupationListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
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

          <p className="mt-5 text-lg leading-relaxed text-slate-700">{pick(COPY.intro, locale)}</p>
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

            <p className="mb-6 text-sm leading-relaxed text-slate-700">{pick(COPY.what, locale)}</p>

            <ul className="space-y-3">
              {COPY.highlights.map((point) => (
                <li key={point.en} className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                  <span className="text-sm text-slate-700">
                    {pick(point, locale)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>


    </div>
  );
}
