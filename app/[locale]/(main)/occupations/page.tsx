import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs, jsonLd } from "@/components/seo/breadcrumbs";
import { IndexNav, OccupationList } from "@/components/occupations/occupation-index-list";
import { OccupationHubEvents } from "@/components/occupations/occupation-hub-events";
import { activeLocales, isValidLocale } from "@/lib/i18n/config";
import { researchText } from "@/lib/marketing/research-journey";
import { ABS_ANZSCO_URL, HOME_AFFAIRS_SOL_URL, OCCUPATION_DATASET_DATE, OCCUPATION_PDF, hubCopy, hubMeta } from "@/lib/occupations/hub-content";
import { groupCounts, indexableEntries, letterCounts, richEntries } from "@/lib/occupations/index-data";
import { longDate } from "@/lib/reports/public-sources";
import { pageAlternates, publicPath, publicUrl } from "@/lib/seo/urls";
import type { Locale } from "@/lib/i18n/config";

type PageProps = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return activeLocales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isValidLocale(locale)) return { robots: { index: false, follow: false } };
  const m = hubMeta((en, tr, zh) => researchText(locale, en, tr, zh));
  return {
    // The full title is set here (not through the site template) so the query-aligned wording is what is shown.
    title: { absolute: m.title },
    description: m.description,
    alternates: pageAlternates(locale, "/occupations"),
    openGraph: { title: m.title, description: m.description, type: "website", url: publicUrl(locale, "/occupations") },
  };
}

const linkClass = "font-medium text-cyan-900 underline underline-offset-4";

export default async function OccupationIndexPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const t = (en: string, tr: string, zh: string) => researchText(locale, en, tr, zh);
  const l = locale as Locale;
  const m = hubMeta(t);
  const total = indexableEntries(locale).length;
  const c = hubCopy(t, total);
  const featured = richEntries(locale, 24);
  const dataDate = longDate(OCCUPATION_DATASET_DATE, l);
  const compiled = longDate(OCCUPATION_PDF.compiledOn, l);
  const crumbs = [
    { label: t("Home", "Ana sayfa", "首页"), path: "/" },
    { label: t("Occupations", "Meslekler", "职业"), path: "/occupations" },
  ];
  const collection = { "@context": "https://schema.org", "@type": "CollectionPage", name: m.title, description: m.description, url: publicUrl(locale, "/occupations"), inLanguage: locale };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale,
    mainEntity: c.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <main className="flex-1 py-12 sm:py-16">
      <OccupationHubEvents locale={locale}>
        <section className="mx-auto w-full max-w-4xl space-y-8 px-4 sm:px-6 lg:px-8">
          <Breadcrumbs locale={locale} crumbs={crumbs} />
          <header className="space-y-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{m.h1}</h1>
            <p className="text-base leading-relaxed text-slate-700">{c.intro}</p>
            <p className="text-sm leading-relaxed text-slate-700" data-occupation-lists-note>{c.lists}</p>
            <p className="text-sm text-slate-600">{c.count}</p>
          </header>

          <section aria-labelledby="occ-search" className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 id="occ-search" className="text-lg font-semibold text-slate-900">{c.searchTitle}</h2>
            <form action={publicPath(locale, "/tools/anzsco-finder")} method="get" role="search" className="mt-3 flex flex-col gap-2 sm:flex-row">
              <label htmlFor="occ-q" className="sr-only">{c.searchLabel}</label>
              <input
                id="occ-q"
                name="q"
                type="search"
                autoComplete="off"
                maxLength={80}
                placeholder={c.searchPlaceholder}
                data-occ-event="occupation_search_start"
                className="min-h-11 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-cyan-700"
              />
              <button type="submit" className="min-h-11 rounded-lg bg-cyan-800 px-5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-700">
                {c.searchButton}
              </button>
            </form>
          </section>

          <section aria-labelledby="occ-pdf" className="rounded-2xl border border-slate-200 bg-slate-50 p-5" data-occupation-pdf-intent>
            <h2 id="occ-pdf" className="text-lg font-semibold text-slate-900">{c.pdfTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{c.pdfBody(compiled, dataDate)}</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href={HOME_AFFAIRS_SOL_URL} target="_blank" rel="noopener noreferrer" data-official-source data-occ-event="official_occupation_list_click" className={linkClass}>
                  {c.officialLink}
                </a>
              </li>
              <li>
                <Link href={publicPath(locale, OCCUPATION_PDF.resourcePath)} data-occ-event="occupation_pdf_click" className={linkClass}>
                  {c.pdfLink(compiled)}
                </Link>
                <span className="block text-xs text-slate-600">{c.pdfNote}</span>
              </li>
            </ul>
          </section>

          <section aria-labelledby="occ-which" className="space-y-3">
            <h2 id="occ-which" className="text-lg font-semibold text-slate-900">{c.whichTitle}</h2>
            <p className="text-sm text-slate-700">{c.whichIntro}</p>
            <dl className="space-y-2 text-sm">
              {c.lists_.map((x) => (
                <div key={x.code} className="rounded-lg border border-slate-200 bg-white p-3">
                  <dt className="font-semibold text-slate-900">{x.code} <span className="font-normal text-slate-600">— {x.name}</span></dt>
                  <dd className="mt-1 text-slate-700">{x.text}</dd>
                </div>
              ))}
            </dl>
            <p className="text-sm text-slate-700">{c.anzsco}</p>
            <p className="text-sm font-medium text-slate-800">{c.notEligibility}</p>
          </section>

          <nav aria-label={c.toolsTitle} className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href={publicPath(locale, "/tools/skills-assessment")} data-occ-event="skills_assessment_click_from_occupations" className={linkClass}>
              {c.skillsLink}
            </Link>
            <Link href={publicPath(locale, "/tools/points-calculator/australia")} className={linkClass}>
              {c.pointsLink}
            </Link>
          </nav>

          <section aria-labelledby="occ-index" className="space-y-4">
            <h2 id="occ-index" className="text-lg font-semibold text-slate-900">{c.indexTitle}</h2>
            <IndexNav locale={locale} groupCounts={groupCounts(locale)} letterCounts={letterCounts(locale)} />
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">{c.featuredTitle}</h2>
            <p className="mb-3 text-xs text-slate-500">{c.featuredNote}</p>
            <OccupationList locale={locale} entries={featured} />
          </section>

          <section aria-labelledby="occ-faq" className="space-y-3">
            <h2 id="occ-faq" className="text-lg font-semibold text-slate-900">{c.faqTitle}</h2>
            <div className="space-y-2">
              {c.faq.map((f) => (
                <details key={f.q} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                  <summary className="cursor-pointer font-medium text-slate-900">{f.q}</summary>
                  <p className="mt-2 leading-relaxed text-slate-700">{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section aria-labelledby="occ-sources" className="space-y-2 text-sm text-slate-700">
            <h2 id="occ-sources" className="text-base font-semibold text-slate-900">{c.sourcesTitle}</h2>
            <p>{c.sourcesLine(dataDate, compiled)}</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <a href={HOME_AFFAIRS_SOL_URL} target="_blank" rel="noopener noreferrer" data-official-source data-occ-event="official_occupation_list_click" className={linkClass}>
                  {c.homeAffairsSource}
                </a>
              </li>
              <li>
                <a href={ABS_ANZSCO_URL} target="_blank" rel="noopener noreferrer" data-official-source className={linkClass}>
                  {c.absSource}
                </a>
              </li>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
            <p className="text-slate-700">{c.assessmentPrompt}</p>
            <Link href={publicPath(locale, "/full-check?country=AU")} data-occ-event="assessment_click_from_occupations" className={`${linkClass} mt-2 inline-block`}>
              {c.assessmentLink}
            </Link>
          </section>
        </section>
      </OccupationHubEvents>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(collection) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema) }} />
    </main>
  );
}
