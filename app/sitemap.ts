import type { MetadataRoute } from "next";

import { activeLocales } from "@/lib/i18n/config";
import { mockVisaTypes } from "@/lib/mock-visa-data";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

function toUrl(path: string) {
  return `${BASE_URL}${path}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = new Set<string>();

  routes.add("/");

  for (const locale of activeLocales) {
    routes.add(`/${locale}`);
    routes.add(`/${locale}/full-check`);
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

  return Array.from(routes).map((path) => ({
    url: toUrl(path),
    lastModified: now,
    changeFrequency: path.includes("/visas/") ? "weekly" : "daily",
    priority: path === "/" ? 1 : path.includes("/visas/") ? 0.7 : 0.9,
  }));
}
