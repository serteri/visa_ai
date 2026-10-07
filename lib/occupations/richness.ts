/**
 * How much unique, sourced data an occupation page can show. One definition, used by the SEO audit script, the
 * sitemap and the page's robots meta (thin pages are noindex until they carry unique data).
 *
 * A signal is "present" only when the repository really holds that fact for the occupation -- nothing is inferred.
 *   authority   a registry authority is listed for the ANZSCO code (not the general-profession fallback)
 *   fee         that authority has at least one non-estimated fee with a figure
 *   nationalList the occupation sits on at least one national list in occupations.json (visa_lists)
 *   stateList   the occupation is on a published state/territory list for 190 or 491 (ACT, NT, QLD, WA; NSW unit group)
 *   invitation  an invitation-points / benchmark row exists for the code (visa-trends.json) or for its title
 */
import cutoffRows from "@/src/data/occupation-points-cutoff.json";
import trendRows from "@/src/data/visa-trends.json";
import { resolveAssessingAuthority } from "@/lib/skills-assessment/resolve-authority";
import { matchOccupationToState, type StateOccupationSubclass } from "@/lib/state-nomination/occupation-match";
import type { OccupationRecord } from "./seo";

export type RichnessTier = "rich" | "medium" | "thin";

export type OccupationRichness = {
  authority: boolean;
  fee: boolean;
  nationalList: boolean;
  /** States/territories whose published list carries the occupation for 190 and/or 491. */
  statesWithList: string[];
  invitation: boolean;
  /** Dates (ISO) of the sources behind the signals that are present: authority lastVerified, state list provenance. */
  verifiedDates: string[];
  score: number;
  tier: RichnessTier;
};

const TRENDS = new Set((trendRows as { occupation_trends: Array<{ anzsco_code: string }> }).occupation_trends.map((t) => t.anzsco_code));
const CUTOFF_TITLES = new Set((cutoffRows as Array<{ occupation: string }>).map((r) => r.occupation.trim().toLowerCase()));

/** Last-verified date of each state list's provenance entry (src/data/occupation-list-provenance.json). */
const STATE_LIST_VERIFIED: Record<string, string> = { ACT: "2026-09-22", NT: "2026-09-22", QLD: "2026-09-22", WA: "2026-09-28", NSW: "2026-09-22" };
const STATES = ["ACT", "NSW", "NT", "QLD", "WA"] as const;
const SUBCLASSES: StateOccupationSubclass[] = ["190", "491"];

export type StateListRow = { state: string; level: "occupation" | "unit-group"; subclasses: StateOccupationSubclass[]; checked: string };

/** Published state/territory list entries for the occupation (ACT, NSW unit group, NT, QLD, WA) -- only where it is listed. */
export function stateListRows(record: OccupationRecord): StateListRow[] {
  const rows: StateListRow[] = [];
  for (const state of STATES) {
    const subclasses = SUBCLASSES.filter((subclass) => {
      const r = matchOccupationToState(record.anzsco_code, state, subclass);
      return r.type === "MATCH" || (r.type === "UNIT_GROUP_ONLY" && r.onUnitGroupList);
    });
    if (subclasses.length) rows.push({ state, level: state === "NSW" ? "unit-group" : "occupation", subclasses, checked: STATE_LIST_VERIFIED[state] });
  }
  return rows;
}

export function tierOf(score: number): RichnessTier {
  return score >= 4 ? "rich" : score >= 2 ? "medium" : "thin";
}

export function occupationRichness(record: OccupationRecord): OccupationRichness {
  const resolved = resolveAssessingAuthority(record.anzsco_code);
  const authority = resolved.source === "registry-code";
  const feeRows = [...(resolved.authority?.fees ?? []), ...(resolved.authority?.pathways ?? []).flatMap((p) => p.fees ?? [])];
  const fee = authority && feeRows.some((f) => (f.amountAUD ?? f.amountCAD) != null && !f.estimated);
  const nationalList = (record.visa_lists ?? []).length > 0;

  const statesWithList = stateListRows(record).map((r) => r.state);

  const invitation = TRENDS.has(record.anzsco_code) || CUTOFF_TITLES.has(record.occupation_name.trim().toLowerCase());
  const verifiedDates = [
    ...(authority && resolved.authority?.lastVerified ? [resolved.authority.lastVerified] : []),
    ...statesWithList.map((s) => STATE_LIST_VERIFIED[s]),
  ].filter(Boolean);

  const score = [authority, fee, nationalList, statesWithList.length > 0, invitation].filter(Boolean).length;
  return { authority, fee, nationalList, statesWithList, invitation, verifiedDates, score, tier: tierOf(score) };
}

/** The most recent source date behind an occupation page, when any signal carries one (ISO yyyy-mm-dd). */
export function latestVerifiedDate(r: OccupationRichness): string | undefined {
  return r.verifiedDates.slice().sort().at(-1);
}
