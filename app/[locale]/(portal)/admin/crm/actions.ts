"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { sendAgentAssignedEmail } from "@/lib/email/agent-notifications";

export async function assignLeadToAgent(leadId: string, agentId: string) {
  if (!leadId || !agentId) {
    throw new Error("Missing leadId or agentId");
  }

  const [lead, agent] = await Promise.all([
    prisma.userReport.update({
      where: { id: leadId },
      data: { agentId },
      select: { fullName: true, email: true, docStatus: true },
    }),
    prisma.user.findUnique({ where: { id: agentId }, select: { email: true, name: true } }),
  ]);

  revalidatePath("/", "layout");

  // Notification is best-effort -- the assignment itself already succeeded
  // above, so a broken RESEND_API_KEY or a send failure must never surface
  // as an error for this action.
  if (agent) {
    try {
      await sendAgentAssignedEmail({
        agentEmail: agent.email,
        agentName: agent.name,
        leadName: lead.fullName || lead.email,
        status: lead.docStatus ?? "New",
      });
    } catch (error) {
      console.error("[assignLeadToAgent] Notification email failed (non-blocking):", error);
    }
  }
}
