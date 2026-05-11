import { NextResponse } from "next/server";
import { auth } from "@/auth";

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
      return NextResponse.redirect(new URL(`/${locale}`, req.url));
    }
    return NextResponse.next();
  }

  if (isDashboardPath(pathname) && !req.auth) {
    const locale = pathname.startsWith("/tr/") ? "tr" : pathname.startsWith("/zh-Hans/") ? "zh-Hans" : "en";
    return NextResponse.redirect(new URL(`/${locale}/sign-in`, req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
