"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/rbac";
import { claimLead } from "@/lib/crm/leads";

export async function claimLeadAction(locale: string, leadId: string): Promise<void> {
  const prefix = locale === "en" ? "" : `/${locale}`;
  const user = await requireRole("AGENT", locale, `${prefix}/agent/pool`);

  // Best-effort: a lead already claimed by another agent between page render
  // and this submit just silently no-ops -- the revalidate below removes it
  // from the pool view either way, which is feedback enough for this action.
  await claimLead(user.id, leadId);

  revalidatePath(`${prefix}/agent/pool`);
  revalidatePath(`${prefix}/agent/dashboard`);
}
