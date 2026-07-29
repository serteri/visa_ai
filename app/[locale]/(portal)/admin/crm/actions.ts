"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

/** Rejects a self-registered agent -- keeps their content locked behind
 *  PendingApprovalNotice (isApprovedAgent only passes on "APPROVED"). */
export async function rejectAgentAction(agentId: string): Promise<void> {
  await requireAdmin();
  if (!agentId) throw new Error("Missing agentId");

  await prisma.user.updateMany({
    where: { id: agentId, role: "AGENT" },
    data: { approvalStatus: "REJECTED" },
  });

  revalidatePath("/", "layout");
}

export type CreateAgentState = { error?: string };

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const createAgentSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  email: z.string().trim().toLowerCase().regex(EMAIL_REGEX, "Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  // Stored as a plain percentage number (e.g. 20 = 20%), matching
  // User.commissionRate's doc comment in prisma/schema.prisma. NOT yet read
  // by lib/stripe/commission.ts, which still applies a single hardcoded
  // 20% to every agent -- see that file's own note.
  commissionRate: z.coerce.number().min(0, "Commission rate cannot be negative.").max(100, "Commission rate cannot exceed 100%."),
});

/**
 * Admin-created agent account (distinct from the self-serve /agent/register
 * flow): approvalStatus is "APPROVED" immediately, since an admin creating
 * the account IS the approval -- unlike self-registration, which starts
 * "PENDING" until an admin reviews it separately.
 */
export async function createAgentAction(
  locale: string,
  _prev: CreateAgentState,
  formData: FormData
): Promise<CreateAgentState> {
  await requireAdmin();

  const parsed = createAgentSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
    commissionRate: formData.get("commissionRate"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please fix the highlighted fields." };
  }

  const { firstName, lastName, email, password, commissionRate } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      name: `${firstName} ${lastName}`,
      email,
      password: passwordHash,
      role: "AGENT",
      market: "GLOBAL",
      approvalStatus: "APPROVED",
      commissionRate,
    },
  });

  revalidatePath("/", "layout");
  // redirect() throws internally -- must not be wrapped in a try/catch that
  // could swallow it. Ends the action; the client never sees a returned
  // state on the success path.
  redirect(`/${locale}/admin/crm/dashboard`);
}
