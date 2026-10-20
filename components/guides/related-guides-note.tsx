import Link from "next/link";

import { findResearchGuide } from "@/lib/guides/research-guides";
import { publicPath } from "@/lib/seo/urls";

/** A short, contextual pointer from a tool page to the research guides that explain the confusion it invites. English only (the guides are). */
export function RelatedGuidesNote({ locale, slugs, lead }: { locale: string; slugs: string[]; lead: string }) {
  if (locale !== "en") return null;
  const guides = slugs.map((s) => findResearchGuide(s)).filter((g): g is NonNullable<typeof g> => Boolean(g));
  if (!guides.length) return null;
  return (
    <aside className="mx-auto mt-6 max-w-4xl px-4 text-sm text-slate-700" data-related-guides>
      <p>
        {lead}{" "}
        {guides.map((g, i) => (
          <span key={g.slug}>
            {i > 0 && ", "}
            <Link href={publicPath(locale, `/guides/${g.slug}`)} className="font-medium text-cyan-800 underline">
              {g.h1}
            </Link>
          </span>
        ))}
        .
      </p>
    </aside>
  );
}
