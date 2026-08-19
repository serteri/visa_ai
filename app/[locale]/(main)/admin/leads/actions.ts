"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  clearAdminSession,
  getAdminPassword,
  isAdminAuthenticated,
  isValidAdminPassword,
  setAdminSession,
} from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

/**
 * Assigns a lead (UserReport) to an agent -- writes the same
 * UserReport.agentId column the CRM's assignLeadToAgent (app/[locale]/
 * (portal)/admin/crm/actions.ts) already uses, so a lead assigned from
 * either admin surface shows up consistently in the agent's CRM pool.
 * Gated by the legacy cookie session (this page's own auth), not
 * getCurrentUser()'s NextAuth role check, since that's the session an
 * operator on this page actually has.
 */
export async function assignLeadToAgentLegacy(leadId: string, agentId: string): Promise<void> {
  if (!(await isAdminAuthenticated())) throw new Error("Unauthorized");
  if (!leadId || !agentId) throw new Error("Missing leadId or agentId");

  const agent = await prisma.user.findFirst({
    where: { id: agentId, role: "AGENT", approvalStatus: "APPROVED" },
    select: { id: true },
  });
  if (!agent) throw new Error("Agent not found or not approved");

  await prisma.userReport.update({ where: { id: leadId }, data: { agentId } });
  revalidatePath("/", "layout");
}

// Only accept a same-origin, locale-admin-scoped relative path (set as a
// hidden "destination" field by the access page, itself derived from
// proxy.ts's callbackUrl) -- never redirect to an arbitrary URL. Defaults to
// /admin/states, not /admin/leads: the leads page queries a Drizzle table
// that doesn't exist in the live database yet (see CLAUDE.md), so it used
// to 500 immediately after every successful login.
function resolveDestination(locale: string, raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw : "";
  if (/^\/(?:en|tr|zh-Hans)?\/?admin\//.test(value)) return value;
  return `/${locale}/admin/states`;
}

export async function loginAdmin(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en").trim() || "en";
  const password = String(formData.get("password") ?? "");
  const destination = resolveDestination(locale, formData.get("destination"));

  if (!getAdminPassword()) {
    redirect(`/${locale}/admin/leads/access?auth=setup`);
  }

  if (!isValidAdminPassword(password)) {
    redirect(`/${locale}/admin/leads/access?auth=invalid`);
  }

  await setAdminSession();
  redirect(destination);
}

export async function logoutAdmin(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en").trim() || "en";
  await clearAdminSession();
  redirect(`/${locale}/admin/leads/access?auth=signed-out`);
}