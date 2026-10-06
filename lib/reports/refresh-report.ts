import { ensureCountrySpecificReportSchema } from "@/lib/readiness/country-scope";
import type { ReadinessInput, ReadinessReport } from "@/lib/readiness/types";
import { getStateIntelligenceMap, getStateNominationConfigMap } from "@/lib/state-intelligence";
import { runReadinessEngine } from "@/src/lib/readiness-engine";
import type { ReportContentStamp } from "./report-date-stamp";
import { contentDataAsOf } from "./content-dates";

export type RefreshedReport = {
  report: ReadinessReport;
  /** "recomputed": the current engine's deterministic sections; "stored": the report as saved at submission. */
  source: "recomputed" | "stored";
  reason?: string;
  /** Also set on report.contentStamp: "Last updated" only when recomputing changed the stored content. */
  stamp: ReportContentStamp;
};

/**
 * The PDF is generated on every download from the saved report. Its deterministic sections (points booster,
 * state tracker, alerts, wording) are recomputed here with the CURRENT engine from the saved inputs plus live state
 * data, so a report bought before a fix gets the fix -- the Points Booster Simulator that summed a 491 nomination into
 * a Subclass 189 benchmark scenario, for one. The stored AI strategy is kept (the PDF re-validates it against the
 * recomputed report).
 *
 * The stored report is used unchanged when recomputing would change the core verdict the customer already saw --
 * a different country, estimated points or set of evaluated subclasses (older rows did not save migrationGoals /
 * preferredState, which feed the subclass selection) -- or when recomputing fails. Nothing is written back.
 */
export async function refreshStoredReport(
  stored: ReadinessReport,
  input: ReadinessInput | null | undefined,
  meta: { generatedAt?: string } = {}
): Promise<RefreshedReport> {
  const storedStamp: ReportContentStamp = { recomputed: false, generatedAt: meta.generatedAt };
  const keep = (reason: string): RefreshedReport => ({
    report: { ...stored, contentStamp: storedStamp },
    source: "stored",
    reason,
    stamp: storedStamp,
  });
  if (!input || typeof input !== "object") return keep("no stored input");
  try {
    const country = stored.country === "CA" ? "CA" : "AU";
    const [stateIntelligence, stateNominationConfig] = await Promise.all([getStateIntelligenceMap(), getStateNominationConfigMap()]);
    const fresh = ensureCountrySpecificReportSchema(
      runReadinessEngine({ ...input, country, stateIntelligence, stateNominationConfig }),
      country
    );
    const mismatch = coreVerdictMismatch(stored, fresh);
    if (mismatch) return keep(mismatch);
    // "Updated to reflect data as of <date>" only when the recomputed content differs from what was stored; the date
    // is the latest dated source (or content deploy) behind the change -- never the view date (content-dates.ts).
    // Identical content keeps its original generation date.
    const asOf = contentDataAsOf(stored, fresh, { generatedAt: meta.generatedAt, stateNominationConfig, stateIntelligence });
    const stamp: ReportContentStamp = asOf
      ? { recomputed: true, generatedAt: meta.generatedAt, dataAsOf: asOf.date, dataSources: asOf.sources.map((x) => `${x.source}: ${x.date}`) }
      : storedStamp;
    return { report: { ...fresh, contentStamp: stamp }, source: "recomputed", stamp };
  } catch (error) {
    console.error("[refresh-report] recompute failed; using the stored report:", error);
    return keep("recompute failed");
  }
}

export function coreVerdictMismatch(stored: ReadinessReport, fresh: ReadinessReport): string | undefined {
  if ((stored.country ?? "AU") !== (fresh.country ?? "AU")) return "country differs";
  const sp = stored.pointsEstimate?.estimatedPoints;
  const fp = fresh.pointsEstimate?.estimatedPoints;
  if (sp !== fp) return `estimated points differ (${sp} vs ${fp})`;
  const norm = (r: ReadinessReport) => [...(r.detectedSubclasses ?? [])].sort().join(",");
  if (norm(stored) !== norm(fresh)) return `evaluated subclasses differ (${norm(stored)} vs ${norm(fresh)})`;
  return undefined;
}
