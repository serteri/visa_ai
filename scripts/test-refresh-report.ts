/**
 * lib/reports/refresh-report.ts: the PDF (every download, the agent PDF and the email) is generated from the stored
 * report, so its deterministic sections are recomputed with the current engine from the stored inputs.
 *
 *   1. A stored report carrying the old subclass-mixed booster scenario comes back recomputed, without it, with the
 *      stored AI strategy kept.
 *   2. The stored report is used unchanged when recomputing would change the core verdict (estimated points or
 *      evaluated subclasses), when there is no stored input, or when recomputing throws.
 *
 *   npx tsx scripts/test-refresh-report.ts
 */
import type { ReadinessInput, ReadinessReport } from "../lib/readiness/types";

let failures = 0;
const ok = (m: string) => console.log(`  ✅ ${m}`);
const fail = (m: string) => {
  failures++;
  console.error(`  ❌ ${m}`);
};

async function main() {
  // No database: the live state readers degrade to empty maps.
  const empty = { findMany: async () => [], findUnique: async () => null, findFirst: async () => null };
  (globalThis as { prisma?: unknown }).prisma = { stateNominationConfig: empty, stateIntelligence: empty, $disconnect: async () => undefined };
  const { runReadinessEngine } = await import("../src/lib/readiness-engine");
  const { refreshStoredReport } = await import("../lib/reports/refresh-report");

  // Report b0d20f74's non-personal answers (70 points).
  const input: ReadinessInput = {
    locale: "en",
    country: "AU",
    mainGoal: "",
    currentCountry: "AU",
    passportCountry: "TR",
    age: "28",
    occupation: "Software Engineer (261313)",
    occupationConfirmed: "no",
    englishLevel: "superior",
    qualificationLevel: "PhD",
    isQualificationRecognized: true,
    qualificationAwardedInAustralia: false,
    annualSalaryAud: 45000,
    sponsorOrFamily: "Partner / Dependants WITHOUT Functional English",
  };
  const current = runReadinessEngine(input);
  const MIXED =
    "Obtain regional nomination or eligible relative sponsorship (subclass 491) + Obtain a NAATI credentialled community language (CCL) certification + Complete an Australian Professional Year program (recent Subclass 189 invitation benchmark: 95 pts)";
  const stored: ReadinessReport = JSON.parse(JSON.stringify(current));
  stored.pointsBoosterSimulator!.scenarios.push({ label: MIXED, estimatedChange: 25, resultingEstimate: 95, explanation: "", isCombined: true });
  stored.aiStrategy = { marker: "stored-strategy" } as unknown as ReadinessReport["aiStrategy"];

  const refreshed = await refreshStoredReport(stored, input);
  const labels = (refreshed.report.pointsBoosterSimulator?.scenarios ?? []).map((s) => s.label);
  if (refreshed.source === "recomputed" && !labels.includes(MIXED) && (refreshed.report.aiStrategy as unknown as { marker?: string })?.marker === "stored-strategy") {
    ok("stored report with the old 491-in-189 scenario is recomputed without it; the stored AI strategy is kept");
  } else fail(`refresh: ${refreshed.source} ${refreshed.reason ?? ""}; mixed still present: ${labels.includes(MIXED)}`);

  const otherPoints: ReadinessReport = JSON.parse(JSON.stringify(stored));
  otherPoints.pointsEstimate!.estimatedPoints = 65;
  const r2 = await refreshStoredReport(otherPoints, input);
  if (r2.source === "stored" && /estimated points differ/.test(r2.reason ?? "")) ok("estimated points would change -> stored report used unchanged");
  else fail(`points guard: ${r2.source} ${r2.reason}`);

  const otherSubclasses: ReadinessReport = JSON.parse(JSON.stringify(stored));
  otherSubclasses.detectedSubclasses = ["491"];
  const r3 = await refreshStoredReport(otherSubclasses, input);
  if (r3.source === "stored" && /evaluated subclasses differ/.test(r3.reason ?? "")) ok("evaluated subclasses would change (e.g. unsaved migration goals) -> stored report used unchanged");
  else fail(`subclass guard: ${r3.source} ${r3.reason}`);

  const r4 = await refreshStoredReport(stored, null);
  const sameContent = JSON.stringify({ ...r4.report, contentStamp: undefined }) === JSON.stringify({ ...stored, contentStamp: undefined });
  if (r4.source === "stored" && sameContent && r4.report.contentStamp?.recomputed === false) ok("no stored input -> stored report used unchanged (stamped with its generation date)");
  else fail(`no-input guard: ${r4.source}`);

  const r5 = await refreshStoredReport(stored, { ...input, age: { bad: true } as unknown as string });
  if (r5.source === "stored") ok(`recompute failure or mismatch -> stored report (${r5.reason})`);
  else fail("a broken stored input should fall back to the stored report");

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
