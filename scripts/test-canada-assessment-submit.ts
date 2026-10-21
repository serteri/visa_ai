/**
 * The Canada Assessment's submit path (the real server action, Prisma / Resend / network stubbed; nothing is written):
 * the CRS answers are validated and stored on the report input, the single legacy fields are derived from them, and the step-3 validation asks for
 * every Canada question. (Before this, a Canada submission was refused with "English level is required": the form's CLB values were not accepted.)
 *
 *   npx tsx scripts/test-canada-assessment-submit.ts
 */
import "./lib/stub-request-context";

process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/d?sslmode=disable"; // never connects
process.env.RESEND_API_KEY = "re_test_stub_not_a_real_key";
process.env.CANADA_REPORT_ENABLED = "true"; // only so the action gets past the (separate) production gate; the gate itself is tested in test-canada-flag.ts

const writes: Array<{ sql: string; args: unknown[] }> = [];
(globalThis as { prisma?: unknown }).prisma = {
  $queryRawUnsafe: async (sql: string, ...args: unknown[]) => { writes.push({ sql, args }); return [{ id: "stub-report-id" }]; },
  $executeRawUnsafe: async (sql: string, ...args: unknown[]) => { writes.push({ sql, args }); return 1; },
  $disconnect: async () => undefined,
  stateAllocation: { findUnique: async () => null, findFirst: async () => null },
  occupation: { findUnique: async () => null, findFirst: async () => null },
  roundCutoff: { findUnique: async () => null, findFirst: async () => null },
  stateIntelligence: { findMany: async () => [] },
  stateNominationConfig: { findMany: async () => [] },
};
globalThis.fetch = (async () => { throw new Error("network access is forbidden"); }) as typeof fetch;

import { assessmentStepErrors } from "../lib/intake/assessment-validation";
import { CRS_FIELD } from "../lib/points/canada-crs-intake";

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else {
    failures++;
    console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`);
  }
};

const ANSWERS: Record<string, string> = {
  [CRS_FIELD.spouse]: "no", [CRS_FIELD.education]: "bachelors_or_3yr_program", [CRS_FIELD.credentials]: "one", [CRS_FIELD.secondLanguage]: "none",
  [CRS_FIELD.certificateOfQualification]: "no", [CRS_FIELD.sibling]: "no", [CRS_FIELD.canadianStudy]: "none", [CRS_FIELD.provincialNomination]: "no",
  crsFirst_speaking: "CLB_9", crsFirst_listening: "CLB_9", crsFirst_reading: "CLB_9", crsFirst_writing: "CLB_9",
  offshoreExperienceYears: "5", onshoreExperienceYears: "2",
};

async function main() {
  console.log("1. step-3 validation asks for every Canada question");
  const none = assessmentStepErrors(3, { targetCountry: "CA" }, false, false);
  for (const name of [CRS_FIELD.spouse, "crsFirst_speaking", "crsFirst_writing", CRS_FIELD.education, CRS_FIELD.credentials, CRS_FIELD.secondLanguage, CRS_FIELD.certificateOfQualification, CRS_FIELD.sibling, CRS_FIELD.canadianStudy, CRS_FIELD.provincialNomination, "offshoreExperienceYears", "onshoreExperienceYears"]) {
    check(none[name] === "required", `${name} is required for Canada`);
  }
  check(assessmentStepErrors(3, { targetCountry: "CA", englishLevel: "clb9", qualificationLevel: "Bachelor", sponsorOrFamily: "Single / No Spouse", ...ANSWERS }, false, false).crsFirst_speaking === undefined, "answered, nothing is reported");
  check(Object.keys(assessmentStepErrors(3, { targetCountry: "CA", englishLevel: "clb9", qualificationLevel: "Bachelor", sponsorOrFamily: "Single / No Spouse", ...ANSWERS }, false, false)).length === 0, "a fully answered Canada step 3 has no error");
  check(assessmentStepErrors(3, { targetCountry: "CA", [CRS_FIELD.spouse]: "yes" }, false, false)[CRS_FIELD.spouseEducation] === "required", "a spouse or partner makes the spouse questions required");
  check(assessmentStepErrors(3, { targetCountry: "CA", [CRS_FIELD.secondLanguage]: "tested" }, false, false).crsSecond_speaking === "required", "French results make the four French abilities required");
  check(assessmentStepErrors(3, { targetCountry: "AU", englishLevel: "superior", qualificationLevel: "PhD", sponsorOrFamily: "Single / No Dependants", offshoreExperienceYears: "1", onshoreExperienceYears: "1" }, false, true).crsFirst_speaking === undefined, "Australia is not asked any Canada question");

  console.log("\n2. the real submit action, Canada");
  const { submitFullCheckWaitlist } = await import("../app/[locale]/(main)/full-check/actions");
  const fd = new FormData();
  const base: Record<string, string> = {
    email: "visitor@example.com", fullName: "Sample Applicant", targetCountry: "CA", routeLocale: "en", currentCountry: "IN", passportCountry: "IN", age: "29",
    occupation: "Software developers and programmers (21232)", nocCode: "21232", visaInterest: "canada-express-entry-fsw", mainGoal: "", migrationGoals: "[]",
    // The single fields the Canada form mirrors from the CRS answers.
    englishLevel: "clb9", qualificationLevel: "Bachelor", sponsorOrFamily: "Single / No Spouse", ...ANSWERS,
  };
  for (const [k, v] of Object.entries(base)) fd.set(k, v);
  const res = await submitFullCheckWaitlist({ status: "idle" }, fd);
  check(!res.errors || Object.keys(res.errors).length === 0, "a Canada submission with the form's CLB values passes validation", JSON.stringify(res.errors ?? res.error ?? res).slice(0, 200));
  const stored = writes.map((w) => JSON.stringify(w.args)).join(" ");
  check(/canadaCrs/.test(stored) && /bachelors_or_3yr_program/.test(stored) && /CLB_9/.test(stored), "the CRS answers are stored on the report input (so a download recomputes the same CRS)");
  check(/clb9/.test(stored), "the single English level is derived from the lowest ability");

  console.log("\n3. the single fields are derived from the CRS answers (they cannot disagree)");
  const fd2 = new FormData();
  for (const [k, v] of Object.entries({ ...base, englishLevel: "clb4", crsFirst_reading: "CLB_7", sponsorOrFamily: "Spouse with functional English" })) fd2.set(k, v);
  writes.length = 0;
  await submitFullCheckWaitlist({ status: "idle" }, fd2);
  const stored2 = writes.map((w) => JSON.stringify(w.args)).join(" ");
  check(/clb7/.test(stored2) && !/clb4/.test(stored2) && !/functional English/.test(stored2), "a posted English level or marital value that disagrees with the CRS answers is replaced by the derived one");

  if (failures) { console.error(`\n❌ ${failures} check(s) failed`); process.exit(1); }
  console.log("\n✅ ALL CHECKS PASSED");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
