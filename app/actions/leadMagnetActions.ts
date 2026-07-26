"use server";

import { and, eq, gt, sql } from "drizzle-orm";

import { db } from "@/db";
import { campaigns } from "@/db/schema";

export type ClaimSlotResult =
  | { success: true; slotsRemaining: number }
  | { success: false; redirectToPaywall: true };

/**
 * Atomically claims one slot for a campaign. This is a single UPDATE ...
 * WHERE slots_remaining > 0 ... RETURNING statement -- never a separate
 * SELECT followed by an UPDATE. Postgres evaluates the WHERE clause and
 * applies the decrement in one atomic operation per row, so two concurrent
 * requests racing for the last slot cannot both succeed: only one UPDATE
 * can match `slots_remaining > 0` for the last remaining slot, and
 * .returning() reports back whether THIS call was the one that matched.
 */
export async function claimLeadMagnetSlot(campaignName: string): Promise<ClaimSlotResult> {
  const result = await db
    .update(campaigns)
    .set({
      slots_remaining: sql`${campaigns.slots_remaining} - 1`,
    })
    .where(and(eq(campaigns.name, campaignName), gt(campaigns.slots_remaining, 0)))
    .returning({ slots_remaining: campaigns.slots_remaining });

  if (result.length === 0) {
    // Either the campaign doesn't exist, or slots_remaining was already 0 --
    // in both cases there is no free slot to hand out.
    return { success: false, redirectToPaywall: true };
  }

  return { success: true, slotsRemaining: result[0].slots_remaining };
}

/**
 * Read-only lookup for the initial UI render. Never mutates slots_remaining
 * -- claimLeadMagnetSlot is the only function allowed to do that.
 */
export async function getRemainingSlots(campaignName: string): Promise<number> {
  const rows = await db
    .select({ slots_remaining: campaigns.slots_remaining })
    .from(campaigns)
    .where(eq(campaigns.name, campaignName))
    .limit(1);

  return rows[0]?.slots_remaining ?? 0;
}
