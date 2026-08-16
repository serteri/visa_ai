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

export interface StateOccupationMatch {
  /** True if this occupation appears on this state's list at all (any subclass). */
  onList: boolean;
  /** Which subclasses ("190"/"491") this occupation is on the list for. */
  subclasses: string[];
}

/**
 * Real occupation-list membership per state, from StateOccupationListEntry
 * (synced by scripts/sync-state-occupation-lists.ts). Keyed by state code,
 * shaped to drop into ReadinessInput.stateOccupationMatches so
 * calculateStateNominationTracker (lib/readiness/state-nomination.ts) can
 * apply real "is this occupation on the list" penalties instead of a
 * hardcoded occupation-priority-keyword heuristic.
 *
 * Only includes an entry for a state code if that state actually HAS list
 * data loaded (queried separately via a DISTINCT stateCode scan) -- a state
 * with zero rows (e.g. Victoria/SA, whose spreadsheets haven't been synced
 * yet) must never be silently treated as "occupation not on list", since
 * that's indistinguishable from "we have no data for this state" and would
 * incorrectly zero out its match score. Absence of a key in the returned
 * map means "no data for this state", not "not on the list".
 *
 * Matches by ANZSCO code when the occupation string contains one (the
 * canonical form used throughout this app, e.g. "Software Engineer
 * (261313)"); falls back to a case-insensitive title substring match
 * otherwise. Never throws -- degrades to no matches (every listed state
 * treated as "no data") on a DB hiccup, same as getStateIntelligenceMap.
 */
export async function getStateOccupationMatches(
  occupation: string | undefined,
): Promise<Record<string, StateOccupationMatch>> {
  try {
    const statesWithData = await prisma.stateOccupationListEntry.findMany({
      distinct: ["stateCode"],
      select: { stateCode: true },
    });
    if (statesWithData.length === 0) return {};

    const trimmed = (occupation ?? "").trim();
    const anzscoCode = trimmed.match(/\d{6}/)?.[0];
    const titleQuery = trimmed.replace(/[()]/g, "").replace(/\d{6}/g, "").trim();

    const matchingRows = trimmed
      ? await prisma.stateOccupationListEntry.findMany({
          where: anzscoCode
            ? { anzscoCode }
            : titleQuery
              ? { occupationTitle: { contains: titleQuery, mode: "insensitive" } }
              : { id: "__no_match__" }, // empty occupation after stripping -- match nothing
        })
      : [];

    const subclassesByState = new Map<string, Set<string>>();
    for (const row of matchingRows) {
      const set = subclassesByState.get(row.stateCode) ?? new Set<string>();
      row.visaSubclasses.forEach((s) => set.add(s));
      subclassesByState.set(row.stateCode, set);
    }

    const result: Record<string, StateOccupationMatch> = {};
    for (const { stateCode } of statesWithData) {
      const subclasses = Array.from(subclassesByState.get(stateCode) ?? []);
      result[stateCode] = { onList: subclasses.length > 0, subclasses };
    }
    return result;
  } catch (err) {
    console.error("[state-intelligence] failed to load StateOccupationListEntry matches:", err);
    return {};
  }
}
