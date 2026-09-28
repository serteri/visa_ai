import { ensureCountrySpecificReportSchema } from "@/lib/readiness/country-scope";
import type { ReadinessInput, ReadinessReport } from "@/lib/readiness/types";
import { getStateIntelligenceMap, getStateNominationConfigMap } from "@/lib/state-intelligence";
import { runReadinessEngine } from "@/src/lib/readiness-engine";

export type RefreshedReport = {
  report: ReadinessReport;
  /** "recomputed": the current engine's deterministic sections; "stored": the report as saved at submission. */
  source: "recomputed" | "stored";
  reason?: string;
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
export async function refreshStoredReport(stored: ReadinessReport, input: ReadinessInput | null | undefined): Promise<RefreshedReport> {
  if (!input || typeof input !== "object") return { report: stored, source: "stored", reason: "no stored input" };
  try {
    const country = stored.country === "CA" ? "CA" : "AU";
    const [stateIntelligence, stateNominationConfig] = await Promise.all([getStateIntelligenceMap(), getStateNominationConfigMap()]);
    const fresh = ensureCountrySpecificReportSchema(
      runReadinessEngine({ ...input, country, stateIntelligence, stateNominationConfig }),
      country
    );
    const mismatch = coreVerdictMismatch(stored, fresh);
    if (mismatch) return { report: stored, source: "stored", reason: mismatch };
    return { report: { ...fresh, aiStrategy: stored.aiStrategy }, source: "recomputed" };
  } catch (error) {
    console.error("[refresh-report] recompute failed; using the stored report:", error);
    return { report: stored, source: "stored", reason: "recompute failed" };
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
