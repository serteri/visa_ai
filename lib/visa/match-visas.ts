import { eq } from "drizzle-orm";

import { db } from "@/db";
import { sourceSnapshots, visaTypes } from "@/db/schema";
import type { MatchedVisa, MatchInput } from "@/lib/visa/types";

export type { MatchedVisa, MatchInput } from "@/lib/visa/types";

function normaliseGoal(goal: string): string {
  return goal.toLowerCase();
}

function hasWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

export async function matchVisas(input: MatchInput): Promise<MatchedVisa[]> {
  const { goal, hasSponsor } = input;
  const normalised = normaliseGoal(goal);
  const results: MatchedVisa[] = [];

  // Study → subclass 500 (live from DB)
  if (normalised.includes("study")) {
    const [row] = await db
      .select({
        subclass: visaTypes.subclass,
        visa_name: visaTypes.visa_name,
        purpose: visaTypes.purpose,
        source_url: visaTypes.source_url,
        pdf_snapshot_url: sourceSnapshots.pdf_snapshot_url,
      })
      .from(visaTypes)
      .leftJoin(sourceSnapshots, eq(sourceSnapshots.visa_type_id, visaTypes.id))
      .where(eq(visaTypes.subclass, "500"))
      .limit(1);

    if (row) {
      results.push({
        subclass: row.subclass,
        visa_name: row.visa_name,
        purpose: row.purpose,
        match_reason:
          "Your goal is to study in Australia. The Student visa (subclass 500) is the standard pathway for international students enrolled in a registered Australian course.",
        confidence: "high",
        source_url: row.source_url,
        pdf_snapshot_url: row.pdf_snapshot_url ?? null,
        is_database_record: true,
      });
    }
  }

  // Work + employer sponsor → subclass 482 (live from DB)
  if (normalised.includes("work") && hasSponsor) {
    const [row482] = await db
      .select({
        subclass: visaTypes.subclass,
        visa_name: visaTypes.visa_name,
        purpose: visaTypes.purpose,
        source_url: visaTypes.source_url,
        pdf_snapshot_url: sourceSnapshots.pdf_snapshot_url,
      })
      .from(visaTypes)
      .leftJoin(sourceSnapshots, eq(sourceSnapshots.visa_type_id, visaTypes.id))
      .where(eq(visaTypes.subclass, "482"))
      .limit(1);

    if (row482) {
      results.push({
        subclass: row482.subclass,
        visa_name: row482.visa_name,
        purpose: row482.purpose,
        match_reason:
          "You selected work in Australia and indicated you have an employer sponsor. This employer-sponsored pathway may be relevant to review.",
        confidence: "medium",
        source_url: row482.source_url,
        pdf_snapshot_url: row482.pdf_snapshot_url ?? null,
        is_database_record: true,
      });
    } else {
      // Fallback if not yet seeded
      results.push({
        subclass: "482",
        visa_name: "Skills in Demand visa",
        purpose: "Temporary employer-sponsored work in Australia",
        match_reason:
          "You selected work in Australia and indicated you have an employer sponsor. This employer-sponsored pathway may be relevant to review.",
        confidence: "medium",
        source_url:
          "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skills-in-demand-482/core-skills-stream",
        pdf_snapshot_url: null,
        is_database_record: false,
      });
    }
  }

  // Skilled/PR/regional migration → subclasses 189, 190, and 491
  const wantsSkilledMigration =
    hasWord(normalised, "regional") ||
    normalised.includes("skilled migration") ||
    hasWord(normalised, "pr") ||
    hasWord(normalised, "permanent") ||
    hasWord(normalised, "migrate");

  if (wantsSkilledMigration) {
    const [row189] = await db
      .select({
        subclass: visaTypes.subclass,
        visa_name: visaTypes.visa_name,
        purpose: visaTypes.purpose,
        source_url: visaTypes.source_url,
        pdf_snapshot_url: sourceSnapshots.pdf_snapshot_url,
      })
      .from(visaTypes)
      .leftJoin(sourceSnapshots, eq(sourceSnapshots.visa_type_id, visaTypes.id))
      .where(eq(visaTypes.subclass, "189"))
      .limit(1);

    const [row190] = await db
      .select({
        subclass: visaTypes.subclass,
        visa_name: visaTypes.visa_name,
        purpose: visaTypes.purpose,
        source_url: visaTypes.source_url,
        pdf_snapshot_url: sourceSnapshots.pdf_snapshot_url,
      })
      .from(visaTypes)
      .leftJoin(sourceSnapshots, eq(sourceSnapshots.visa_type_id, visaTypes.id))
      .where(eq(visaTypes.subclass, "190"))
      .limit(1);

    const [row491] = await db
      .select({
        subclass: visaTypes.subclass,
        visa_name: visaTypes.visa_name,
        purpose: visaTypes.purpose,
        source_url: visaTypes.source_url,
        pdf_snapshot_url: sourceSnapshots.pdf_snapshot_url,
      })
      .from(visaTypes)
      .leftJoin(sourceSnapshots, eq(sourceSnapshots.visa_type_id, visaTypes.id))
      .where(eq(visaTypes.subclass, "491"))
      .limit(1);

    if (row189) {
      results.push({
        subclass: row189.subclass,
        visa_name: row189.visa_name,
        purpose: row189.purpose,
        match_reason:
          "This independent points-tested skilled pathway may be relevant if you have an eligible occupation, suitable skills assessment, invitation and enough points.",
        confidence: "medium",
        source_url: row189.source_url,
        pdf_snapshot_url: row189.pdf_snapshot_url ?? null,
        is_database_record: true,
      });
    }

    if (row190) {
      results.push({
        subclass: row190.subclass,
        visa_name: row190.visa_name,
        purpose: row190.purpose,
        match_reason:
          "This state-nominated skilled pathway may be relevant if you have an eligible occupation, suitable skills assessment, enough points and state or territory nomination.",
        confidence: "medium",
        source_url: row190.source_url,
        pdf_snapshot_url: row190.pdf_snapshot_url ?? null,
        is_database_record: true,
      });
    }

    if (row491) {
      results.push({
        subclass: row491.subclass,
        visa_name: row491.visa_name,
        purpose: row491.purpose,
        match_reason:
          "You selected skilled or regional migration. This provisional regional skilled pathway may be relevant if you have an eligible occupation, nomination or eligible relative sponsorship, enough points and are willing to live, work and study in a designated regional area.",
        confidence: "medium",
        source_url: row491.source_url,
        pdf_snapshot_url: row491.pdf_snapshot_url ?? null,
        is_database_record: true,
      });
    }
  }

  // Partner/spouse relationship intent → subclass 820_801
  const wantsPartnerPathway =
    hasWord(normalised, "partner") ||
    hasWord(normalised, "spouse") ||
    hasWord(normalised, "marriage") ||
    hasWord(normalised, "married") ||
    hasWord(normalised, "boyfriend") ||
    hasWord(normalised, "girlfriend") ||
    normalised.includes("de facto") ||
    hasWord(normalised, "relationship") ||
    normalised.includes("sponsor my partner") ||
    normalised.includes("bring my partner");

  if (wantsPartnerPathway) {
    const [row820801] = await db
      .select({
        subclass: visaTypes.subclass,
        visa_name: visaTypes.visa_name,
        purpose: visaTypes.purpose,
        source_url: visaTypes.source_url,
        pdf_snapshot_url: sourceSnapshots.pdf_snapshot_url,
      })
      .from(visaTypes)
      .leftJoin(sourceSnapshots, eq(sourceSnapshots.visa_type_id, visaTypes.id))
      .where(eq(visaTypes.subclass, "820_801"))
      .limit(1);

    if (row820801) {
      results.push({
        subclass: row820801.subclass,
        visa_name: row820801.visa_name,
        purpose: row820801.purpose,
        match_reason:
          "You mentioned a partner, spouse or relationship. This onshore partner pathway may be relevant to explore if the partner is an Australian citizen, permanent resident or eligible New Zealand citizen and the application is made in Australia.",
        confidence: "high",
        source_url: row820801.source_url,
        pdf_snapshot_url: row820801.pdf_snapshot_url ?? null,
        is_database_record: true,
      });
    }
  }

  return results;
}
