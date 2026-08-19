"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";

/**
 * Legacy-admin-scoped approve/reject actions, gated by the same cookie
 * session (lib/admin-auth.ts) as the rest of app/[locale]/(main)/admin/*.
 *
 * These duplicate the effect of approveAgentAction/rejectAgentAction in
 * app/[locale]/(portal)/admin/crm/actions.ts, but NOT their auth check --
 * those check getCurrentUser().role === "ADMIN" (a NextAuth session), which
 * an operator who only has the legacy password cookie doesn't have. Calling
 * the CRM actions directly from this page would throw "Forbidden" for that
 * operator even though they're a legitimate admin by this area's own rules.
 * Both ultimately touch the same User rows (role="AGENT"), so there's no
 * data-model duplication -- only the auth check differs to match whichever
 * admin surface the button lives on.
 */
export async function approveAgentLegacy(agentId: string): Promise<void> {
  if (!(await isAdminAuthenticated())) throw new Error("Unauthorized");
  if (!agentId) throw new Error("Missing agentId");

  await prisma.user.updateMany({
    where: { id: agentId, role: "AGENT" },
    data: { approvalStatus: "APPROVED" },
  });

  revalidatePath("/", "layout");
}

export async function rejectAgentLegacy(agentId: string): Promise<void> {
  if (!(await isAdminAuthenticated())) throw new Error("Unauthorized");
  if (!agentId) throw new Error("Missing agentId");

  await prisma.user.updateMany({
    where: { id: agentId, role: "AGENT" },
    data: { approvalStatus: "REJECTED" },
  });

  revalidatePath("/", "layout");
}
