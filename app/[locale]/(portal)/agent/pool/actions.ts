"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isApprovedAgent, requireRole } from "@/lib/auth/rbac";
import { claimLead, getAgentLead } from "@/lib/crm/leads";
import { sendAgentAssignedEmail } from "@/lib/email/agent-notifications";

export async function claimLeadAction(locale: string, leadId: string): Promise<void> {
  const prefix = locale === "en" ? "" : `/${locale}`;
  const user = await requireRole("AGENT", locale, `${prefix}/agent/pool`);

  // Defense in depth: the pool page never renders a Claim button for a
  // pending agent, but this action must reject it directly too, not just
  // rely on the UI never offering it.
  if (!isApprovedAgent(user)) return;

  // If another agent claimed it between page render and this submit, `claimed`
  // comes back false -- stay on the pool instead of opening a lead detail page
  // this agent doesn't actually own (getAgentLead scopes strictly by agentId).
  const claimed = await claimLead(user.id, leadId);

  revalidatePath(`${prefix}/agent/pool`);
  revalidatePath(`${prefix}/agent/dashboard`);

  if (claimed) {
    // Best-effort notification -- the claim itself already succeeded above,
    // so a broken RESEND_API_KEY or a send failure must never block the
    // redirect into the lead the agent just claimed.
    try {
      const lead = await getAgentLead(user.id, leadId);
      if (lead && user.email) {
        await sendAgentAssignedEmail({
          agentEmail: user.email,
          agentName: user.name,
          leadName: lead.fullName || lead.email,
          status: lead.docStatus ?? "New",
          leadId,
          locale,
        });
      }
    } catch (error) {
      console.error("[claimLeadAction] Notification email failed (non-blocking):", error);
    }
    redirect(`${prefix}/agent/lead/${leadId}`);
  }
}
