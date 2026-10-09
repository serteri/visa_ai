"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/rbac";
import { getApprovedAgent } from "@/lib/crm/agent-access";
import { DOC_STATUSES, updateLeadStatus } from "@/lib/crm/leads";

export type ActionState = { error?: string; success?: boolean };

/** Called directly on the status Select's onChange -- no separate form/submit. */
export async function updateLeadStatusAction(
  locale: string,
  leadId: string,
  docStatus: string
): Promise<ActionState> {
  const prefix = locale === "en" ? "" : `/${locale}`;
  const user = await requireRole("AGENT", locale, `${prefix}/agent/lead/${leadId}`);
  if (!(await getApprovedAgent(user.id))) return { error: "Your account is pending approval." };

  if (!DOC_STATUSES.includes(docStatus as (typeof DOC_STATUSES)[number])) {
    return { error: "Invalid status." };
  }

  const updated = await updateLeadStatus(user.id, leadId, docStatus);
  if (!updated) {
    return { error: "This lead is not assigned to you." };
  }

  revalidatePath(`${prefix}/agent/lead/${leadId}`);
  revalidatePath(`${prefix}/agent/dashboard`);
  return { success: true };
}
