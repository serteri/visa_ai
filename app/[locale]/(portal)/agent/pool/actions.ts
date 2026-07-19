"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/rbac";
import { claimLead } from "@/lib/crm/leads";

export async function claimLeadAction(locale: string, leadId: string): Promise<void> {
  const prefix = locale === "en" ? "" : `/${locale}`;
  const user = await requireRole("AGENT", locale, `${prefix}/agent/pool`);

  // If another agent claimed it between page render and this submit, `claimed`
  // comes back false -- stay on the pool instead of opening a lead detail page
  // this agent doesn't actually own (getAgentLead scopes strictly by agentId).
  const claimed = await claimLead(user.id, leadId);

  revalidatePath(`${prefix}/agent/pool`);
  revalidatePath(`${prefix}/agent/dashboard`);

  if (claimed) {
    redirect(`${prefix}/agent/lead/${leadId}`);
  }
}
