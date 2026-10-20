import Link from "next/link";

import { Breadcrumbs, jsonLd } from "@/components/seo/breadcrumbs";
import { GUIDES_CHECKED_ON, type ResearchGuide } from "@/lib/guides/research-guides";
import { publicPath, publicUrl } from "@/lib/seo/urls";

/** One Wave 1 research guide: direct answer, sourced sections and tables, official sources, related LogiVisa research. English only. */
export function ResearchGuideView({ guide }: { guide: ResearchGuide }) {
  const path = `/guides/${guide.slug}`;
  const crumbs = [
    { label: "Home", path: "/" },
    { label: "Guides", path: "/guides" },
    { label: guide.h1, path },
  ];
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: guide.title,
    description: guide.description,
    url: publicUrl("en", path),
    inLanguage: "en",
    dateModified: GUIDES_CHECKED_ON,
  };
  return (
    <main className="min-h-screen bg-background pb-16 pt-6" data-research-guide={guide.slug}>
      <article className="mx-auto max-w-3xl space-y-6 px-4 sm:px-6">
        <Breadcrumbs locale="en" crumbs={crumbs} />
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{guide.h1}</h1>
          <p className="mt-2 text-xs text-slate-500">
            Sources checked <time dateTime={GUIDES_CHECKED_ON}>{GUIDES_CHECKED_ON}</time>. Information only, not migration advice.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5" data-direct-answer>
          <h2 className="text-base font-semibold text-slate-900">Short answer</h2>
          {guide.directAnswer.map((p) => (
            <p key={p} className="mt-2 text-base leading-7 text-slate-800">
              {p}
            </p>
          ))}
        </section>

        {guide.sections.map((s) => (
          <section key={s.heading} className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-900">{s.heading}</h2>
            {s.table && (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-sm" data-guide-table>
                  <caption className="sr-only">{s.table.caption}</caption>
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      {s.table.head.map((h, i) => (
                        <th key={i} scope="col" className="px-4 py-3 text-left font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="align-top">
                    {s.table.rows.map((row) => (
                      <tr key={row[0]} className="border-t border-slate-200">
                        {row.map((cell, i) =>
                          i === 0 ? (
                            <th key={i} scope="row" className="min-w-[8rem] px-4 py-3 text-left font-medium text-slate-900">
                              {cell}
                            </th>
                          ) : (
                            <td key={i} className="min-w-[12rem] px-4 py-3 text-slate-700">
                              {cell}
                            </td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {s.paragraphs?.map((p) => (
              <p key={p} className="text-base leading-7 text-slate-700">
                {p}
              </p>
            ))}
            {s.bullets && (
              <ul className="list-disc space-y-1.5 pl-5 text-base leading-7 text-slate-700">
                {s.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <section className="space-y-3" data-guide-sources>
          <h2 className="text-xl font-semibold text-slate-900">Official sources</h2>
          <ul className="space-y-2 text-sm text-slate-700">
            {guide.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" data-official-source className="font-medium text-cyan-800 underline">
                  {s.label}
                </a>
                <span className="text-slate-600"> — {s.note}</span>
              </li>
            ))}
          </ul>
        </section>

        <nav aria-label="Related research" className="rounded-2xl border border-slate-200 bg-white p-5" data-guide-related>
          <h2 className="text-base font-semibold text-slate-900">Related LogiVisa research</h2>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-cyan-800">
            {guide.related.map((l) => (
              <li key={l.path}>
                <Link
                  href={publicPath("en", l.path)}
                  className="underline"
                  data-guide-destination={l.type}
                  {...(l.destination ? { "data-tool-destination": l.destination } : {})}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
    </main>
  );
}
