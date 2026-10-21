/**
 * The Canada Assessment's NOC 2021 occupation field: the exact clicked search result is what the form holds and what the server action stores.
 *
 *   npx tsx scripts/test-noc-selection.ts
 */
import "./lib/stub-request-context";

process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/d?sslmode=disable"; // never connects
process.env.RESEND_API_KEY = "re_test_stub_not_a_real_key";
process.env.CANADA_REPORT_ENABLED = "true";

const writes: Array<{ args: unknown[] }> = [];
(globalThis as { prisma?: unknown }).prisma = {
  $queryRawUnsafe: async (_s: string, ...args: unknown[]) => { writes.push({ args }); return [{ id: "stub-report-id" }]; },
  $executeRawUnsafe: async (_s: string, ...args: unknown[]) => { writes.push({ args }); return 1; },
  $disconnect: async () => undefined,
  stateAllocation: { findUnique: async () => null, findFirst: async () => null },
  occupation: { findUnique: async () => null, findFirst: async () => null },
  roundCutoff: { findUnique: async () => null, findFirst: async () => null },
  stateIntelligence: { findMany: async () => [] },
  stateNominationConfig: { findMany: async () => [] },
};
globalThis.fetch = (async () => { throw new Error("network access is forbidden"); }) as typeof fetch;

import { readFileSync } from "node:fs";
import nocList from "../src/data/countries/ca/noc-list.json";
import { editNocSearch, pickNocResult, type NocPick } from "../lib/intake/noc-select";
import { CRS_FIELD } from "../lib/points/canada-crs-intake";

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else { failures++; console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`); }
};

async function main() {
  const list = nocList as NocPick[];
  const e = (code: string) => list.find((x) => x.code === code)!;
  const a = e("21232"), b = e("21311");
  check(!!a && !!b && a.code !== b.code, "the NOC data holds both 21232 and 21311");

  console.log("\n1. the field's state follows the exact clicked result");
  const s1 = pickNocResult(a);
  check(s1.code === "21232" && s1.search === a.title && s1.teer === a.teer, "clicking 21232 stores 21232, its title and its TEER");
  const s2 = pickNocResult(b);
  check(s2.code === "21311" && s2.search === b.title && s2.teer === b.teer, "clicking 21311 stores 21311, its title and its TEER");
  const typed = editNocSearch("computer eng");
  check(typed.code === "" && typed.teer === null && typed.search === "computer eng", "changing the search discards the old code and TEER");
  const s3 = pickNocResult(b);
  check(s3.code === "21311" && s3.search === b.title, "...and choosing another result replaces the old value");
  const s4 = pickNocResult(a);
  check(s4.code === "21232" && s4.search !== b.title, "...and choosing the first again replaces it back (nothing stale)");

  console.log("\n2. the component wires the clicked entry, with a stable unique key");
  const src = readFileSync("app/[locale]/(main)/full-check/step-2-career.tsx", "utf8");
  check(/nocResults\.map\(\(entry\) => \(\s*<li key=\{entry\.code\}/.test(src), "each result is keyed by its NOC code (unique), not by array position");
  check(!/nocResults\.map\(\([^)]*,\s*(i|idx|index)\)/.test(src), "the result list does not use the array index");
  check(/onMouseDown=\{\(e\) => \{ e\.preventDefault\(\); const picked = pickNocResult\(entry\);/.test(src), "the click handler picks the entry of the clicked row");
  check(!/highlight|activeIndex|selectedIndex/i.test(src.slice(src.indexOf("nocResults.map") - 400, src.indexOf("nocResults.map") + 900)), "there is no separate highlighted-index state that could differ from the clicked row");
  check(/name="occupation" value=\{nocSearch\}/.test(src) && /name="nocCode" value=\{nocCode\}/.test(src), "the submitted occupation and NOC code are the field's own state");
  check(/data-noc-code=\{entry\.code\}/.test(src), "each result row carries its code (inspectable)");
  check(/onChange=\{\(e\) => \{ const next = editNocSearch\(e\.target\.value\);/.test(src), "editing the text goes through editNocSearch");

  console.log("\n3. the submitted Canada payload carries exactly the selected NOC");
  const { submitFullCheckWaitlist } = await import("../app/[locale]/(main)/full-check/actions");
  const ANSWERS: Record<string, string> = {
    [CRS_FIELD.spouse]: "no", [CRS_FIELD.education]: "bachelors_or_3yr_program", [CRS_FIELD.credentials]: "one", [CRS_FIELD.secondLanguage]: "none",
    [CRS_FIELD.certificateOfQualification]: "no", [CRS_FIELD.sibling]: "no", [CRS_FIELD.canadianStudy]: "none", [CRS_FIELD.provincialNomination]: "no",
    crsFirst_speaking: "CLB_9", crsFirst_listening: "CLB_9", crsFirst_reading: "CLB_9", crsFirst_writing: "CLB_9",
    offshoreExperienceYears: "5", onshoreExperienceYears: "2", qualificationAwardedInAustralia: "no",
  };
  for (const [label, entry, other] of [["21232", a, b], ["21311", b, a]] as const) {
    const fd = new FormData();
    const base: Record<string, string> = {
      email: "visitor@example.com", fullName: "Sample Applicant", targetCountry: "CA", routeLocale: "en", currentCountry: "IN", passportCountry: "TR", age: "29",
      occupation: entry.title, nocCode: entry.code, visaInterest: "canada-express-entry-fsw", mainGoal: "", migrationGoals: "[]",
      englishLevel: "clb9", qualificationLevel: "Bachelor", sponsorOrFamily: "Single / No Spouse", ...ANSWERS,
    };
    for (const [k, v] of Object.entries(base)) fd.set(k, v);
    writes.length = 0;
    const res = await submitFullCheckWaitlist({ status: "idle" }, fd);
    check(!res.errors || Object.keys(res.errors).length === 0, `${label}: the submission passes validation`, JSON.stringify(res.errors ?? res.error ?? res).slice(0, 160));
    const stored = writes.map((w) => JSON.stringify(w.args)).join(" ");
    check(new RegExp(`nocCode[^a-zA-Z0-9]{1,6}${entry.code}`).test(stored), `${label}: the stored report input has nocCode ${entry.code}`);
    check(stored.includes(entry.title), `${label}: the stored occupation title is "${entry.title}"`);
    check(!new RegExp(`nocCode[^a-zA-Z0-9]{1,6}${other.code}`).test(stored), `${label}: no neighbouring NOC code (${other.code}) is stored`);
  }

  console.log("\n4. the Canada report carries exactly the selected NOC");
  const { runReadinessEngine } = await import("../src/lib/readiness-engine");
  const { buildReportView } = await import("../lib/reports/report-view");
  const { blockStrings } = await import("../lib/reports/report-blocks");
  for (const [entry, other] of [[a, b], [b, a]] as const) {
    const input = { locale: "en", currentCountry: "IN", passportCountry: "TR", age: "29", country: "CA", occupation: `${entry.title} (${entry.code})`, nocCode: entry.code, nocTeer: entry.teer, englishLevel: "CLB 9", visaInterest: "Express Entry" } as never;
    const view = buildReportView({ report: runReadinessEngine(input), locale: "en", profile: { name: "Sample Applicant" }, dateText: "" });
    const text = view.sections.flatMap((sec) => sec.blocks.flatMap(blockStrings)).join(" ");
    check(text.includes(entry.code) && text.includes(entry.title), `${entry.code}: the report names NOC ${entry.code} and "${entry.title}"`);
    check(!new RegExp(`\b${other.code}\b`).test(text), `${entry.code}: the report does not name ${other.code}`);
  }

  if (failures) { console.error(`\n❌ ${failures} check(s) failed`); process.exit(1); }
  console.log("\n✅ ALL CHECKS PASSED");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
