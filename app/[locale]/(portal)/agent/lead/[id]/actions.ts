"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/rbac";
import { DOC_STATUSES, updateLeadWorkflow } from "@/lib/crm/leads";

export type UpdateLeadWorkflowState = { error?: string; success?: boolean };

export async function updateLeadWorkflowAction(
  locale: string,
  leadId: string,
  _prev: UpdateLeadWorkflowState,
  formData: FormData
): Promise<UpdateLeadWorkflowState> {
  const prefix = locale === "en" ? "" : `/${locale}`;
  const user = await requireRole("AGENT", locale, `${prefix}/agent/lead/${leadId}`);

  const docStatus = String(formData.get("docStatus") ?? "");
  const agentNotes = String(formData.get("agentNotes") ?? "");

  if (!DOC_STATUSES.includes(docStatus as (typeof DOC_STATUSES)[number])) {
    return { error: "Invalid status." };
  }

  const updated = await updateLeadWorkflow(user.id, leadId, { docStatus, agentNotes });
  if (!updated) {
    return { error: "This lead is not assigned to you." };
  }

  revalidatePath(`${prefix}/agent/lead/${leadId}`);
  revalidatePath(`${prefix}/agent/dashboard`);
  return { success: true };
}
