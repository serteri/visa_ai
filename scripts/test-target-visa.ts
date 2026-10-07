/**
 * Item 5: the single required Target visa field (500, 485, 482, 186, 189, 190, 491, 820/801, Not sure), READINESS_REPORT_MODE=DISABLED,
 * and the engine's handling of it. Real submit action (Prisma / Resend / network stubbed -- nothing is written).
 *
 *   npx tsx scripts/test-target-visa.ts
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
globalThis.fetch = (async () => { throw new Error("network access is forbidden"); }) as typeof fetch;

import { REPORTS_UNAVAILABLE } from "../lib/readiness/report-mode";
import { TARGET_VISAS, normalizeTargetVisa, targetGateKey, targetVisaOf, targetVisaOption } from "../lib/readiness/target-visa";
import { REVIEW_PERSONAS } from "./render-persona-pdfs";
import { runReadinessEngine } from "../src/lib/readiness-engine";

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else {
    failures++;
    console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`);
  }
};

async function main() {
  console.log("1. the Target visa values");
  check(TARGET_VISAS.join(",") === "500,485,482,186,189,190,491,820_801,not_sure", "nine options: 500, 485, 482, 186, 189, 190, 491, 820/801, Not sure");
  check(normalizeTargetVisa("820/801") === "820_801" && normalizeTargetVisa("820") === "820_801" && normalizeTargetVisa("Not sure") === "not_sure" && normalizeTargetVisa("189") === "189" && normalizeTargetVisa("") === undefined && normalizeTargetVisa("canada-express-entry-cec") === undefined && normalizeTargetVisa("189,190,491") === undefined, "normalisation; anything else is not a target");
  check(targetGateKey("820_801") === "820" && targetGateKey("not_sure") === undefined && targetGateKey("491") === "491", "gate keys");
  check(targetVisaOf({}) === "not_sure" && targetVisaOf({ preferredPathway: "491" }) === "491" && targetVisaOf({ targetVisa: "189", preferredPathway: "491" }) === "189", "an older report (no target) reads its single pathway, else Not sure");
  for (const loc of ["en", "tr", "zh-Hans"] as const) check(TARGET_VISAS.every((t) => targetVisaOption(t, loc).length > 3), `${loc}: every option has a label`);

  console.log("\n2. the form");
  const step1 = readFileSync("app/[locale]/(main)/full-check/step-1-personal.tsx", "utf8");
  const form = readFileSync("app/[locale]/(main)/full-check/full-check-waitlist-form.tsx", "utf8");
  check(/id="waitlist-target-visa"[\s\S]{0,260}required/.test(step1) && /TARGET_VISAS\.map/.test(step1) && /name="visaInterest"/.test(step1), "Australia: a required Target visa select with the nine options");
  check(/waitlist-target-visa/.test(form) && /Target visa is required/.test(form), "step 1 does not continue without it (client validation)");
  check(!/Birincil göç hedefiniz nedir/.test(step1.slice(step1.indexOf('selectedCountry === "AU" ?'), step1.indexOf(") : ("))), "the multi-select goal cards are gone from the Australia form");

  console.log("\n3. the real submit action");
  const { submitFullCheckWaitlist } = await import("../app/[locale]/(main)/full-check/actions");
  const base = REVIEW_PERSONAS["reference-se-au"];
  const fd = (extra: Record<string, string>, locale: string) => {
    const f = new FormData();
    f.set("email", "visitor@example.com");
    f.set("fullName", "Visitor");
    f.set("targetCountry", "AU");
    f.set("routeLocale", locale);
    f.set("currentCountry", "Australia");
    f.set("passportCountry", "Turkey");
    f.set("age", "30");
    f.set("occupation", String(base.occupation));
    for (const [k, v] of Object.entries(extra)) f.set(k, v);
    return f;
  };
  for (const locale of ["en", "tr", "zh-Hans"] as const) {
    const before = writes.length;
    const missing = await submitFullCheckWaitlist({ status: "idle" }, fd({}, locale));
    check(missing.status === "error" && !!missing.errors?.targetVisa && !/eligib|recommend/i.test(missing.errors.targetVisa), `${locale}: no Target visa -> a required-field error (${missing.errors?.targetVisa})`);
    check(writes.length === before, `${locale}: nothing is written for the refused submission`);
    const notSure = await submitFullCheckWaitlist({ status: "idle" }, fd({ visaInterest: "not_sure" }, locale));
    check(!notSure.errors?.targetVisa, `${locale}: "not_sure" is a valid Target visa`);
    const junk = await submitFullCheckWaitlist({ status: "idle" }, fd({ visaInterest: "189,190,491" }, locale));
    check(!!junk.errors?.targetVisa, `${locale}: a list of visas is not a Target visa`);
  }
  const src = readFileSync("app/[locale]/(main)/full-check/actions.ts", "utf8");
  check((src.match(/targetVisa: targetVisa \?\? undefined/g) ?? []).length >= 3, "the Target visa is stored on every ReadinessInput the action builds");
  check(/targetVisa === "not_sure" \? "" :/.test(src), "Not sure evaluates every pathway (no preferred pathway), as an empty choice always did");

  console.log("\n4. READINESS_REPORT_MODE=DISABLED");
  process.env.READINESS_REPORT_MODE = "DISABLED";
  for (const locale of ["en", "tr", "zh-Hans"] as const) {
    const before = writes.length;
    const res = await submitFullCheckWaitlist({ status: "idle" }, fd({ visaInterest: "491" }, locale));
    check(res.status === "error" && res.error === REPORTS_UNAVAILABLE[locale] && !res.reportId && writes.length === before, `${locale}: no report is generated; neutral message; nothing written`);
  }
  delete process.env.READINESS_REPORT_MODE;

  console.log("\n5. the engine");
  const withT = runReadinessEngine({ ...base, locale: "en", targetVisa: "491", preferredPathway: "491" });
  const noT = runReadinessEngine({ ...base, locale: "en", targetVisa: "not_sure", preferredPathway: undefined });
  check(withT.targetVisa === "491" && noT.targetVisa === "not_sure", "the report carries the Target visa");
  check(withT.pointsEstimate?.estimatedPoints === noT.pointsEstimate?.estimatedPoints && JSON.stringify(withT.pointsEstimate?.breakdown) === JSON.stringify(noT.pointsEstimate?.breakdown), "the points arithmetic does not depend on the Target visa");
  check(Array.isArray(withT.suppliedFacts) && withT.suppliedFacts.some((f) => f.field === "age" && f.value !== null) && withT.suppliedFacts.every((f) => f.value === null || typeof f.value === "string"), "the report carries what was entered; unanswered fields are null");
  const blank = runReadinessEngine({ locale: "en", country: "AU", currentCountry: "AU" } as never);
  check(blank.suppliedFacts!.filter((f) => f.field !== "currentCountry").every((f) => f.value === null), "nothing entered -> every fact is null (never a default or a zero)");

  if (failures) { console.error(`\n❌ ${failures} check(s) failed`); process.exit(1); }
  console.log("\n✅ ALL CHECKS PASSED");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
