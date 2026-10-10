/**
 * Who may receive and see referral data. One place, checked against the DATABASE every time (never the session alone: a session issued while the
 * agent was pending, or before a rejection, must not decide access).
 *
 *  - Only an APPROVED agent can be attributed a referral, be assigned a lead, receive a commission or open any agent view / API.
 *  - A referred client's name, email, phone and report are visible to an agent ONLY through `canAgentSeeClient` (below): the report is the agent's,
 *    the agent is approved, and the client's newest consent row is a grant of an accepted wording. Everything else is the safe reference shape in
 *    lib/crm/leads.ts / lib/crm/transactions.ts (reference + purchase status). Tier and entered details are never shown to agents.
 */
import { redirect } from "next/navigation";

import { consentState } from "@/lib/consent/referral-consent";
import { PDF_LEAD_SOURCES } from "@/lib/crm/pdf-lead-sources";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireRole, type SessionUser } from "@/lib/auth/rbac";

/**
 * Guide-download / lead-magnet leads (name, email, phone) are OFF for agents until the consent system covers them: no pool view, no claim, no
 * agent email about them, and an already-claimed one is invisible to its agent (list, page, status update) even by direct URL. Admin is unchanged.
 * Server-side only; the UI never decides.
 */
export const AGENT_GUIDE_POOL_ENABLED = false as boolean;

/** The agent row only when it is an AGENT account that an admin has approved (null for pending, rejected, other roles, unknown ids). */
export async function getApprovedAgent(id: string | null | undefined): Promise<{ id: string; email: string; name: string | null; commissionRate: number | null } | null> {
  if (!id) return null;
  const row = await prisma.user.findFirst({
    where: { id, role: "AGENT", approvalStatus: "APPROVED" },
    select: { id: true, email: true, name: true, commissionRate: true },
  });
  return row ? { ...row, commissionRate: row.commissionRate === null || row.commissionRate === undefined ? null : Number(row.commissionRate) } : null;
}

/**
 * Server-component guard for agent pages that show data: signed in as an AGENT, and approved in the database right now. Anyone else is sent to the
 * agent dashboard, which shows the pending notice instead of content (no data is read before this returns).
 */
export async function requireApprovedAgentPage(locale: string, callbackPath: string): Promise<SessionUser> {
  const user = await requireRole("AGENT", locale, callbackPath);
  if (!(await getApprovedAgent(user.id))) {
    redirect(`${locale === "en" ? "" : `/${locale}`}/agent/dashboard`);
  }
  return user;
}

/** For route handlers and server actions: the signed-in agent when approved in the database, else null (the caller answers 401 / 403). */
export async function getApprovedAgentFromSession(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "AGENT") return null;
  return (await getApprovedAgent(user.id)) ? user : null;
}

/** What an agent sees in place of a client's name: a short reference derived from the report id. */
export const clientReference = (reportId: string) => `Referred client ${reportId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

/**
 * THE gate for client details. True only when ALL hold, read from the database now:
 *  the agent is APPROVED; the report exists and its agent_id is this agent; it is not a guide-download / lead-magnet lead (those are off for agents);
 *  and the client's newest consent row for this (report, agent) is a grant of an accepted wording (not withdrawn, table present).
 * Used by every agent-facing read: dashboard, lead page, PDF route, notes, assignment email. Admin views are role-based and do not use it.
 */
export async function canAgentSeeClient(agentId: string | null | undefined, reportId: string | null | undefined): Promise<boolean> {
  if (!agentId || !reportId) return false;
  try {
    if (!(await getApprovedAgent(agentId))) return false;
    const report = await prisma.userReport.findFirst({ where: { id: reportId, agentId }, select: { id: true, source: true } });
    if (!report) return false;
    if (!AGENT_GUIDE_POOL_ENABLED && PDF_LEAD_SOURCES.includes(report.source)) return false;
    return (await consentState(reportId, agentId)) === "granted";
  } catch (error) {
    console.error("[canAgentSeeClient] check failed (treated as no access):", error);
    return false;
  }
}
