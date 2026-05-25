import type { MetadataRoute } from "next";

import { activeLocales } from "@/lib/i18n/config";
import { getCachedSeoOccupations } from "@/lib/cache/public-read-models";
import { mockVisaTypes } from "@/lib/mock-visa-data";
import { buildOccupationSlug } from "@/lib/occupations/seo";

const BASE_URL = "https://www.logivisa.com";

function toUrl(path: string) {
  return `${BASE_URL}${path}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const routes = new Set<string>();

  routes.add("/");

  const localeStaticRoutes = [
    "",
    "/full-check",
    "/guide",
    "/tools/points-calculator",
    "/tools/anzsco-finder",
  ];

  for (const locale of activeLocales) {
    for (const staticRoute of localeStaticRoutes) {
      routes.add(`/${locale}${staticRoute}`);
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
      routes.add(`/${locale}/visas/${subclass}`);
    }
  }

  const occupations = await getCachedSeoOccupations();
  for (const locale of activeLocales) {
    for (const occupation of occupations) {
      routes.add(`/${locale}/occupations/${buildOccupationSlug(occupation)}`);
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
