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
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isLocaleAdminPath(pathname: string): boolean {
  return /^\/(en|tr|zh-Hans)\/admin(?:\/.*)?$/.test(pathname);
}

function isDashboardPath(pathname: string): boolean {
  return /^\/(en|tr|zh-Hans)\/dashboard(?:\/.*)?$/.test(pathname);
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
