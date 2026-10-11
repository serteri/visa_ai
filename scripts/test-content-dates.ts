/**
 * lib/reports/content-dates.ts: the "Updated to reflect data as of <date>" stamp of a recomputed report is the most
 * recent effective/verified date among the data sources whose changes altered the report (dated after the report was
 * generated), else the content deploy date -- never the viewing date.
 *
 *   npx tsx scripts/test-content-dates.ts
 */
import feeProvenance from "../src/data/fee-provenance.json";
import occupationListProvenance from "../src/data/occupation-list-provenance.json";
import visaTrends from "../src/data/visa-trends.json";
import waList from "../src/data/state-occupation-lists/wa.json";
import type { ReadinessInput, ReadinessReport } from "../lib/readiness/types";
import { REPORT_CONTENT_DEPLOY_DATE, contentDataAsOf } from "../lib/reports/content-dates";
import { STATE_RULES } from "../lib/state-nomination/state-rules-config";
import { runReadinessEngine } from "../src/lib/readiness-engine";

let failures = 0;
const ok = (m: string) => console.log(`  ✅ ${m}`);
const fail = (m: string) => {
  failures++;
  console.error(`  ❌ ${m}`);
};

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
const fresh = runReadinessEngine(input);
const clone = (): ReadinessReport => JSON.parse(JSON.stringify(fresh));

// 1. The deploy date is not in the future and not older than any dated source.
const sourceDates = [
  ...(feeProvenance as { facts: Array<{ last_verified?: string }> }).facts.map((f) => f.last_verified),
  (visaTrends as { generated_on?: string }).generated_on,
  (waList as { _provenance: { last_verified?: string } })._provenance.last_verified,
  ...(occupationListProvenance as { facts: Array<{ lastVerified?: string | null }> }).facts.map((f) => f.lastVerified ?? undefined),
  ...Object.values(STATE_RULES).map((r) => r.lastVerified),
].filter((d): d is string => Boolean(d));
const latestSource = sourceDates.sort().at(-1)!;
const today = new Date().toISOString().slice(0, 10);
if (REPORT_CONTENT_DEPLOY_DATE <= today && REPORT_CONTENT_DEPLOY_DATE >= latestSource) ok(`REPORT_CONTENT_DEPLOY_DATE ${REPORT_CONTENT_DEPLOY_DATE}: not in the future, not older than the latest source date (${latestSource})`);
else fail(`REPORT_CONTENT_DEPLOY_DATE ${REPORT_CONTENT_DEPLOY_DATE} (today ${today}, latest source ${latestSource})`);

// 2. Unchanged content -> no data-as-of date (the report keeps its generation date).
if (contentDataAsOf(clone(), fresh, { generatedAt: "2026-09-27T21:30:42Z" }) === null) ok("unchanged content -> null (original generation date shown)");
else fail("unchanged content should not produce a data-as-of date");

// 3. Only WA's tracker row changed; WA's occupation list (2026-09-28) is newer than the report (2026-09-27) -> that date.
{
  const stored = clone();
  const wa = stored.stateNominationTracker!.states.find((s) => s.code === "WA")!;
  wa.score = wa.score - 10;
  const r = contentDataAsOf(stored, fresh, { generatedAt: "2026-09-27T21:30:42Z" });
  // The WA rules were re-verified on 2026-10-11 (after the occupation list of 2026-09-28): the latest dated source decides, and the list is among the sources.
  if (r?.date === "2026-10-11" && r.sources.some((s) => /WA occupation list/.test(s.source)) && r.sources.some((s) => /WA state rules/.test(s.source))) ok(`WA row changed after the new WA list and the 2026-10-11 re-verification -> "data as of 2026-10-11" (${r.sources.map((s) => s.source).join(", ")})`);
  else fail(`WA-only change: ${JSON.stringify(r)}`);
  // The same change on a report generated AFTER every WA source -> it came from code: the deploy date.
  const r2 = contentDataAsOf(stored, fresh, { generatedAt: "2026-10-10T23:00:00Z" });
  if (r2?.date === REPORT_CONTENT_DEPLOY_DATE && !r2.sources.some((s) => /WA occupation list/.test(s.source))) ok(`same change on a report newer than the WA sources -> deploy date ${REPORT_CONTENT_DEPLOY_DATE}`);
  else fail(`WA change after sources: ${JSON.stringify(r2)}`);
  // Admin settings saved after the report -> that date counts.
  const r3 = contentDataAsOf(stored, fresh, { generatedAt: "2026-10-10T23:00:00Z", stateNominationConfig: { WA: { updatedAt: "2026-10-12T01:00:00Z" } } });
  if (r3?.date === "2026-10-12" && r3.sources.some((s) => /WA admin settings/.test(s.source))) ok("WA admin settings saved after the report -> their date");
  else fail(`admin date: ${JSON.stringify(r3)}`);
}

// 4. A booster change on a report older than the benchmark snapshot -> the benchmark date.
{
  const stored = clone();
  stored.pointsBoosterSimulator!.scenarios.push({ label: "old row", estimatedChange: 5, resultingEstimate: 75, explanation: "", isCombined: true });
  const r = contentDataAsOf(stored, fresh, { generatedAt: "2026-03-01T00:00:00Z" });
  if (r?.date === (visaTrends as { generated_on: string }).generated_on) ok(`booster change on a report older than the benchmarks -> ${r.date}`);
  else fail(`benchmark attribution: ${JSON.stringify(r)}`);
  const r2 = contentDataAsOf(stored, fresh, { generatedAt: "2026-09-27T21:30:42Z" });
  if (r2?.date === REPORT_CONTENT_DEPLOY_DATE) ok(`the same change on a newer report came from code -> ${REPORT_CONTENT_DEPLOY_DATE}`);
  else fail(`code attribution: ${JSON.stringify(r2)}`);
}

// 5. Stable: the result does not depend on the current time.
{
  const stored = clone();
  stored.pointsBoosterSimulator!.scenarios.push({ label: "old row", estimatedChange: 5, resultingEstimate: 75, explanation: "", isCombined: true });
  const RealDate = Date;
  const at = (iso: string) => {
    const fixed = new RealDate(iso).getTime();
    (globalThis as { Date: DateConstructor }).Date = class extends RealDate {
      constructor(...a: unknown[]) {
        if (a.length === 0) super(fixed);
        else super(...(a as [string]));
      }
      static now() {
        return fixed;
      }
    } as unknown as DateConstructor;
    try {
      return contentDataAsOf(stored, fresh, { generatedAt: "2026-09-27T21:30:42Z" })?.date;
    } finally {
      (globalThis as { Date: DateConstructor }).Date = RealDate;
    }
  };
  const a = at("2026-10-02T00:00:00Z");
  const b = at("2027-06-30T00:00:00Z");
  if (a && a === b) ok(`same date on two simulated days (${a})`);
  else fail(`date depends on the day: ${a} vs ${b}`);
}

console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
process.exitCode = failures === 0 ? 0 : 1;
