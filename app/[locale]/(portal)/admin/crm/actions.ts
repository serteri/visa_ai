"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function assignLeadToAgent(leadId: string, agentId: string) {
  if (!leadId || !agentId) {
    throw new Error("Missing leadId or agentId");
  }
  
  await prisma.userReport.update({
    where: { id: leadId },
    data: { agentId },
  });
  
  revalidatePath("/", "layout");
}
