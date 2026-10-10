/**
 * Who may receive and see referral data. One place, checked against the DATABASE every time (never the session alone: a session issued while the
 * agent was pending, or before a rejection, must not decide access).
 *
 *  - Only an APPROVED agent can be attributed a referral, be assigned a lead, receive a commission or open any agent view / API.
 *  - Until the client's consent to share is implemented (the next task), NO agent sees a referred client's details: not the name, email, phone,
 *    tier, entered details or the report / PDF. `AGENT_SEES_CLIENT_DETAILS` is the single switch the consent work will replace with a per-client
 *    check; every agent-facing read goes through the safe shapes in lib/crm/leads.ts and lib/crm/transactions.ts.
 */
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireRole, type SessionUser } from "@/lib/auth/rbac";

/** False until consent exists. Read by the agent-facing code; the PDF route and the portal views refuse client details while it is false. */
export const AGENT_SEES_CLIENT_DETAILS = false as boolean;

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
