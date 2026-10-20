import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { guidesAvailableIn, HUB_GUIDES } from "@/lib/guides/hub";
import { publicPath } from "@/lib/seo/urls";

/** "Latest research guides" at the top of /guides, above the existing catalogue (which is unchanged). English only. */
export function ResearchGuidesHubSection({ locale }: { locale: string }) {
  if (!guidesAvailableIn(locale)) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 lg:px-8" data-research-guides-hub aria-labelledby="latest-research-guides">
      <h2 id="latest-research-guides" className="text-2xl font-bold tracking-tight text-slate-950">
        Latest research guides
      </h2>
      <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">Source-backed comparisons of Australian occupation, assessment and nomination terms. Information only, not migration advice.</p>
      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {HUB_GUIDES.map((g) => (
          <Link key={g.slug} href={publicPath("en", `/guides/${g.slug}`)} className="group" data-research-guide-card={g.slug}>
            <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-cyan-200">
              <span className="self-start rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-cyan-800">{g.category}</span>
              <h3 className="mt-4 text-xl font-bold leading-7 tracking-tight text-slate-950">{g.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{g.description}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-cyan-800">
                Read guide
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
