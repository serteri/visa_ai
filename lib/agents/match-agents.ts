import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { agents } from "@/db/schema";

export type MatchAgentsInput = {
  visaInterest: string;
  preferredLanguage: string;
  countryOfPassport?: string;
  currentCountry?: string;
};

export type MatchedAgent = {
  agentId: string;
  fullName: string;
  businessName: string | null;
  email: string;
  phone: string | null;
  marn: string | null;
  score: number;
  matchReasons: string[];
};

const SPECIALTY_SCORE = 50;
const LANGUAGE_SCORE = 30;
const LOCATION_SCORE = 10;

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

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function toStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function hasTextMatch(candidates: string[], targetValues: string[]): boolean {
  if (candidates.length === 0 || targetValues.length === 0) return false;

  return candidates.some((candidate) =>
    targetValues.some(
      (target) =>
        candidate === target ||
        candidate.includes(target) ||
        target.includes(candidate)
    )
  );
}

function specialtyTokensFromVisaInterest(visaInterest: string): string[] {
  const value = normalize(visaInterest);
  const tokens = new Set<string>([value]);

  if (value.includes("189") || value.includes("190") || value.includes("skilled")) {
    tokens.add("skilled migration");
  }

  if (value.includes("500") || value.includes("student")) {
    tokens.add("student visa");
  }

  if (value.includes("482") || value.includes("employer") || value.includes("sponsor")) {
    tokens.add("employer sponsored");
  }

  if (value.includes("partner")) {
    tokens.add("partner visa");
  }

  if (value.includes("visitor") || value.includes("600")) {
    tokens.add("visitor visa");
  }

  if (value.includes("refusal") || value.includes("review") || value.includes("appeal")) {
    tokens.add("refusal / review");
  }

  return Array.from(tokens);
}

export async function matchAgents(input: MatchAgentsInput): Promise<MatchedAgent[]> {
  await ensureAgentsTable();

  const activeAgents = await db
    .select({
      id: agents.id,
      full_name: agents.full_name,
      business_name: agents.business_name,
      email: agents.email,
      phone: agents.phone,
      marn: agents.marn,
      languages: agents.languages,
      specialties: agents.specialties,
      locations: agents.locations,
      active: agents.active,
    })
    .from(agents)
    .where(eq(agents.active, true));

  const specialtyTargets = specialtyTokensFromVisaInterest(input.visaInterest);
  const languageTargets = input.preferredLanguage ? [normalize(input.preferredLanguage)] : [];
  const locationTargets = [input.currentCountry ?? "", input.countryOfPassport ?? ""]
    .map(normalize)
    .filter((value) => value.length > 0);

  const matches = activeAgents
    .map((agent) => {
      const matchReasons: string[] = [];
      let score = 0;

      const agentSpecialties = toStringList(agent.specialties).map(normalize);
      if (hasTextMatch(agentSpecialties, specialtyTargets)) {
        score += SPECIALTY_SCORE;
        matchReasons.push("Specialty match");
      }

      const agentLanguages = toStringList(agent.languages).map(normalize);
      if (hasTextMatch(agentLanguages, languageTargets)) {
        score += LANGUAGE_SCORE;
        matchReasons.push("Language match");
      }

      const agentLocations = toStringList(agent.locations).map(normalize);
      if (hasTextMatch(agentLocations, locationTargets)) {
        score += LOCATION_SCORE;
        matchReasons.push("Location/country match");
      }

      return {
        agentId: agent.id,
        fullName: agent.full_name,
        businessName: agent.business_name,
        email: agent.email,
        phone: agent.phone,
        marn: agent.marn,
        score,
        matchReasons,
      } satisfies MatchedAgent;
    })
    .filter((agent) => agent.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.fullName.localeCompare(b.fullName);
    });

  return matches;
}
