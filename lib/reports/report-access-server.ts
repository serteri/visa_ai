import "server-only";

import { cookies } from "next/headers";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getCurrentUser } from "@/lib/auth/rbac";

import type { ReportRequester } from "./report-access";
import { REPORT_SESSION_COOKIE, REPORT_SESSION_MAX_AGE, verifiedReportSessionIds, withReportSession } from "./report-session";

/**
 * The requester, as verified server-side from the request's cookies: the signed admin cookie (lib/admin-auth.ts --
 * password login or the NextAuth ADMIN bridge) or a NextAuth session. Never derived from anything the client types.
 */
export async function getReportRequester(): Promise<ReportRequester> {
  const [legacyAdmin, user, sessionReportIds] = await Promise.all([
    isAdminAuthenticated().catch(() => false),
    getCurrentUser().catch(() => null),
    getReportSessionIds(),
  ]);
  return { isAdmin: legacyAdmin || user?.role === "ADMIN", sessionEmail: user?.email ?? null, sessionReportIds };
}

/** The report ids this browser created (signed httpOnly cookie, verified here); empty without one. */
export async function getReportSessionIds(): Promise<string[]> {
  try {
    const jar = await cookies();
    return verifiedReportSessionIds(jar.get(REPORT_SESSION_COOKIE)?.value);
  } catch {
    return [];
  }
}

/** True when THIS browser created `reportId`. */
export async function hasReportSession(reportId: string): Promise<boolean> {
  return (await getReportSessionIds()).includes(reportId);
}

/** Remembers a just-created report in the creating browser (call from the response to the form submission). Never throws. */
export async function rememberReportSession(reportId: string): Promise<void> {
  try {
    const jar = await cookies();
    const value = withReportSession(jar.get(REPORT_SESSION_COOKIE)?.value, reportId);
    if (!value) return;
    jar.set(REPORT_SESSION_COOKIE, value, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: REPORT_SESSION_MAX_AGE });
  } catch (err) {
    console.error("[report-session] could not remember the report in this browser (non-blocking):", err);
  }
}

/** True only for a verified admin session (see getReportRequester). */
export async function isAdminSession(): Promise<boolean> {
  return (await getReportRequester()).isAdmin;
}
