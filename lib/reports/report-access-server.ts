import "server-only";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getCurrentUser } from "@/lib/auth/rbac";

import type { ReportRequester } from "./report-access";

/**
 * The requester, as verified server-side from the request's cookies: the signed admin cookie (lib/admin-auth.ts --
 * password login or the NextAuth ADMIN bridge) or a NextAuth session. Never derived from anything the client types.
 */
export async function getReportRequester(): Promise<ReportRequester> {
  const [legacyAdmin, user] = await Promise.all([
    isAdminAuthenticated().catch(() => false),
    getCurrentUser().catch(() => null),
  ]);
  return { isAdmin: legacyAdmin || user?.role === "ADMIN", sessionEmail: user?.email ?? null };
}

/** True only for a verified admin session (see getReportRequester). */
export async function isAdminSession(): Promise<boolean> {
  return (await getReportRequester()).isAdmin;
}
