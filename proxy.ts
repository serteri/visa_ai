import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/(.*)/dashboard(.*)"]);

function isRootAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isLocaleAdminPath(pathname: string): boolean {
  return /^\/(en|tr|zh-Hans)\/admin(?:\/.*)?$/.test(pathname);
}

const clerkHandler = clerkMiddleware(async (auth, request) => {
  const req = request as NextRequest;
  const { pathname, searchParams } = req.nextUrl;

  // Redirect /admin/* → /en/admin/*
  if (isRootAdminPath(pathname)) {
    const targetPath = pathname === "/admin" ? "/en/admin/dashboard" : `/en${pathname}`;
    const redirectUrl = new URL(targetPath, req.url);
    redirectUrl.search = searchParams.toString();
    return NextResponse.redirect(redirectUrl);
  }

  // Optional ADMIN_TOKEN gate on locale admin paths
  if (isLocaleAdminPath(pathname)) {
    const locale = pathname.startsWith("/tr/") ? "tr" : pathname.startsWith("/zh-Hans/") ? "zh-Hans" : "en";
    const homeUrl = new URL(`/${locale}`, req.url);
    const configuredAdminToken = process.env.ADMIN_TOKEN?.trim();
    const providedAdminToken = searchParams.get("ADMIN_TOKEN")?.trim();

    if (configuredAdminToken && providedAdminToken !== configuredAdminToken) {
      return NextResponse.redirect(homeUrl);
    }
    return NextResponse.next();
  }

  // Protect dashboard routes — redirect to sign-in if not authenticated
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export { clerkHandler as proxy };

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
