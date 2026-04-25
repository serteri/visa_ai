"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { agentReferrals } from "@/db/schema";

const STATUS_VALUES = ["new", "contacted", "referred", "closed"] as const;

type ReferralStatus = (typeof STATUS_VALUES)[number];

function isReferralStatus(value: string): value is ReferralStatus {
  return STATUS_VALUES.includes(value as ReferralStatus);
}

async function ensureAgentReferralsTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS agent_referrals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      country_of_passport TEXT NOT NULL,
      current_country TEXT NOT NULL,
      preferred_language TEXT NOT NULL,
      visa_interest TEXT NOT NULL,
      short_message TEXT NOT NULL,
      consent BOOLEAN NOT NULL,
      status TEXT DEFAULT 'new',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

export async function updateReferralStatus(formData: FormData): Promise<void> {
  const referralId = String(formData.get("referralId") ?? "").trim();
  const locale = String(formData.get("locale") ?? "en").trim();
  const nextStatus = String(formData.get("status") ?? "").trim();

  if (!referralId || !isReferralStatus(nextStatus)) {
    return;
  }

  await ensureAgentReferralsTable();

  await db
    .update(agentReferrals)
    .set({ status: nextStatus })
    .where(eq(agentReferrals.id, referralId));

  revalidatePath(`/${locale}/admin/referrals`);
}
