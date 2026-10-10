"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AGENT_GUIDE_POOL_ENABLED, canAgentSeeClient, getApprovedAgent } from "@/lib/crm/agent-access";
import { PDF_LEAD_SOURCES } from "@/lib/crm/pdf-lead-sources";
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

export async function assignLeadToAgent(leadId: string, agentId: string, locale: string = "en") {
  await requireAdmin();
  if (!leadId || !agentId) {
    throw new Error("Missing leadId or agentId");
  }

  // Only an approved agent can be assigned a lead (checked against the database): a pending or rejected agent receives nothing.
  const agent = await getApprovedAgent(agentId);
  if (!agent) throw new Error("Agent not found or not approved");

  const lead = await prisma.userReport.update({
    where: { id: leadId },
    data: { agentId },
    select: { isUnlocked: true, paymentStatus: true, source: true },
  });

  revalidatePath("/", "layout");

  // Notification is best-effort, never carries client details, and is not sent for a full-check report that has not been paid for.
  const unpaidReport = lead.source === "full_check" && !(lead.isUnlocked && lead.paymentStatus === "paid");
  // No agent email for guide-download / lead-magnet leads while they are off for agents (AGENT_GUIDE_POOL_ENABLED).
  const guideLead = !AGENT_GUIDE_POOL_ENABLED && PDF_LEAD_SOURCES.includes(lead.source);
  // ...and none until the client has consented to share with this agent (the link would lead to a reference-only page).
  if (!unpaidReport && !guideLead && (await canAgentSeeClient(agentId, leadId))) {
    try {
      await sendAgentAssignedEmail({ agentEmail: agent.email, agentName: agent.name, leadId, locale });
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
