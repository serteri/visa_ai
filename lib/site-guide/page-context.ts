/** What the current page is about, and whether the guide may appear on it at all. Pure: takes the pathname (and query string), returns a context. */
import type { GuideCountry, PageContext, PageType } from "./types";

const LOCALE_PREFIX = /^\/(en|tr|zh-Hans)(?=\/|$)/;

export function stripLocale(pathname: string): string {
  const p = (pathname || "/").replace(LOCALE_PREFIX, "") || "/";
  return p.length > 1 ? p.replace(/\/+$/, "") : p;
}

/**
 * Routes where the guide is not shown and never nudges: checkout and payment, the Assessment form and result (which carry personal answers and report
 * access links), report and download pages, sign-in / account pages, admin areas, and the AI Assistant itself.
 */
const HIDDEN_PREFIXES = [
  "/checkout", "/full-check", "/reports", "/report", "/results", "/dashboard", "/journey", "/admin", "/admin-tools",
  "/sign-in", "/register", "/assistant", "/ai-assistant", "/widget", "/api", "/pricing", "/checker", "/ai-visa-match",
];

export function isHiddenPath(pathname: string): boolean {
  const p = stripLocale(pathname);
  if (HIDDEN_PREFIXES.some((h) => p === h || p.startsWith(`${h}/`))) return true;
  return /\/(download|pdf|unlock|payment|success)(\/|$)/.test(p);
}

const CANADA_VISA_SLUGS = /^\/visas\/(canada|atlantic-immigration-program)(?:$|[-/])/;

export function resolvePageContext(pathname: string, search = ""): PageContext {
  const p = stripLocale(pathname);
  if (isHiddenPath(pathname)) return { hidden: true, pageType: "other", country: null };

  if (p === "/") return { hidden: false, pageType: "home", country: null };

  // Canada pages: its programs and its calculator. Nothing Australian is offered here.
  if (CANADA_VISA_SLUGS.test(p) || p.startsWith("/tools/points-calculator/canada")) {
    return { hidden: false, pageType: "canada", country: "CA", visaSlug: p.startsWith("/visas/") ? p.slice("/visas/".length) : undefined };
  }
  if (/[?&]country=CA(?:&|$)/i.test(search)) return { hidden: false, pageType: "canada", country: "CA" };

  const occ = p.match(/^\/occupations\/(\d{6})(?:$|[-/])/);
  if (occ) return { hidden: false, pageType: "occupation", country: "AU", occupationCode: occ[1] };
  if (p === "/occupations" || p.startsWith("/occupations/")) return { hidden: false, pageType: "occupation", country: "AU" };

  const visa = p.match(/^\/visas\/([^/]+)$/);
  if (visa && visa[1] !== "australia") return { hidden: false, pageType: "visa", country: "AU", visaSlug: visa[1] };
  if (p === "/visas/australia") return { hidden: false, pageType: "visa", country: "AU" };
  if (p === "/visas") return { hidden: false, pageType: "visa", country: null };

  if (p.startsWith("/tools/visa-comparison")) return { hidden: false, pageType: "comparison", country: "AU" };
  if (p === "/tools/points-calculator") return { hidden: false, pageType: "points", country: null };
  if (p.startsWith("/tools/points-calculator")) return { hidden: false, pageType: "points", country: "AU" };
  if (p.startsWith("/tools/")) return { hidden: false, pageType: "tool", country: "AU" };

  if (p === "/guide" || p.startsWith("/guide/")) return { hidden: false, pageType: "other", country: null };
  if (p === "/guides" || p.startsWith("/guides/") || p.startsWith("/rehber")) {
    return { hidden: false, pageType: "guide", country: "AU" };
  }
  return { hidden: false, pageType: "other", country: null };
}

/** The page type reported in analytics: a fixed vocabulary, never a URL or an identifier. */
export function analyticsPageType(ctx: PageContext): PageType {
  return ctx.pageType;
}

export function countryOrNull(value: unknown): GuideCountry | null {
  return value === "AU" || value === "CA" ? value : null;
}
