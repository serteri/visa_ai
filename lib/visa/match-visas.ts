import { eq } from "drizzle-orm";

import { db } from "@/db";
import { sourceSnapshots, visaTypes } from "@/db/schema";
import type { MatchedVisa, MatchInput } from "@/lib/visa/types";

export type { MatchedVisa, MatchInput } from "@/lib/visa/types";

function normaliseGoal(goal: string): string {
  return goal.toLowerCase();
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

  // Permanent migration → placeholder 189 / 190
  if (normalised.includes("migrate") || normalised.includes("permanent")) {
    results.push({
      subclass: "189 / 190",
      visa_name: "Skilled Independent / Nominated visa",
      purpose: "Points-tested permanent residence in Australia",
      match_reason:
        "You indicated a goal of permanent migration to Australia. Points-tested skilled visas (subclass 189 and 190) are common pathways, subject to a skills assessment and receiving an invitation. Full data for these visas is not yet available in this tool.",
      confidence: "low",
      source_url:
        "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-independent-189",
      pdf_snapshot_url: null,
      is_database_record: false,
    });
  }

  return results;
}
