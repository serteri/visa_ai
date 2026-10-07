/**
 * Public URLs for SEO tags. English is served prefixless (next.config.ts 308-redirects "/en/..." to "/..."; proxy.ts
 * rewrites "/" to "/en" internally); "/tr" and "/zh-Hans" keep their prefix. A canonical, hreflang or sitemap URL must
 * be the URL that answers 200, never the internal "/en/..." route path.
 */
import { activeLocales, type Locale } from "@/lib/i18n/config";

/** The production origin (the same constant app/layout.tsx, the locale layout and the sitemap use). */
export const SITE_ORIGIN = "https://www.logivisa.com";

/** "/occupations/x" -> "/occupations/x" (en), "/tr/occupations/x" (tr), "/zh-Hans/occupations/x" (zh-Hans). "/" for the English home. */
export function publicPath(locale: Locale | string, path: string): string {
  const clean = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return locale === "en" ? clean || "/" : `/${locale}${clean}`;
}

export function publicUrl(locale: Locale | string, path: string): string {
  const p = publicPath(locale, path);
  return p === "/" ? SITE_ORIGIN : `${SITE_ORIGIN}${p}`;
}

/** hreflang alternates for the three active locales plus x-default (English), absolute. */
export function languageAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of activeLocales) languages[locale] = publicUrl(locale, path);
  languages["x-default"] = publicUrl("en", path);
  return languages;
}

/** Next.js `alternates` for a page: self-referencing canonical + hreflang set. */
export function pageAlternates(locale: Locale | string, path: string) {
  return { canonical: publicUrl(locale, path), languages: languageAlternates(path) };
}
