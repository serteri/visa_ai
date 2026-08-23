import { prisma } from "@/lib/prisma";

export type LeadNoteWithAuthor = {
  id: string;
  content: string;
  createdAt: Date;
  author: { id: string; name: string | null; email: string; role: string };
};

/** All notes on a lead, newest first, with the author's name/role for display. */
export async function getLeadNotes(leadId: string): Promise<LeadNoteWithAuthor[]> {
  return prisma.leadNote.findMany({
    where: { leadId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      content: true,
      createdAt: true,
      author: { select: { id: true, name: true, email: true, role: true } },
    },
  });
}

export async function createLeadNote(leadId: string, authorId: string, content: string): Promise<LeadNoteWithAuthor> {
  return prisma.leadNote.create({
    data: { leadId, authorId, content },
    select: {
      id: true,
      content: true,
      createdAt: true,
      author: { select: { id: true, name: true, email: true, role: true } },
    },
  });
}
