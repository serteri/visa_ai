/**
 * Item 4: Canada report generation is disabled behind a server-side flag (CANADA_REPORT_ENABLED, off unless exactly "true";
 * READINESS_REPORT_MODE=DISABLED switches it off regardless), with a neutral message in en / tr / zh-Hans. The Canada
 * engine and PDF code stay; a stored Canada report still renders.
 *
 *   npx tsx scripts/test-canada-flag.ts      (the real submit action; Prisma / Resend / network stubbed -- nothing is written)
 */
import "./lib/stub-request-context";

import { readFileSync } from "node:fs";

process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/d?sslmode=disable"; // never connects
process.env.RESEND_API_KEY = "re_test_stub_not_a_real_key";

const writes: string[] = [];
(globalThis as { prisma?: unknown }).prisma = {
  $queryRawUnsafe: async (sql: string) => { writes.push(`q:${sql.slice(0, 40)}`); return []; },
  $executeRawUnsafe: async (sql: string) => { writes.push(`w:${sql.slice(0, 40)}`); return 1; },
  $disconnect: async () => undefined,
  stateAllocation: { findUnique: async () => null, findFirst: async () => null },
  occupation: { findUnique: async () => null, findFirst: async () => null },
  roundCutoff: { findUnique: async () => null, findFirst: async () => null },
  stateIntelligence: { findMany: async () => [] },
  stateNominationConfig: { findMany: async () => [] },
};
let fetches = 0;
globalThis.fetch = (async () => { fetches++; throw new Error("network access is forbidden"); }) as typeof fetch;

import { CANADA_REPORT_UNAVAILABLE, isCanadaReportEnabled, readinessReportMode } from "../lib/readiness/report-mode";

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else {
    failures++;
    console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`);
  }
};

async function main() {
  console.log("1. flag parsing");
  check(readinessReportMode({}) === "REVIEW" && readinessReportMode({ READINESS_REPORT_MODE: "junk" }) === "REVIEW" && readinessReportMode({ READINESS_REPORT_MODE: "information" }) === "INFORMATION" && readinessReportMode({ READINESS_REPORT_MODE: " DISABLED " }) === "DISABLED", "READINESS_REPORT_MODE: REVIEW default; INFORMATION / DISABLED recognised");
  check(!isCanadaReportEnabled({}) && !isCanadaReportEnabled({ CANADA_REPORT_ENABLED: "1" }) && !isCanadaReportEnabled({ CANADA_REPORT_ENABLED: "TRUE" }) && !isCanadaReportEnabled({ CANADA_REPORT_ENABLED: "" }), "Canada is OFF unless the flag is exactly \"true\"");
  check(isCanadaReportEnabled({ CANADA_REPORT_ENABLED: "true" }) && !isCanadaReportEnabled({ CANADA_REPORT_ENABLED: "true", READINESS_REPORT_MODE: "DISABLED" }), "\"true\" turns it on; DISABLED mode overrides it");

  console.log("\n2. the real submit action, flag off");
  delete process.env.CANADA_REPORT_ENABLED;
  const { submitFullCheckWaitlist } = await import("../app/[locale]/(main)/full-check/actions");
  for (const locale of ["en", "tr", "zh-Hans"] as const) {
    const fd = new FormData();
    fd.set("email", "visitor@example.com");
    fd.set("fullName", "Visitor");
    fd.set("targetCountry", "CA");
    fd.set("routeLocale", locale);
    fd.set("visaInterest", "Express Entry");
    fd.set("mainGoal", "Move to Canada");
    const before = writes.length;
    const res = await submitFullCheckWaitlist({ status: "idle" }, fd);
    check(res.status === "error" && res.error === CANADA_REPORT_UNAVAILABLE[locale], `${locale}: a Canada request is refused with the neutral message`, JSON.stringify(res).slice(0, 160));
    check(!/eligib|recommend|best|strateg/i.test(res.error ?? "") && !res.reportId && !res.header, `${locale}: no report, no preview, no advice wording`);
    check(writes.length === before && fetches === 0, `${locale}: nothing written, no network call`);
  }
  // Wording that implies a country is unsupported (keyword route) is covered too: no targetCountry field, Canadian signals.
  const fd2 = new FormData();
  fd2.set("email", "visitor@example.com");
  fd2.set("routeLocale", "en");
  fd2.set("visaInterest", "Express Entry CRS");
  fd2.set("mainGoal", "Canada PR");
  const res2 = await submitFullCheckWaitlist({ status: "idle" }, fd2);
  check(res2.status === "error" && res2.error === CANADA_REPORT_UNAVAILABLE.en, "a Canada request detected from the goal text (no country field) is refused too");

  console.log("\n3. the form and the code");
  const step1 = readFileSync("app/[locale]/(main)/full-check/step-1-personal.tsx", "utf8");
  const page = readFileSync("app/[locale]/(main)/full-check/page.tsx", "utf8");
  check(/filter\(\(code\) => code !== "CA" \|\| canadaReportEnabled\)/.test(step1) && /canada-unavailable/.test(step1), "the country list omits Canada while the flag is off and says why (en / tr / zh-Hans)");
  check(/upper === "CA" && !canadaReportEnabled\) return null/.test(step1) && /isCanadaReportEnabled\(\)/.test(page), "a ?country=CA link does not preselect Canada while the flag is off");
  check(/runCanadaReadinessEngine/.test(readFileSync("lib/readiness/engine.ts", "utf8")), "the Canada engine is still in the repository");

  if (failures) { console.error(`\n❌ ${failures} check(s) failed`); process.exit(1); }
  console.log("\n✅ ALL CHECKS PASSED");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
