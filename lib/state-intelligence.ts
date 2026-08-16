import { prisma } from "@/lib/prisma";

export interface StateIntelligenceEntry {
  status: string;
  officialNote?: string;
  sourceUrl?: string;
  lastVerifiedAt?: string;
}

/**
 * Reads all StateIntelligence rows and returns them keyed by state code,
 * shaped to drop straight into ReadinessInput.stateIntelligence (see
 * lib/readiness/types.ts) so callers of runReadinessEngine() can fetch this
 * once (it's a DB read, so it has to happen before the synchronous engine
 * runs, not inside it) and pass it straight through.
 *
 * Never throws -- a DB hiccup here should degrade to "no live overrides"
 * (calculateStateNominationTracker falls back to the static
 * src/data/state-nomination-status.json row), not fail report generation.
 */
export async function getStateIntelligenceMap(): Promise<Record<string, StateIntelligenceEntry>> {
  try {
    const rows = await prisma.stateIntelligence.findMany();
    const map: Record<string, StateIntelligenceEntry> = {};
    for (const row of rows) {
      map[row.stateCode] = {
        status: row.status,
        officialNote: row.officialNote ?? undefined,
        sourceUrl: row.sourceUrl ?? undefined,
        lastVerifiedAt: row.lastVerifiedAt ? row.lastVerifiedAt.toISOString() : undefined,
      };
    }
    return map;
  } catch (err) {
    console.error("[state-intelligence] failed to load StateIntelligence rows:", err);
    return {};
  }
}
