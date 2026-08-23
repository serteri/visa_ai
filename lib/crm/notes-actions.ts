"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/rbac";
import { createLeadNote, type LeadNoteWithAuthor } from "@/lib/crm/notes";

export type AddLeadNoteResult = { error?: string; note?: LeadNoteWithAuthor };

/**
 * Shared by both the agent and admin lead-detail pages -- a Server Action is
 * a public HTTP endpoint by default, so the role/ownership check happens
 * here, not just in whichever page renders the trigger. ADMIN may note any
 * lead; AGENT only a lead currently assigned to them (agentId === user.id),
 * re-checked against the DB on every call rather than trusted from the page.
 */
export async function addLeadNoteAction(leadId: string, content: string): Promise<AddLeadNoteResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  const trimmed = content.trim();
  if (!trimmed) return { error: "Note can't be empty." };

  if (user.role === "AGENT") {
    const lead = await prisma.userReport.findUnique({ where: { id: leadId }, select: { agentId: true } });
    if (!lead || lead.agentId !== user.id) {
      return { error: "This lead is not assigned to you." };
    }
  } else if (user.role !== "ADMIN") {
    return { error: "Forbidden" };
  }

  const note = await createLeadNote(leadId, user.id, trimmed);

  // Locale-agnostic layout revalidate -- both /agent/lead/[id] and
  // /admin/crm/lead/[id] read this same lead's notes.
  revalidatePath("/", "layout");

  return { note };
}
