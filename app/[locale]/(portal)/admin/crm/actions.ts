"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { sendAgentAssignedEmail } from "@/lib/email/agent-notifications";
import { getCurrentUser } from "@/lib/auth/rbac";

// Both actions below previously had no server-side role check of their own
// -- they relied entirely on the calling page being ADMIN-gated. Fixed here:
// each action now verifies the caller itself, since a Server Action is a
// public HTTP endpoint by default (callable directly, not just via the page
// that happens to render its trigger button).
async function requireAdmin(): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
}

export async function assignLeadToAgent(leadId: string, agentId: string) {
  await requireAdmin();
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

/** Approves a self-registered agent -- unlocks their referral link, metrics,
 *  and lead pool/dashboard content (see isApprovedAgent() gates on those pages). */
export async function approveAgentAction(agentId: string): Promise<void> {
  await requireAdmin();
  if (!agentId) throw new Error("Missing agentId");

  await prisma.user.updateMany({
    where: { id: agentId, role: "AGENT" },
    data: { approvalStatus: "APPROVED" },
  });

  revalidatePath("/", "layout");
}
