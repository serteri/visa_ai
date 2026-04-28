import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function isLocaleAdminPath(pathname: string): boolean {
  return /^\/(en|tr)\/admin(?:\/.*)?$/.test(pathname);
}

function isRootAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function proxy(request: NextRequest) {
  const { nextUrl } = request;
  const { pathname, searchParams } = nextUrl;

  if (isRootAdminPath(pathname)) {
    const targetPath = pathname === "/admin" ? "/en/admin/dashboard" : `/en${pathname}`;
    const redirectUrl = new URL(targetPath, request.url);
    redirectUrl.search = searchParams.toString();
    return NextResponse.redirect(redirectUrl);
  }

  if (!isLocaleAdminPath(pathname)) {
    return NextResponse.next();
  }

  const locale = pathname.startsWith("/tr/") ? "tr" : "en";
  const homeUrl = new URL(`/${locale}`, request.url);
  const configuredAdminToken = process.env.ADMIN_TOKEN?.trim();
  const providedAdminToken = searchParams.get("ADMIN_TOKEN")?.trim();

  if (!configuredAdminToken && !providedAdminToken) {
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/en/admin/:path*", "/tr/admin/:path*"],
};