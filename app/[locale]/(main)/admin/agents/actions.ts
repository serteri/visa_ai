"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { agents } from "@/db/schema";

function parseCsvList(input: string): string[] {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

async function ensureAgentsTable() {
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
}

export async function createAgent(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const businessName = String(formData.get("businessName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const marn = String(formData.get("marn") ?? "").trim();
  const languagesInput = String(formData.get("languages") ?? "").trim();
  const specialtiesInput = String(formData.get("specialties") ?? "").trim();
  const locationsInput = String(formData.get("locations") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!fullName || !email) {
    return;
  }

  await ensureAgentsTable();

  await db.insert(agents).values({
    full_name: fullName,
    business_name: businessName || null,
    email,
    phone: phone || null,
    marn: marn || null,
    languages: parseCsvList(languagesInput),
    specialties: parseCsvList(specialtiesInput),
    locations: parseCsvList(locationsInput),
    active: true,
    notes: notes || null,
    updated_at: new Date(),
  });

  revalidatePath(`/${locale}/admin/agents`);
}

export async function toggleAgentActive(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en").trim();
  const agentId = String(formData.get("agentId") ?? "").trim();
  const currentActive = String(formData.get("currentActive") ?? "true").trim() === "true";

  if (!agentId) {
    return;
  }

  await ensureAgentsTable();

  await db
    .update(agents)
    .set({
      active: !currentActive,
      updated_at: new Date(),
    })
    .where(eq(agents.id, agentId));

  revalidatePath(`/${locale}/admin/agents`);
}
