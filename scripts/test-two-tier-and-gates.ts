/**
 * Intake + engine rules:
 *   1. The four points-test partner options score +10 (single), +10 (partner, Competent English AND positive skills
 *      assessment), +5 (Competent English only), 0 (no functional English) -- coefficients unchanged.
 *   2. "Overseas qualification recognized?" is gone: a stored answer no longer earns education points; overseas
 *      education counts once a positive skills assessment is on file.
 *   3. Hard Gates: Subclass 186 is Ineligible below 3 years of total experience, Subclass 482 below 1 year.
 *   4. Two-tier status for 189/190/491 without a skills assessment: Tier 1 "BLOCKED: Requires positive Skills
 *      Assessment to proceed.", Tier 2 "POTENTIAL SCORE: X Points" (same table, as if the assessment were positive),
 *      pathways still shown, benchmark comparison from the potential score.
 *   5. The form: no recognition field, the four sponsor options, and the STEM checkbox only for PhD / Master's
 *      (Research) completed in Australia.
 *
 *   npx tsx scripts/test-two-tier-and-gates.ts
 */
import { readFileSync } from "node:fs";

import type { ReadinessInput, ReadinessReport } from "../lib/readiness/types";
import { runReadinessEngine } from "../src/lib/readiness-engine";

let failures = 0;
const ok = (m: string) => console.log(`  ✅ ${m}`);
const fail = (m: string) => {
  failures++;
  console.error(`  ❌ ${m}`);
};

const base: ReadinessInput = {
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
  qualificationAwardedInAustralia: false,
  annualSalaryAud: 95000,
  sponsorOrFamily: "Single / No Dependants",
  offshoreExperienceYears: 4,
};
const run = (patch: Partial<ReadinessInput> = {}, locale: ReadinessInput["locale"] = "en"): ReadinessReport => runReadinessEngine({ ...base, ...patch, locale });
const partnerPoints = (r: ReadinessReport) => r.pointsEstimate?.breakdown.find((b) => /Partner|伴侣|Partner Nitelikleri/.test(b.label))?.points;

console.log("==================== (1) partner options ====================");
for (const [value, pts] of [
  ["Single / No Dependants", 10],
  ["Partner with Competent English and positive Skills Assessment", 10],
  ["Partner with Competent English only", 5],
  ["Partner / Dependants WITHOUT Functional English", 0],
] as const) {
  const got = partnerPoints(run({ sponsorOrFamily: value }));
  if (got === pts) ok(`"${value}" -> ${pts} partner points`);
  else fail(`"${value}" -> ${got}, expected ${pts}`);
}

console.log("\n==================== (2) recognition answer no longer counts ====================");
{
  const educationPts = (r: ReadinessReport) => r.pointsEstimate?.breakdown.find((b) => /Educational Qualifications/.test(b.label))?.points;
  const without = educationPts(run());
  const withStale = educationPts(run({ isQualificationRecognized: true }));
  const assessed = educationPts(run({ occupationConfirmed: "yes" }));
  if (without === 0 && withStale === 0 && assessed === 20) ok("overseas PhD: 0 education points without a skills assessment (a stored 'recognized: yes' is ignored), 20 with one");
  else fail(`education points: without ${without}, stale answer ${withStale}, assessed ${assessed}`);
}

console.log("\n==================== (3) 186 / 482 hard gates ====================");
{
  const cases: Array<[string, Partial<ReadinessInput>, boolean, boolean]> = [
    // [label, experience, 186 ineligible, 482 ineligible]
    ["0 years", { offshoreExperienceYears: 0, onshoreExperienceYears: 0 }, true, true],
    ["none entered", { offshoreExperienceYears: undefined, onshoreExperienceYears: undefined }, true, true],
    ["0.5 years", { offshoreExperienceYears: 0.5 }, true, true],
    ["1 + 1 = 2 years", { offshoreExperienceYears: 1, onshoreExperienceYears: 1 }, true, false],
    ["2 + 1 = 3 years", { offshoreExperienceYears: 2, onshoreExperienceYears: 1 }, false, false],
  ];
  for (const [label, exp, no186, no482] of cases) {
    for (const locale of ["en", "tr", "zh-Hans"] as const) {
      const r = run({ ...exp, occupationConfirmed: "yes", preferredPathway: "482,186" }, locale);
      const p186 = r.pathwayComparison.find((p) => p.subclass === "186");
      const p482 = r.pathwayComparison.find((p) => p.subclass === "482");
      const bad186 = p186 ? (p186.relevance === "ineligible") !== no186 : false;
      const bad482 = p482 ? (p482.relevance === "ineligible") !== no482 : false;
      const statutory = (p: typeof p186) => !p || p.relevance !== "ineligible" || /Hard Gate|Kesin şart|硬性门槛/.test(p.reason);
      if (!bad186 && !bad482 && statutory(p186) && statutory(p482)) {
        if (locale === "en") ok(`${label}: 186 ${p186?.relevance}, 482 ${p482?.relevance}`);
      } else fail(`${label} [${locale}]: 186 ${p186?.relevance} (expected ${no186 ? "ineligible" : "not"}), 482 ${p482?.relevance} (expected ${no482 ? "ineligible" : "not"})`);
      if (locale === "en" && no186 && p186 && !/at least 3 years.*statutory/.test(p186.reason)) fail(`${label}: 186 reason lacks the statutory 3-year wording: ${p186.reason}`);
      if (locale === "en" && no482 && p482 && !/at least 1 year.*statutory/.test(p482.reason)) fail(`${label}: 482 reason lacks the statutory 1-year wording: ${p482.reason}`);
      // Never recommended: an ineligible 186/482 is not in the ranked skilled recommendations.
      if (no186 && r.detectedSubclasses?.includes("186") && p186?.relevance !== "ineligible") fail(`${label}: 186 still recommended`);
    }
  }
}

console.log("\n==================== (4) two-tier status ====================");
for (const locale of ["en", "tr", "zh-Hans"] as const) {
  const r = run({}, locale);
  const t = r.twoTierStatus;
  const est = r.pointsEstimate!.estimatedPoints!;
  const pot = r.pointsEstimate!.potentialPoints!;
  const tier1 = { en: "BLOCKED: Requires positive Skills Assessment to proceed.", tr: "ENGELLİ", "zh-Hans": "受阻" }[locale];
  const tier2 = { en: `POTENTIAL SCORE: ${pot} Points`, tr: `POTANSİYEL PUAN: ${pot} Puan`, "zh-Hans": `潜在分数：${pot} 分` }[locale];
  const shown = ["189", "190", "491"].every((s) => r.pathwayComparison.some((p) => p.subclass === s));
  const notShutDown = r.pathwayComparison.filter((p) => ["189", "190", "491"].includes(p.subclass)).every((p) => p.relevance !== "ineligible");
  const compares = t?.comparisons.length === 3 && t.comparisons.every((c) => /benchmark|referans|参考分/.test(c) && c.includes(String(pot)));
  if (t && est === 60 && pot === 85 && t.tier1.startsWith(tier1) && t.tier2 === tier2 && shown && notShutDown && compares) {
    ok(`[${locale}] Tier 1 "${t.tier1}"; Tier 2 "${t.tier2}" (current ${est}); 189/190/491 shown, none shut down; ${t.comparisons.length} benchmark comparisons from ${pot}`);
  } else fail(`[${locale}] two-tier: est ${est}, potential ${pot}, ${JSON.stringify(t)}, shown ${shown}, notShutDown ${notShutDown}, compares ${compares}`);
}
{
  // (Single, 4 years overseas, PhD: current 60 = age 30 + English 20 + partner 10; the assessment releases 15 + 10.)
  // With a positive assessment there is no Tier 1 block and potential == estimate.
  const r = run({ occupationConfirmed: "yes" });
  if (!r.twoTierStatus && r.pointsEstimate!.potentialPoints === r.pointsEstimate!.estimatedPoints) ok("assessment done -> no two-tier block, potential == current");
  else fail(`assessment done: ${JSON.stringify(r.twoTierStatus)}, ${r.pointsEstimate!.potentialPoints} vs ${r.pointsEstimate!.estimatedPoints}`);
  // Age 45+: no potential score is offered (an age block, not a skills-assessment block).
  const old = run({ age: "46" });
  if (!old.twoTierStatus) ok("age 45+ -> no two-tier status (age is the blocker)");
  else fail("two-tier status shown for an over-age applicant");
  // Same coefficients: the current score of the blocked profile is unchanged, potential adds only the held-back points.
  const held = run({});
  const done = run({ occupationConfirmed: "yes" });
  if (held.pointsEstimate!.potentialPoints === done.pointsEstimate!.estimatedPoints) ok("potential score == the score the same profile has once assessed (coefficients unchanged)");
  else fail(`potential ${held.pointsEstimate!.potentialPoints} != assessed ${done.pointsEstimate!.estimatedPoints}`);
}

console.log("\n==================== (5) the form ====================");
{
  const dir = "app/[locale]/(main)/full-check/";
  const step3 = readFileSync(`${dir}step-3-language.tsx`, "utf8");
  const form = readFileSync(`${dir}full-check-waitlist-form.tsx`, "utf8");
  const action = readFileSync(`${dir}actions.ts`, "utf8");
  if (![step3, form, action].some((s) => /isQualificationRecognized|Overseas qualification recognized/.test(s.replace(/\/\/.*$/gm, "").replace(/\*[^\n]*/g, "")))) ok('no "Overseas qualification recognized?" field in the form or action');
  else fail("the recognition field is still referenced in the form or action");
  const options = ["Single (+10 pts)", "Partner with Competent English AND positive Skills Assessment (+10 pts)", "Partner with Competent English only (+5 pts)", "Partner with NO functional English / Not eligible (0 pts)"];
  const missing = options.filter((o) => !form.includes(o));
  if (missing.length === 0 && !form.includes('"Partner / Dependants with Functional English"')) ok("the four points-test sponsor options, exactly; the Functional-English option is gone");
  else fail(`sponsor options missing: ${missing.join(" | ")}`);
  if (/type="checkbox"[\s\S]{0,400}waitlist-specialist-stem/.test(step3) || /waitlist-specialist-stem[\s\S]{0,600}type="checkbox"/.test(step3)) ok("STEM question is a checkbox");
  else fail("STEM checkbox missing");
  const gated = /selectedCountryIsAU && qualificationAwardedInAustralia === "yes" && isResearchOrDoctorateQualification[\s\S]{0,200}waitlist-specialist-stem|isResearchOrDoctorateQualification[\s\S]{0,300}Is this a STEM degree\? \(Science, Tech, Engineering, Math\)/.test(step3);
  const label = step3.includes("Is this a STEM degree? (Science, Tech, Engineering, Math)");
  if (gated && label) ok('checkbox "Is this a STEM degree? (Science, Tech, Engineering, Math)" shown only for PhD / Master\'s (Research) completed in Australia');
  else fail(`STEM checkbox gating: gated ${gated}, label ${label}`);
}

console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
process.exitCode = failures === 0 ? 0 : 1;
