import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/rbac";
import { setAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Bridges a NextAuth ADMIN session (role-based CRM portal,
 * app/[locale]/(portal)/admin/crm/*) into the legacy password-cookie admin
 * session (app/[locale]/(main)/admin/*, lib/admin-auth.ts) so a CRM admin
 * clicking "Data Sync & Sources" lands there directly instead of being
 * stopped at the legacy password prompt.
 *
 * This is a one-way bridge (CRM session -> legacy session) only. The
 * reverse isn't meaningfully bridgeable the same way: the legacy session is
 * just a shared password with no notion of *which* admin is signed in, so
 * there's no NextAuth identity to construct from it. A legacy-only admin
 * hitting a CRM page still needs to actually sign in via NextAuth
 * (requireRole's normal redirect to /login) -- that's a real authentication
 * step, not a bug to route around.
 *
 * Runs in the Node runtime (not Edge middleware) specifically because
 * lib/admin-auth.ts's token hashing uses Node's `crypto` module, which
 * proxy.ts's own comments already note isn't available at the Edge.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("locale") || "en";
  const to = searchParams.get("to") || `/${locale}/admin/data-sync`;

  // Only ever redirect to a same-origin, locale-admin-scoped relative path
  // -- never trust an arbitrary "to" value as an open redirect target.
  const destination = /^\/(?:en|tr|zh-Hans)?\/?admin\//.test(to) ? to : `/${locale}/admin/data-sync`;

  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    const loginBase = locale === "en" ? "/login" : `/${locale}/login`;
    const loginUrl = new URL(loginBase, request.url);
    loginUrl.searchParams.set("callbackUrl", `/${locale}/admin/crm/dashboard`);
    return NextResponse.redirect(loginUrl);
  }

  await setAdminSession();
  return NextResponse.redirect(new URL(destination, request.url));
}
