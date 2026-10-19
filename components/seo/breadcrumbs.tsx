import Link from "next/link";

import { publicPath, publicUrl } from "@/lib/seo/urls";

export type Crumb = { label: string; path: string };

/** JSON-LD safe to inline: "<" is escaped so a title can never close the script element. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function breadcrumbSchema(locale: string, crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, item: publicUrl(locale, c.path) })),
  };
}

/** Visible breadcrumb trail plus its BreadcrumbList JSON-LD. The last crumb is the current page (not a link). */
export function Breadcrumbs({ locale, crumbs }: { locale: string; crumbs: Crumb[] }) {
  return (
    <>
      <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {crumbs.map((c, i) => (
            <li key={c.path} className="flex items-center gap-2">
              {i < crumbs.length - 1 ? (
                <Link href={publicPath(locale, c.path)} className="text-cyan-900 underline">
                  {c.label}
                </Link>
              ) : (
                <span aria-current="page">{c.label}</span>
              )}
              {i < crumbs.length - 1 && <span aria-hidden>›</span>}
            </li>
          ))}
        </ol>
      </nav>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema(locale, crumbs)) }} />
    </>
  );
}
