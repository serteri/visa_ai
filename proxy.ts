import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import { auth } from "@/auth";

const LOCALES = ["en", "tr", "zh-Hans"] as const;
const DEFAULT_LOCALE = "en";
const BLOCKED_BOT_UA_TOKENS = ["gptbot", "ccbot", "anthropic-ai"];

function isBlockedBot(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const normalized = userAgent.toLowerCase();
  return BLOCKED_BOT_UA_TOKENS.some((token) => normalized.includes(token));
}

function getLocale(request: NextRequest): string {
  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    negotiatorHeaders[key] = value;
  });

  try {
    const languages = new Negotiator({ headers: negotiatorHeaders }).languages();
    return match(languages, LOCALES, DEFAULT_LOCALE);
  } catch {
    return DEFAULT_LOCALE;
  }
}

function isRootAdminPath(pathname: string): boolean {
  // The legacy ops admin is forced under /en/admin. The new role-based CRM
  // admin (/admin/crm) is deliberately excluded so it stays prefixless like the
  // rest of the app — forcing it under /en collides with the next.config
  // /en/:path* → /:path* redirect and causes a redirect loop.
  if (pathname.startsWith("/admin/crm")) return false;
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isLocaleAdminPath(pathname: string): boolean {
  return /^\/(en|tr|zh-Hans)\/admin(?:\/.*)?$/.test(pathname);
}

function isDashboardPath(pathname: string): boolean {
  return /^\/(en|tr|zh-Hans)\/dashboard(?:\/.*)?$/.test(pathname);
}

function localeFromPath(pathname: string): "en" | "tr" | "zh-Hans" {
  if (pathname.startsWith("/tr/") || pathname === "/tr") return "tr";
  if (pathname.startsWith("/zh-Hans/") || pathname === "/zh-Hans") return "zh-Hans";
  return "en";
}

// New role-based CRM portal. The AGENT portal (English) is prefixless
// (/agent/...); the ADMIN portal always carries the locale prefix
// (/en/admin/... — proxy normalizes bare /admin to /en/admin above), so its
// matcher requires a leading locale. Legacy /admin/{leads,agents,referrals,...}
// pages are deliberately excluded so they keep their ADMIN_TOKEN gate.
function portalRoleForPath(pathname: string): "AGENT" | "ADMIN" | null {
  if (/^\/(?:tr\/|zh-Hans\/)?agent(?:\/.*)?$/.test(pathname)) return "AGENT";
  if (/^\/(?:en|tr|zh-Hans)\/admin\/crm(?:\/.*)?$/.test(pathname)) return "ADMIN";
  return null;
}

function portalHomeForRole(role: string | undefined, locale: string): string {
  if (role === "ADMIN") return `/${locale}/admin/crm/dashboard`;
  const prefix = locale === "en" ? "" : `/${locale}`;
  if (role === "AGENT") return `${prefix}/agent/dashboard`;
  return `${prefix}/dashboard`;
}

export const proxy = auth((req) => {
  const { pathname, searchParams } = req.nextUrl;
  const isEnAdminPath = pathname === "/en/admin" || pathname.startsWith("/en/admin/");

  // Legacy country hub paths -> canonical visa hub paths
  if (pathname === "/canada") {
    const redirectUrl = new URL("/visas/canada", req.url);
    redirectUrl.search = searchParams.toString();
    return NextResponse.redirect(redirectUrl);
  }
  if (pathname === "/tr/canada") {
    const redirectUrl = new URL("/tr/visas/canada", req.url);
    redirectUrl.search = searchParams.toString();
    return NextResponse.redirect(redirectUrl);
  }
  if (pathname === "/zh-Hans/canada") {
    const redirectUrl = new URL("/zh-Hans/visas/canada", req.url);
    redirectUrl.search = searchParams.toString();
    return NextResponse.redirect(redirectUrl);
  }

  if (isBlockedBot(req.headers.get("user-agent"))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Geo-based locale routing for the assessment funnel: Turkish visitors
  // landing on the prefixless (default English) /full-check entry point are
  // redirected to the /tr version, preserving all query params (e.g.
  // ?country=AU). Scoped to the exact prefixless path so it never fires for
  // /tr/full-check itself, which prevents any redirect loop.
  if (pathname === "/full-check") {
    const country = req.headers.get("x-vercel-ip-country");
    if (country === "TR") {
      const redirectUrl = new URL("/tr/full-check", req.url);
      redirectUrl.search = searchParams.toString();
      return NextResponse.redirect(redirectUrl);
    }
  }

  // If visiting '/en' directly or any path starting with '/en/', redirect to prefixless path
  if (pathname === "/en") {
    const url = new URL("/", req.url);
    url.search = searchParams.toString();
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/en/") && !isEnAdminPath) {
    const targetPath = pathname.substring(3); // Remove '/en'
    const url = new URL(targetPath || "/", req.url);
    url.search = searchParams.toString();
    return NextResponse.redirect(url);
  }

  // Handle root "/" path
  if (pathname === "/") {
    const locale = getLocale(req);
    // If preferred locale is English, rewrite to /en internally. Otherwise redirect to /tr, /zh-Hans etc.
    if (locale === "en") {
      return NextResponse.rewrite(new URL("/en", req.url));
    }
    return NextResponse.redirect(new URL(`/${locale}`, req.url));
  }

  if (isRootAdminPath(pathname)) {
    const targetPath = pathname === "/admin" ? "/en/admin/dashboard" : `/en${pathname}`;
    const redirectUrl = new URL(targetPath, req.url);
    redirectUrl.search = searchParams.toString();
    return NextResponse.redirect(redirectUrl);
  }

  // ── Role-based CRM portal protection (runs BEFORE the legacy ADMIN_TOKEN
  //    gate so the new /admin/dashboard + /admin/agent pages are governed by
  //    role, not the shared admin password). Prefixless /admin was already
  //    normalized to /en/admin above, so admin paths here carry a locale. ──
  const portalRole = portalRoleForPath(pathname);
  if (portalRole) {
    const locale = localeFromPath(pathname);
    const sessionRole = req.auth?.user?.role;
    if (!req.auth?.user) {
      const target = searchParams.toString() ? `${pathname}?${searchParams}` : pathname;
      const loginBase = locale === "en" ? "/login" : `/${locale}/login`;
      const loginUrl = new URL(loginBase, req.url);
      loginUrl.searchParams.set("callbackUrl", target);
      return NextResponse.redirect(loginUrl);
    }
    if (sessionRole !== portalRole) {
      return NextResponse.redirect(new URL(portalHomeForRole(sessionRole, locale), req.url));
    }
    // Authorized. Locale-prefixed paths (all admin, plus tr/zh-Hans agent)
    // short-circuit like the legacy admin block to skip the /en rewrite; the
    // English prefixless agent path falls through to the rewrite below.
    if (/^\/(?:en|tr|zh-Hans)\//.test(pathname)) {
      return NextResponse.next();
    }
  }

  if (isLocaleAdminPath(pathname)) {
    const locale = pathname.startsWith("/tr/") ? "tr" : pathname.startsWith("/zh-Hans/") ? "zh-Hans" : "en";
    const configuredAdminToken = process.env.ADMIN_TOKEN?.trim();
    const providedAdminToken = searchParams.get("ADMIN_TOKEN")?.trim();
    if (configuredAdminToken && providedAdminToken !== configuredAdminToken) {
      // For EN, redirect to root '/' instead of '/en'
      const redirectPath = locale === "en" ? "/" : `/${locale}`;
      return NextResponse.redirect(new URL(redirectPath, req.url));
    }
    return NextResponse.next();
  }

  if (isDashboardPath(pathname) && !req.auth) {
    const locale = pathname.startsWith("/tr/") ? "tr" : pathname.startsWith("/zh-Hans/") ? "zh-Hans" : "en";
    const signInPath = locale === "en" ? "/sign-in" : `/${locale}/sign-in`;
    return NextResponse.redirect(new URL(signInPath, req.url));
  }

  // Rewrite all clean English paths (e.g. /tools/points-calculator) to /en/... internally
  const hasLocalePrefix = pathname.startsWith("/tr/") || pathname.startsWith("/zh-Hans/") || pathname === "/tr" || pathname === "/zh-Hans";
  if (!hasLocalePrefix) {
    // Check if it's an asset or Next.js internal path to skip rewrite
    const isAsset = pathname.startsWith("/_next/") || 
                    pathname.startsWith("/api/") || 
                    pathname.includes(".") || 
                    pathname === "/favicon.ico" || 
                    pathname === "/robots.txt" || 
                    pathname === "/sitemap.xml";
    if (!isAsset) {
      const rewriteUrl = new URL(`/en${pathname}`, req.url);
      rewriteUrl.search = searchParams.toString();
      return NextResponse.rewrite(rewriteUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
