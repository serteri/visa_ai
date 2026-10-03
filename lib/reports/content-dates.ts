import feeProvenance from "@/src/data/fee-provenance.json";
import occupationListProvenance from "@/src/data/occupation-list-provenance.json";
import waList from "@/src/data/state-occupation-lists/wa.json";
import visaTrends from "@/src/data/visa-trends.json";
import type { ReadinessReport } from "@/lib/readiness/types";
import { STATE_RULES } from "@/lib/state-nomination/state-rules-config";

/**
 * The date of the most recent deploy that changed report content through code (engine logic or wording) rather
 * than a dated data source. Bump it in any commit that changes what a recomputed report shows; scripts/test-content-
 * dates.ts fails if it is in the future or older than the latest data-source date below.
 */
export const REPORT_CONTENT_DEPLOY_DATE = "2026-10-03";

type SourceDate = { source: string; date: string };

const day = (iso: string | undefined | null) => (iso ? String(iso).slice(0, 10) : undefined);

/** Occupation-list verification date per state (WA's own provenance; the manifest for the others). */
function occupationListDate(code: string): string | undefined {
  if (code === "WA") return day((waList as { _provenance: { last_verified?: string } })._provenance.last_verified);
  const fact = (occupationListProvenance as { facts: Array<{ id: string; lastVerified?: string | null }> }).facts.find(
    (f) => f.id === `state_occ_${code.toLowerCase()}` || (code === "NSW" && f.id === "state_occ_nsw_unit_groups")
  );
  return day(fact?.lastVerified ?? undefined);
}

const FEE_DATE = (feeProvenance as { facts: Array<{ last_verified?: string }> }).facts
  .map((f) => f.last_verified)
  .filter((d): d is string => Boolean(d))
  .sort()
  .at(-1);
const BENCHMARK_DATE = day((visaTrends as { generated_on?: string }).generated_on);

/** Report sections whose content comes from the invitation-benchmark snapshot. */
const BENCHMARK_SECTIONS = [
  "pathwayScores",
  "pathwayRanking",
  "rankedPathways",
  "pointsBoosterSimulator",
  "frictionAnalysis",
  "pathwayStrengthComparison",
  "pathwayFriction",
  "signalSnapshot",
];
const FEE_SECTIONS = ["financialRoadmap"];
const IGNORED = new Set(["aiStrategy", "contentStamp"]);

export type ContentDateContext = {
  /** When the stored report was generated (user_reports.created_at). */
  generatedAt?: string;
  stateNominationConfig?: Record<string, { updatedAt?: string }>;
  stateIntelligence?: Record<string, { lastVerifiedAt?: string }>;
};

/**
 * "Data as of" for a recomputed report: the most recent effective/verified date among the data sources whose changes
 * altered this report -- a source counts for a changed section only if it is dated after the report was generated
 * (state rules, admin settings, scraper, occupation lists for the states whose rows changed; the fee extractions;
 * the benchmark snapshot). A changed section with no such source changed through code: REPORT_CONTENT_DEPLOY_DATE.
 * Depends only on the two reports and dated sources, never on the view date, so it is stable across views.
 */
export function contentDataAsOf(stored: ReadinessReport, fresh: ReadinessReport, ctx: ContentDateContext): { date: string; sources: SourceDate[] } | null {
  const after = day(ctx.generatedAt) ?? "0000-00-00";
  const newer = (d: string | undefined): d is string => Boolean(d && d > after);
  const s = JSON.parse(JSON.stringify(stored)) as Record<string, unknown>;
  const f = JSON.parse(JSON.stringify(fresh)) as Record<string, unknown>;
  const keys = new Set([...Object.keys(s), ...Object.keys(f)].filter((k) => !IGNORED.has(k)));
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

  const sources: SourceDate[] = [];
  let codeChange = false;
  const attribute = (section: string, candidates: SourceDate[]) => {
    const dated = candidates.filter((c) => newer(c.date));
    if (dated.length > 0) sources.push(...dated.map((c) => ({ ...c, source: `${c.source} (${section})` })));
    else codeChange = true;
  };

  for (const key of keys) {
    if (key === "premiumSections") continue;
    if (same(s[key], f[key])) continue;
    if (key === "stateNominationTracker") {
      const byCode = (r: Record<string, unknown>) =>
        new Map(((r.stateNominationTracker as { states?: Array<{ code: string }> })?.states ?? []).map((st) => [st.code, st]));
      const a = byCode(s);
      const b = byCode(f);
      const changedStates = [...new Set([...a.keys(), ...b.keys()])].filter((code) => !same(a.get(code), b.get(code)));
      const candidates: SourceDate[] = changedStates.flatMap((code) =>
        [
          { source: `${code} state rules`, date: STATE_RULES[code]?.lastVerified },
          { source: `${code} admin settings`, date: day(ctx.stateNominationConfig?.[code]?.updatedAt) },
          { source: `${code} published status`, date: day(ctx.stateIntelligence?.[code]?.lastVerifiedAt) },
          { source: `${code} occupation list`, date: occupationListDate(code) },
        ].filter((c): c is SourceDate => Boolean(c.date))
      );
      if (changedStates.length === 0) codeChange = true;
      else attribute("state nomination", candidates);
    } else if (BENCHMARK_SECTIONS.includes(key)) {
      attribute(key, BENCHMARK_DATE ? [{ source: "invitation benchmarks", date: BENCHMARK_DATE }] : []);
    } else if (FEE_SECTIONS.includes(key)) {
      attribute(key, FEE_DATE ? [{ source: "fee extractions", date: FEE_DATE }] : []);
    } else {
      codeChange = true;
    }
  }
  // premiumSections: the historical trends come from the benchmark snapshot; everything else is code.
  const ps = (s.premiumSections ?? {}) as Record<string, unknown>;
  const pf = (f.premiumSections ?? {}) as Record<string, unknown>;
  for (const key of new Set([...Object.keys(ps), ...Object.keys(pf)])) {
    if (same(ps[key], pf[key])) continue;
    if (key === "historicalInvitationTrends") attribute(key, BENCHMARK_DATE ? [{ source: "invitation benchmarks", date: BENCHMARK_DATE }] : []);
    else if (key === "scenarioBasedInsights") continue; // copies of the top-level sections compared above
    else codeChange = true;
  }

  // A code change counts only when its deploy is dated after the report was generated: a report created on or after
  // every contributing source and deploy date keeps "Generated <creation date>".
  if (codeChange && newer(REPORT_CONTENT_DEPLOY_DATE)) sources.push({ source: "report update deploy", date: REPORT_CONTENT_DEPLOY_DATE });
  if (sources.length === 0) return null;
  const date = sources.map((x) => x.date).sort().at(-1)!;
  return { date, sources };
}
