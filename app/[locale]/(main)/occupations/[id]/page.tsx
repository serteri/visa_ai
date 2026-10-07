import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { OccupationViewTracker } from "@/components/analytics/occupation-view-tracker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { activeLocales, isValidLocale, type Locale } from "@/lib/i18n/config";
import { occupationPageContent } from "@/lib/occupations/page-content";
import { buildOccupationSlug, findOccupationById, getUniqueOccupations } from "@/lib/occupations/seo";
import { pageAlternates, publicPath, publicUrl, SITE_ORIGIN } from "@/lib/seo/urls";

// SSG: every {locale} x {listed occupation} page is pre-rendered at build time. getUniqueOccupations() is the same set
// findOccupationById() resolves, so no generated slug 404s.
export function generateStaticParams() {
  const occupations = getUniqueOccupations();
  return activeLocales.flatMap((locale) => occupations.map((occupation) => ({ locale, id: buildOccupationSlug(occupation) })));
}

type PageProps = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, id } = await params;
  const occupation = findOccupationById(id);
  if (!occupation || !isValidLocale(locale)) return { robots: { index: false, follow: false } };

  const content = occupationPageContent(occupation, locale);
  const path = `/occupations/${content.slug}`;
  return {
    metadataBase: new URL(SITE_ORIGIN),
    title: content.title,
    description: content.description,
    alternates: pageAlternates(locale, path),
    // Thin pages (little or no unique data -- lib/occupations/richness.ts) stay out of the index until they carry some.
    robots: content.richness.tier === "thin" ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title: content.title,
      description: content.description,
      type: "article",
      url: publicUrl(locale, path),
      images: [{ url: "/og/default-og.png", width: 1200, height: 630, alt: `${content.displayName} ${content.code}` }],
    },
  };
}

export default async function OccupationDetailsPage({ params }: PageProps) {
  const { locale, id } = await params;
  if (!isValidLocale(locale)) notFound();

  const occupation = findOccupationById(id);
  if (!occupation) notFound();

  const c = occupationPageContent(occupation, locale as Locale);
  // One URL per occupation: a slug with the right code but different words resolves to the canonical slug.
  if (id !== c.slug) permanentRedirect(publicPath(locale, `/occupations/${c.slug}`));

  const row = "flex flex-col gap-1 border-b border-slate-100 py-3 sm:flex-row sm:gap-6";
  const rowLabel = "w-full shrink-0 text-sm font-semibold text-slate-700 sm:w-64";
  const rowValue = "text-sm text-slate-600";

  return (
    <main className="ambient-bg relative flex-1 overflow-hidden py-12 sm:py-16">
      <OccupationViewTracker occupationCode={c.code} locale={locale} />
      <section className="relative mx-auto w-full max-w-4xl space-y-8 px-4 sm:px-6 lg:px-8">
        <header className="rounded-3xl border border-slate-200/80 bg-white/95 p-8 shadow-xl shadow-slate-900/5 sm:p-10">
          <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-900">
            ANZSCO {c.code}
          </Badge>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{c.h1}</h1>
          <p className="mt-4 text-base text-slate-600">{c.intro}</p>
        </header>

        <Card className="border-slate-200/80 bg-white/95 shadow-lg shadow-slate-900/5">
          <CardHeader>
            <CardTitle>
              <h2>{c.headings.details}</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <div className={row}>
                <dt className={rowLabel}>{c.labels.code}</dt>
                <dd className={rowValue}>{c.code}</dd>
              </div>
              <div className={row}>
                <dt className={rowLabel}>{c.labels.authority}</dt>
                <dd className={rowValue}>{c.details.authority ?? c.labels.authorityNone}</dd>
              </div>
              <div className={row}>
                <dt className={rowLabel}>{c.labels.lists}</dt>
                <dd className={rowValue}>{c.details.lists ?? c.labels.listsNone}</dd>
              </div>
              {c.details.subclasses.length > 0 && (
                <div className={row}>
                  <dt className={rowLabel}>{c.labels.subclasses}</dt>
                  <dd className={rowValue}>{c.details.subclasses.join(", ")}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/95 shadow-lg shadow-slate-900/5">
          <CardHeader>
            <CardTitle>
              <h2>{c.headings.states}</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {c.stateRows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-700">
                      <th className="py-2 pr-4 font-semibold">{c.labels.stateColumn}</th>
                      <th className="py-2 pr-4 font-semibold">{c.labels.stateSubclasses}</th>
                      <th className="py-2 pr-4 font-semibold">{c.labels.stateLevel}</th>
                      <th className="py-2 font-semibold">{c.labels.checked}</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-600">
                    {c.stateRows.map((r) => (
                      <tr key={r.state} className="border-b border-slate-100">
                        <td className="py-2 pr-4 font-medium">{r.state}</td>
                        <td className="py-2 pr-4">{r.subclasses.join(", ")}</td>
                        <td className="py-2 pr-4">{r.levelLabel}</td>
                        <td className="py-2">{r.checked}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-600">{c.stateNoData}</p>
            )}
            <p className="text-xs text-slate-500">{c.stateNote}</p>
          </CardContent>
        </Card>

        {c.duties.length > 0 && (
          <Card className="border-slate-200/80 bg-white/95 shadow-lg shadow-slate-900/5">
            <CardHeader>
              <CardTitle>
                <h2>{c.headings.duties}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
                {c.duties.map((duty) => (
                  <li key={duty}>{duty}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card className="border-slate-200/80 bg-white/95 shadow-lg shadow-slate-900/5">
          <CardHeader>
            <CardTitle>
              <h2>{c.headings.sources}</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            {c.sourceLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p>
              <a href={c.officialUrl} target="_blank" rel="noopener noreferrer" data-official-source className="font-medium text-cyan-800 underline">
                {c.officialLabel}
              </a>
            </p>
          </CardContent>
        </Card>

        <nav aria-label={c.headings.related} className="rounded-2xl border border-slate-200/80 bg-white/95 p-6">
          <h2 className="text-base font-semibold text-slate-900">{c.headings.related}</h2>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {c.related.map((link) => (
              <li key={link.path}>
                <Link href={publicPath(locale, link.path)} className="font-medium text-cyan-800 underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="text-xs text-slate-500">{c.notice}</p>
      </section>
    </main>
  );
}
