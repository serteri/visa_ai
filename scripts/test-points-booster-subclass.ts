/**
 * Points Booster Simulator subclass invariants (lib/readiness/engine.ts buildPointsBoosterSimulator).
 *
 * Nomination points belong to one subclass: 190 state nomination (+5) counts only for 190, 491 regional nomination /
 * sponsorship (+15) only for 491, and neither for 189. Over a matrix of personas and locales:
 *   1. No scenario labelled with the Subclass 189 benchmark contains a nomination factor.
 *   2. No scenario labelled with the Subclass 190 (491) benchmark contains the 491 (190) nomination.
 *   3. No combined scenario sums both nominations, or both partner options.
 *   4. A combined scenario that includes a nomination is scoped to that subclass (onlyForSubclass + label qualifier).
 *   5. Conditional lines ("If your degree ...") are never summed into a combination.
 *
 *   npx tsx scripts/test-points-booster-subclass.ts
 */
import type { PointsBoosterScenario, ReadinessInput } from "../lib/readiness/types";
import { runReadinessEngine } from "../src/lib/readiness-engine";

let failures = 0;
let checked = 0;
const fail = (m: string) => {
  failures++;
  console.error(`  ❌ ${m}`);
};

const NOM190 = { en: "(subclass 190)", tr: "190", "zh-Hans": "190" };
const base: ReadinessInput = {
  locale: "en",
  country: "AU",
  mainGoal: "Skilled migration through 189, 190 or 491",
  currentCountry: "AU",
  passportCountry: "TR",
  age: "28",
  occupation: "Software Engineer 261313",
  occupationConfirmed: "no",
  englishLevel: "superior",
  qualificationLevel: "PhD/Doctorate",
  sponsorOrFamily: "Partner / Dependants WITHOUT Functional English",
  migrationGoals: ["direct_pr"],
};
const variants: Array<[string, Partial<ReadinessInput>]> = [
  ["reference (SE, 28, Superior, PhD, partner w/o English)", {}],
  ["offshore India", { currentCountry: "IN", passportCountry: "IN" }],
  ["competent English, 36, bachelor", { age: "36", englishLevel: "competent", qualificationLevel: "Bachelor's Degree", occupationConfirmed: "yes" }],
  ["proficient, 33, 3y offshore", { age: "33", englishLevel: "proficient", offshoreExperienceYears: 3, occupationConfirmed: "yes" }],
  ["single, 41, competent", { age: "41", englishLevel: "competent", sponsorOrFamily: "Single" }],
  ["nurse 254411, 30, proficient", { occupation: "Registered Nurse 254411", englishLevel: "proficient", occupationConfirmed: "yes" }],
];

const nominationSubclassesIn = (label: string, nom190: string, nom491: string) => ({
  has190: label.includes(nom190),
  has491: label.includes(nom491),
});

for (const locale of ["en", "tr", "zh-Hans"] as const) {
  for (const [name, patch] of variants) {
    const report = runReadinessEngine({ ...base, ...patch, locale } as ReadinessInput);
    const sim = (report as { pointsBoosterSimulator?: { scenarios?: PointsBoosterScenario[] } }).pointsBoosterSimulator;
    const scenarios = sim?.scenarios ?? [];
    const singles = scenarios.filter((s) => !s.isCombined);
    const nom190 = singles.find((s) => s.onlyForSubclass === "190")?.label;
    const nom491 = singles.find((s) => s.onlyForSubclass === "491")?.label;
    if (!nom190 || !nom491) {
      fail(`[${locale}] ${name}: expected both nomination scenarios to be scoped (190: ${nom190 ?? "-"}, 491: ${nom491 ?? "-"})`);
      continue;
    }
    if (locale === "en" && !nom190.includes(NOM190.en)) fail(`[en] ${name}: 190 nomination label "${nom190}"`);
    const conditionals = singles.filter((s) => s.conditional).map((s) => s.label);
    for (const s of scenarios.filter((x) => x.isCombined)) {
      checked++;
      const { has190, has491 } = nominationSubclassesIn(s.label, nom190, nom491);
      const bench = s.label.match(/Subclass (189|190|491)/)?.[1];
      const tag = `[${locale}] ${name}: "${s.label}"`;
      if (has190 && has491) fail(`${tag} sums both nominations`);
      if (bench === "189" && (has190 || has491 || s.onlyForSubclass)) fail(`${tag} -- a 189 scenario contains a nomination factor`);
      if (bench === "190" && (has491 || s.onlyForSubclass === "491")) fail(`${tag} -- a 190 scenario contains the 491 nomination`);
      if (bench === "491" && (has190 || s.onlyForSubclass === "190")) fail(`${tag} -- a 491 scenario contains the 190 nomination`);
      if (has190 && s.onlyForSubclass !== "190") fail(`${tag} -- contains the 190 nomination but is not scoped to 190`);
      if (has491 && s.onlyForSubclass !== "491") fail(`${tag} -- contains the 491 nomination but is not scoped to 491`);
      if ((has190 || has491) && !bench && !/190|491/.test(s.label.replace(nom190, "").replace(nom491, ""))) fail(`${tag} -- nomination combo without a subclass qualifier`);
      const partnerItems = singles.filter((p) => p.exclusiveGroup === "partner" && s.label.includes(p.label));
      if (partnerItems.length > 1) fail(`${tag} sums both partner options`);
      for (const c of conditionals) if (s.label.includes(c)) fail(`${tag} -- includes the conditional line "${c}"`);
    }
  }
}

console.log(`  checked ${checked} combined scenarios across ${variants.length} personas x 3 locales`);
console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
process.exitCode = failures === 0 ? 0 : 1;
