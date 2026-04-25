"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";

import { db } from "@/db";
import { agentReferrals, agents } from "@/db/schema";

const STATUS_VALUES = ["new", "contacted", "referred", "closed"] as const;

type ReferralStatus = (typeof STATUS_VALUES)[number];

function isReferralStatus(value: string): value is ReferralStatus {
  return STATUS_VALUES.includes(value as ReferralStatus);
}

async function sendAssignedReferralEmail(payload: {
  agentEmail: string;
  leadFullName: string;
  leadEmail: string;
  leadPhone: string;
  countryOfPassport: string;
  currentCountry: string;
  preferredLanguage: string;
  visaInterest: string;
  shortMessage: string;
  assignedDate: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error("Assigned referral email skipped: RESEND_API_KEY is missing.");
    return;
  }

  const resend = new Resend(apiKey);
  const fromEmail = process.env.FROM_EMAIL || "Visa AI <onboarding@resend.dev>";

  const lines = [
    "A new visa referral lead has been assigned to you.",
    "",
    `lead full name: ${payload.leadFullName}`,
    `lead email: ${payload.leadEmail}`,
    `lead phone: ${payload.leadPhone || "-"}`,
    `country of passport: ${payload.countryOfPassport}`,
    `current country: ${payload.currentCountry}`,
    `preferred language: ${payload.preferredLanguage}`,
    `visa interest: ${payload.visaInterest}`,
    `short message: ${payload.shortMessage}`,
    `assigned date: ${payload.assignedDate}`,
    "",
    "This referral is for follow-up by a registered migration professional. The platform has not provided migration advice.",
  ];

  await resend.emails.send({
    from: fromEmail,
    to: [payload.agentEmail],
    subject: "New visa referral assigned to you",
    text: lines.join("\n"),
  });
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
    .select({ id: agents.id, active: agents.active, email: agents.email })
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);

  if (!agent || !agent.active) {
    return;
  }

  const [referralForEmail] = await db
    .select({
      full_name: agentReferrals.full_name,
      email: agentReferrals.email,
      phone: agentReferrals.phone,
      country_of_passport: agentReferrals.country_of_passport,
      current_country: agentReferrals.current_country,
      preferred_language: agentReferrals.preferred_language,
      visa_interest: agentReferrals.visa_interest,
      short_message: agentReferrals.short_message,
    })
    .from(agentReferrals)
    .where(eq(agentReferrals.id, referralId))
    .limit(1);

  if (!referralForEmail) {
    return;
  }

  const assignedAt = new Date();

  await db
    .update(agentReferrals)
    .set({
      assigned_agent_id: agentId,
      assigned_at: assignedAt,
      status: "referred",
    })
    .where(eq(agentReferrals.id, referralId));

  try {
    await sendAssignedReferralEmail({
      agentEmail: agent.email,
      leadFullName: referralForEmail.full_name,
      leadEmail: referralForEmail.email,
      leadPhone: referralForEmail.phone ?? "",
      countryOfPassport: referralForEmail.country_of_passport,
      currentCountry: referralForEmail.current_country,
      preferredLanguage: referralForEmail.preferred_language,
      visaInterest: referralForEmail.visa_interest,
      shortMessage: referralForEmail.short_message,
      assignedDate: assignedAt.toISOString(),
    });
  } catch (error) {
    console.error("Failed to send assigned referral email", error);
  }

  revalidatePath(`/${locale}/admin/referrals`);
}
