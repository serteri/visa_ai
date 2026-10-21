/**
 * Regression: the Assessment's destination-country selector ("Which country are you researching for immigration?") is always visible with
 * Australia and Canada, comes before the visa topic, and is independent of Current country and Passport country. No database, no network.
 *
 *   npx tsx scripts/test-destination-selector.ts
 */
import "./lib/stub-request-context";

import { readFileSync } from "node:fs";

import { activeCountries, countryLabels, countryVisaPathways, getVisaSubclassesForGoals } from "../lib/countries";
import { applyDestination, destinationFromParam, passportCountryOptions } from "../lib/intake/passport";
import { assessmentStepErrors } from "../lib/intake/assessment-validation";
import { buildReportView } from "../lib/reports/report-view";
import { blockStrings } from "../lib/reports/report-blocks";
import type { ReadinessInput } from "../lib/readiness/types";

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else {
    failures++;
    console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`);
  }
};

async function main() {
  process.env.DATABASE_URL ||= "postgresql://u:p@localhost:5432/d?sslmode=disable";
  const step1 = readFileSync("app/[locale]/(main)/full-check/step-1-personal.tsx", "utf8");
  const form = readFileSync("app/[locale]/(main)/full-check/full-check-waitlist-form.tsx", "utf8");

  console.log("1. both destinations are visible choices, before the visa topic");
  check(activeCountries.includes("AU") && activeCountries.includes("CA") && activeCountries.length === 2, "Australia and Canada are the selector's choices");
  check(countryLabels.AU.en === "Australia" && countryLabels.CA.en === "Canada", "labelled Australia / Canada");
  check(/Which country are you researching for immigration\?/.test(step1) && /activeCountries\.map/.test(step1), "the selector has the specified label and lists every active country");
  check(!/canadaReportEnabled\) \(\s*<div/.test(step1) && !/destination-fixed-au/.test(step1) && !/code !== "CA" \|\| canadaReportEnabled/.test(step1), "nothing hides the selector or Canada behind the Canada-generation flag");
  const at = (needle: string) => step1.indexOf(needle);
  const order = ["waitlist-target-country", "Visa topic to research", "waitlist-current-country", "waitlist-passport-country"].map(at);
  check(order.every((i) => i > 0) && order.every((v, i) => i === 0 || v > order[i - 1]), "order: destination, visa topic, current country, passport country");
  check(assessmentStepErrors(1, {}, false, true).targetCountry === "required", "the destination is a required first-step field");

  console.log("\n2. each destination loads its own content");
  const auPaths = countryVisaPathways.AU.map((p) => JSON.stringify(p)).join(" ");
  const caPaths = countryVisaPathways.CA.map((p) => JSON.stringify(p)).join(" ");
  check(countryVisaPathways.AU.length > 0 && countryVisaPathways.CA.length > 0, "both destinations have a visa/program list");
  check(!/Express Entry|Provincial Nominee/i.test(auPaths), "the Australian list holds no Canadian programs");
  check(!/subclass|\b189\b|\b190\b|\b491\b/i.test(caPaths), "the Canadian list holds no Australian subclasses");
  check(/selectedCountry === "AU" \?/.test(step1) && /countryVisaPathways\[selectedCountry\]/.test(step1), "the form switches its question flow on the selected destination");
  const caSlugs = new Set(countryVisaPathways.CA.map((p) => p.value));
  const caGoals = (["direct_pr", "employer_sponsorship", "regional"] as const).flatMap((g) => getVisaSubclassesForGoals([g], "CA"));
  check(caGoals.length > 0 && caGoals.every((v) => caSlugs.has(v)), "every Canada goal maps to a Canadian program slug, never an Australian subclass", caGoals.join());
  check(getVisaSubclassesForGoals(["direct_pr"], "AU").join() === "189,190", "Australian goals still map to Australian subclasses");

  console.log("\n3. Current country and Passport country stay independent");
  check(/name="currentCountry"/.test(step1) && /name="passportCountry"/.test(step1) && /name="targetCountry"/.test(step1), "three separate fields");
  check(!/setCurrentCountry\([^)]*destination/.test(step1) && !/setCurrentCountry/.test(form.slice(form.indexOf("const changeDestination"), form.indexOf("const initialAnzscoEntry"))), "changing the destination never touches Current country");
  check(applyDestination("TR", "CA", "en").passport === "TR" && applyDestination("TR", "AU", "en").passport === "TR", "an unrelated passport survives either destination");
  check(passportCountryOptions("CA").some((c) => c.code === "AU") && !passportCountryOptions("CA").some((c) => c.code === "CA") && passportCountryOptions("AU").some((c) => c.code === "CA"), "the passport list drops only the destination itself");
  check(destinationFromParam("ca") === "CA" && destinationFromParam("AU") === "AU" && destinationFromParam("TR") === "", "?country= names a destination only for AU / CA");
  check(!/useState<Destination \| "">\(destinationFromParam\(initialValues\.destination\)\)|canadaReportEnabled \? "" : "AU"/.test(form.replace(/initialDestination/g, "X")) || /initialDestination: Destination \| "" = destinationFromParam\(initialValues\.destination\);/.test(form), "the destination starts empty (or from ?country=), never forced to Australia");

  console.log("\n4. the report country matches the selected destination");
  const { runReadinessEngine } = await import("../src/lib/readiness-engine");
  const base = { locale: "en", currentCountry: "IN", passportCountry: "IN", age: "29" } as const;
  const auInput = { ...base, country: "AU", occupation: "Software Engineer", visaInterest: "189" } as unknown as ReadinessInput;
  const caInput = { ...base, country: "CA", occupation: "Software developers and programmers (21232)", nocCode: "21232", nocTeer: 1, englishLevel: "CLB 9", visaInterest: "Express Entry" } as unknown as ReadinessInput;
  const au = runReadinessEngine(auInput);
  const ca = runReadinessEngine(caInput);
  check(au.country === "AU" && ca.country === "CA", "the engine produces a report for the selected destination");
  const text = (r: typeof au) => buildReportView({ report: r, locale: "en", profile: { name: "Sample Applicant" }, dateText: "" }).sections.flatMap((s) => s.blocks.flatMap(blockStrings)).join(" ");
  check(!/Express Entry|IRCC|\bCRS\b/.test(text(au)), "an Australian report carries no Canadian program content");
  const caText = text(ca);
  check(/Express Entry|IRCC|Canada/.test(caText), "a Canadian report is Canadian");
  console.log(`  ℹ️  Canadian view still mentions Australian terms: ${/subclass|Home Affairs|SkillSelect/.test(caText)} (Canada reports use the Canada model; see test:canada-report)`);

  if (failures) { console.error(`\n❌ ${failures} check(s) failed`); process.exit(1); }
  console.log("\n✅ ALL CHECKS PASSED");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
