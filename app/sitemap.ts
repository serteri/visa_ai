import type { MetadataRoute } from "next";

import { activeLocales } from "@/lib/i18n/config";
import { getCachedSeoOccupations } from "@/lib/cache/public-read-models";
import { mockVisaTypes } from "@/lib/mock-visa-data";
import { buildOccupationSlug } from "@/lib/occupations/seo";

const BASE_URL = "https://www.logivisa.com";

function toUrl(path: string) {
  return `${BASE_URL}${path}`;
}

// proxy.ts serves English prefixless ("/en" 307-redirects to "/", and
// "/en/x" redirects to "/x"), while "/tr" and "/zh-Hans" keep their prefix.
// The sitemap must submit the URLs that actually resolve with a 200, not
// the "/en/..." internal route paths — submitting a redirecting URL in the
// sitemap is a real Search Console issue ("Page with redirect"), and is
// part of what confuses Google's indexing of this site.
function localePath(locale: string, path: string): string {
  return locale === "en" ? path || "/" : `/${locale}${path}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const routes = new Set<string>();

  const localeStaticRoutes = [
    "",
    "/full-check",
    "/guide",
    "/tools/points-calculator",
    "/tools/anzsco-finder",
  ];

  for (const locale of activeLocales) {
    for (const staticRoute of localeStaticRoutes) {
      routes.add(localePath(locale, staticRoute));
    }
  }

  const activeVisaSubclasses = Array.from(
    new Set(
      mockVisaTypes
        .filter((visa) => visa.reviewed_status !== "outdated")
        .map((visa) => visa.subclass)
    )
  );

  for (const locale of activeLocales) {
    for (const subclass of activeVisaSubclasses) {
      routes.add(localePath(locale, `/visas/${subclass}`));
    }
  }

  const occupations = await getCachedSeoOccupations();
  for (const locale of activeLocales) {
    for (const occupation of occupations) {
      routes.add(localePath(locale, `/occupations/${buildOccupationSlug(occupation)}`));
    }
  }

  return Array.from(routes).map((path) => ({
    url: toUrl(path),
    lastModified: now,
    changeFrequency: path.includes("/visas/") || path.includes("/occupations/") ? "weekly" : "daily",
    priority:
      path === "/"
        ? 1
        : path.includes("/visas/") || path.includes("/occupations/")
          ? 0.7
          : 0.9,
  }));
}
