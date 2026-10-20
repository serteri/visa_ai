import Link from "next/link";

import { guidesAvailableIn, HOME_GUIDE_SLUGS, HUB_GUIDES } from "@/lib/guides/hub";
import { publicPath } from "@/lib/seo/urls";

/** Small homepage pointer to three research guides and the guides hub. English only (the guides are). */
export function ResearchGuidesHome({ locale }: { locale: string }) {
  if (!guidesAvailableIn(locale)) return null;
  const featured = HOME_GUIDE_SLUGS.map((s) => HUB_GUIDES.find((g) => g.slug === s)!);
  return (
    <section className="border-t border-slate-200 py-16" data-home-research-guides>
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Research Guides</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {featured.map((g) => (
            <Link key={g.slug} href={publicPath("en", `/guides/${g.slug}`)} className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-cyan-300" data-home-guide={g.slug}>
              <span className="text-xs font-bold uppercase tracking-wide text-cyan-800">{g.category}</span>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">{g.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{g.description}</p>
            </Link>
          ))}
        </div>
        <p className="mt-6 text-sm font-semibold">
          <Link href={publicPath("en", "/guides")} className="text-cyan-800 underline" data-home-guides-all>
            View all guides →
          </Link>
        </p>
      </div>
    </section>
  );
}
