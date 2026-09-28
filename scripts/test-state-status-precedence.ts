/**
 * The AI assistant (lib/ai/retrieve-state-context.ts) and the report (lib/readiness/state-nomination.ts) resolve a
 * state's status with the same precedence (lib/state-nomination/state-status.ts): the admin status unless the
 * hand-verified rule was verified on a later day, then the scraper's status, then the rule. Checked with the live
 * admin rows' dates (TAS saved 2026-08-31 < rule 2026-09-22 -> rule; ACT saved 2026-09-22 -> admin), a newer admin
 * closure, and a scraper status -- every state the assistant returns must match the report's tracker.
 *
 *   npx tsx scripts/test-state-status-precedence.ts
 */
import type { ReadinessInput } from "../lib/readiness/types";

let failures = 0;
const ok = (m: string) => console.log(`  ✅ ${m}`);
const fail = (m: string) => {
  failures++;
  console.error(`  ❌ ${m}`);
};

type AdminRow = { stateCode: string; status: string; supportedVisas: string[]; feeAud: number | null; customAiNote: string | null; updatedAt: Date };
type IntelRow = { stateCode: string; status: string; officialNote: string | null; sourceUrl: string | null; lastVerifiedAt: Date };
let adminRows: AdminRow[] = [];
let intelRows: IntelRow[] = [];

async function main() {
  const empty = { findMany: async () => [], findUnique: async () => null, findFirst: async () => null };
  (globalThis as { prisma?: unknown }).prisma = {
    stateNominationConfig: { ...empty, findMany: async () => adminRows },
    stateIntelligence: { ...empty, findMany: async () => intelRows },
    $disconnect: async () => undefined,
  };
  const { retrieveStateContext } = await import("../lib/ai/retrieve-state-context");
  const { runReadinessEngine } = await import("../src/lib/readiness-engine");
  const { getStateIntelligenceMap, getStateNominationConfigMap } = await import("../lib/state-intelligence");

  const input: ReadinessInput = {
    locale: "en",
    country: "AU",
    mainGoal: "",
    currentCountry: "AU",
    passportCountry: "TR",
    age: "28",
    occupation: "Software Engineer (261313)",
    occupationConfirmed: "yes",
    englishLevel: "superior",
    qualificationLevel: "PhD",
    isQualificationRecognized: true,
    qualificationAwardedInAustralia: false,
    sponsorOrFamily: "Single / No Dependants",
  };
  const admin = (stateCode: string, status: string, updatedAt: string): AdminRow => ({ stateCode, status, supportedVisas: ["190", "491"], feeAud: null, customAiNote: null, updatedAt: new Date(updatedAt) });

  const cases: Array<{ name: string; admin: AdminRow[]; intel: IntelRow[]; expect: Record<string, string> }> = [
    {
      name: "live admin rows (2026-09-28)",
      admin: [
        admin("WA", "Open (Onshore & Offshore)", "2026-08-31T12:10:08.348Z"),
        admin("SA", "Open (Onshore & Offshore)", "2026-08-31T12:11:46.621Z"),
        admin("QLD", "Suspended / Closed", "2026-08-31T12:11:55.706Z"),
        admin("TAS", "Open (Onshore & Offshore)", "2026-08-31T12:16:04.707Z"),
        admin("NSW", "Suspended / Closed", "2026-09-06T13:25:23.899Z"),
        admin("NT", "Suspended / Closed", "2026-09-22T12:46:48.682Z"),
        admin("VIC", "Suspended / Closed", "2026-09-22T12:48:38.463Z"),
        admin("ACT", "Open (Onshore & Offshore)", "2026-09-22T12:58:14.178Z"),
      ],
      intel: [],
      expect: { TAS: "Open (Onshore Only)", ACT: "Open (Onshore & Offshore)", NT: "Suspended / Closed" },
    },
    {
      name: "an admin closure saved after the rule was verified wins",
      admin: [admin("WA", "Suspended / Closed", "2026-09-27T09:00:00.000Z")],
      intel: [],
      expect: { WA: "Suspended / Closed" },
    },
    {
      name: "scraper status used when no current admin status applies",
      admin: [admin("SA", "Suspended / Closed", "2026-08-01T00:00:00.000Z")],
      intel: [{ stateCode: "SA", status: "High Demand", officialNote: null, sourceUrl: null, lastVerifiedAt: new Date("2026-09-25T00:00:00.000Z") }],
      expect: { SA: "High Demand" },
    },
  ];

  for (const c of cases) {
    adminRows = c.admin;
    intelRows = c.intel;
    const [stateIntelligence, stateNominationConfig] = await Promise.all([getStateIntelligenceMap(), getStateNominationConfigMap()]);
    const report = runReadinessEngine({ ...input, stateIntelligence, stateNominationConfig });
    const reportStatus = new Map<string, string>((report.stateNominationTracker?.states ?? []).map((s) => [s.code, s.status]));
    const assistant = await retrieveStateContext("Which states are open for 190 or 491 state nomination?");
    const disagreements = assistant.filter((a) => reportStatus.has(a.code) && reportStatus.get(a.code) !== a.status);
    const expectedBad = Object.entries(c.expect).filter(
      ([code, status]) => reportStatus.get(code) !== status || (assistant.find((a) => a.code === code)?.status ?? status) !== status
    );
    if (assistant.length > 0 && disagreements.length === 0 && expectedBad.length === 0) {
      ok(`${c.name}: assistant and report agree on ${assistant.length} states (${Object.entries(c.expect).map(([k, v]) => `${k} ${v}`).join("; ")})`);
    } else {
      fail(`${c.name}: disagreements ${JSON.stringify(disagreements.map((a) => [a.code, a.status, reportStatus.get(a.code)]))}; expected ${JSON.stringify(expectedBad)}`);
    }
  }

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
