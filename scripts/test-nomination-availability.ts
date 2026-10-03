/**
 * 190 / 491 friction includes nomination availability (lib/readiness/pathway-scores.ts frictionWithAvailability):
 * the states where the occupation is on that subclass's list AND the program is open for the applicant's location.
 * None -> at least HIGH and the reality check says so plainly; one or two -> never LOW; points met -> "Points are not
 * your barrier for 491; securing a nomination is." with the open states named. The pathway ranking is unchanged
 * (still rankPathways over the points-only PathwayScoreSet).
 *
 *   npx tsx scripts/test-nomination-availability.ts
 */
import type { ReadinessInput } from "../lib/readiness/types";
import { frictionFromScore, frictionWithAvailability } from "../lib/readiness/pathway-scores";
import { rankPathways } from "../lib/readiness/pathway-ranking";
import { runReadinessEngine } from "../src/lib/readiness-engine";

let failures = 0;
const ok = (m: string) => console.log(`  ✅ ${m}`);
const fail = (m: string) => {
  failures++;
  console.error(`  ❌ ${m}`);
};

const real: ReadinessInput = {
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
const RANK = ["LOW", "MEDIUM", "HIGH", "EXTREME"];

const personas: Array<{ name: string; input: ReadinessInput; expect: Record<"190" | "491", string[]> }> = [
  // In Australia: WA and ACT lists; TAS through the national list, open onshore only. WA is out for 190 (no WA job offer
  // recorded: its General stream needs a six-month WA employment contract) but stays available for 491.
  { name: "report b0d20f74 inputs (onshore)", input: real, expect: { "190": ["TAS", "ACT"], "491": ["WA", "TAS", "ACT"] } },
  // Offshore: TAS's program is onshore-only for this applicant.
  { name: "offshore Software Engineer", input: { ...real, currentCountry: "IN", passportCountry: "IN" }, expect: { "190": ["ACT"], "491": ["WA", "ACT"] } },
  // Business Machine Mechanic 342311, offshore: on NT's list (closed) and the national list (TAS onshore-only, VIC closed).
  { name: "occupation on no open state's list", input: { ...real, currentCountry: "Turkey", occupation: "Business Machine Mechanic 342311", occupationConfirmed: "yes" }, expect: { "190": [], "491": [] } },
];

for (const p of personas) {
  for (const locale of ["en", "tr", "zh-Hans"] as const) {
    const report = runReadinessEngine({ ...p.input, locale });
    const tracker = report.stateNominationTracker!;
    const avail = tracker.nominationAvailability;
    const tag = `${p.name} [${locale}]`;
    if (!avail || JSON.stringify(avail) !== JSON.stringify(p.expect)) {
      fail(`${tag}: availability ${JSON.stringify(avail)} != ${JSON.stringify(p.expect)}`);
      continue;
    }
    for (const sub of ["190", "491"] as const) {
      const open = avail[sub];
      const score = report.pathwayScores![sub];
      const fa = report.frictionAnalysis.find((f) => f.pathway === sub);
      const ps = report.pathwayStrengthComparison.find((x) => x.subclass === sub);
      const level = fa?.frictionScore ?? "";
      const expected = frictionWithAvailability(score, open);
      const floorOk = open.length === 0 ? RANK.indexOf(level) >= RANK.indexOf("HIGH") : open.length <= 2 ? level !== "LOW" : true;
      const sameInStrength = ps?.friction === expected.toLowerCase();
      const text = fa?.realityCheck ?? "";
      const names = open.every((c) => text.includes(c));
      const plain =
        open.length === 0
          ? /No state or territory currently has your occupation|hiçbir eyalet veya bölge|没有任何州或领地/.test(text)
          : (score.comparisonGap ?? 1) <= 0
            ? /Points are not your barrier|engeliniz puan değil|障碍不在分数/.test(text)
            : /Currently open for your occupation|açık olanlar|开放/.test(text);
      if (level === expected && floorOk && sameInStrength && names && plain) {
        ok(`${tag} ${sub}: ${open.length} open (${open.join(", ") || "none"}) -> ${level} (points alone: ${frictionFromScore(score)})`);
      } else {
        fail(`${tag} ${sub}: level ${level} (expected ${expected}), strength ${ps?.friction}, floorOk ${floorOk}, names ${names}, plain ${plain}; "${text.slice(0, 200)}"`);
      }
    }
    // Ranking unchanged: exactly the points-only ranking.
    const expectedRanking = rankPathways(report.pathwayScores!).entries.map((e) => `${e.subclass}:${e.fit}`);
    const actual = report.pathwayRanking!.entries.map((e) => `${e.subclass}:${e.fit}`);
    if (JSON.stringify(expectedRanking) === JSON.stringify(actual)) ok(`${tag}: pathway ranking unchanged (${actual.join(" > ")})`);
    else fail(`${tag}: ranking ${actual} != ${expectedRanking}`);
  }
}

console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
process.exitCode = failures === 0 ? 0 : 1;
