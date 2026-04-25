"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { agentReferrals, agents } from "@/db/schema";

const STATUS_VALUES = ["new", "contacted", "referred", "closed"] as const;

type ReferralStatus = (typeof STATUS_VALUES)[number];

function isReferralStatus(value: string): value is ReferralStatus {
  return STATUS_VALUES.includes(value as ReferralStatus);
}

async function ensureAgentReferralsTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS agents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name TEXT NOT NULL,
      business_name TEXT,
      email TEXT NOT NULL,
      phone TEXT,
      marn TEXT,
      languages JSONB,
      specialties JSONB,
      locations JSONB,
      active BOOLEAN DEFAULT TRUE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

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
      assigned_agent_id UUID,
      assigned_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    ALTER TABLE agent_referrals
    ADD COLUMN IF NOT EXISTS assigned_agent_id UUID
  `);

  await db.execute(sql`
    ALTER TABLE agent_referrals
    ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'agent_referrals_assigned_agent_id_agents_id_fk'
      ) THEN
        ALTER TABLE agent_referrals
        ADD CONSTRAINT agent_referrals_assigned_agent_id_agents_id_fk
        FOREIGN KEY (assigned_agent_id) REFERENCES agents(id);
      END IF;
    END
    $$;
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

export async function assignReferralToAgent(formData: FormData): Promise<void> {
  const referralId = String(formData.get("referralId") ?? "").trim();
  const agentId = String(formData.get("agentId") ?? "").trim();
  const locale = String(formData.get("locale") ?? "en").trim();

  if (!referralId || !agentId) {
    return;
  }

  await ensureAgentReferralsTable();

  const [referral] = await db
    .select({ id: agentReferrals.id })
    .from(agentReferrals)
    .where(eq(agentReferrals.id, referralId))
    .limit(1);

  if (!referral) {
    return;
  }

  const [agent] = await db
    .select({ id: agents.id, active: agents.active })
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);

  if (!agent || !agent.active) {
    return;
  }

  await db
    .update(agentReferrals)
    .set({
      assigned_agent_id: agentId,
      assigned_at: new Date(),
      status: "referred",
    })
    .where(eq(agentReferrals.id, referralId));

  revalidatePath(`/${locale}/admin/referrals`);
}
