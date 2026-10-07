import type { MetadataRoute } from "next";

import { activeLocales } from "@/lib/i18n/config";
import { mockVisaTypes } from "@/lib/mock-visa-data";
import { OCCUPATION_DATASET_DATE } from "@/lib/occupations/page-content";
import { latestVerifiedDate, occupationRichness } from "@/lib/occupations/richness";
import { buildOccupationSlug, getUniqueOccupations } from "@/lib/occupations/seo";
import { languageAlternates, publicUrl } from "@/lib/seo/urls";

// URLs are the ones that answer 200 (English prefixless -- "/en/..." 308-redirects), each with its hreflang alternates
// (en, tr, zh-Hans, x-default). A redirecting URL in a sitemap is a Search Console "Page with redirect" issue.
//
// lastModified is only given where the repository holds a real date: an occupation page's is the most recent source
// date behind it (assessing-authority verification, state list provenance), else the occupation dataset date. Static and
// visa pages carry no date in the repository, so they have none rather than "now" on every request.
//
// Occupation pages in the "thin" tier (lib/occupations/richness.ts) are noindex and are not listed.

export function buildSitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  const add = (path: string, lastModified?: string) => {
    for (const locale of activeLocales) {
      entries.push({
        url: publicUrl(locale, path),
        ...(lastModified ? { lastModified } : {}),
        alternates: { languages: languageAlternates(path) },
      });
    }
  };

  for (const path of ["", "/full-check", "/guide", "/tools/points-calculator", "/tools/anzsco-finder"]) add(path || "/");

  const activeVisaSubclasses = Array.from(new Set(mockVisaTypes.filter((visa) => visa.reviewed_status !== "outdated").map((visa) => visa.subclass)));
  for (const subclass of activeVisaSubclasses) add(`/visas/${subclass}`);

  for (const occupation of getUniqueOccupations()) {
    const richness = occupationRichness(occupation);
    if (richness.tier === "thin") continue;
    add(`/occupations/${buildOccupationSlug(occupation)}`, latestVerifiedDate(richness) ?? OCCUPATION_DATASET_DATE);
  }

  return entries;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemap();
}
