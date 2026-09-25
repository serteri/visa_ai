/**
 * src/data/skills-assessment/aims-fees.json (scripts/generate-aims-fees.ts).
 *
 *   1. Drift: regenerates the file from the source PDF and diffs it against the committed version (SKIPPED where
 *      data/knowledge is absent, i.e. CI).
 *   2. Committed-file invariants (always): the 14 fee-table rows (p.18-19) with outside-Australia (excl. GST) and
 *      within-Australia (incl. GST) amounts; the GST rule; processing (individual 6 months, employer 16 weeks); the
 *      unpriced Special Professional Examination; aims.ts carrying only these figures, tagged by location, with a
 *      pathway for each of 234611 / 311213 / 311216; 311213 and 311216 resolving to AIMS.
 */
import { existsSync, readFileSync } from "node:fs";

import data from "../src/data/skills-assessment/aims-fees.json";
import { AIMS_OUT_FILE, AIMS_SOURCE_DOCUMENT, buildAimsFees, serialize } from "./generate-aims-fees";
import { aimsAuthority } from "../lib/skills-assessment/authorities/aims";
import { vetassessAuthority } from "../lib/skills-assessment/authorities/vetassess";
import { getSkillsAssessmentAuthority, selectPrimaryFee } from "../lib/skills-assessment";

let failures = 0;
const ok = (m: string) => console.log(`  ✅ ${m}`);
const fail = (m: string) => {
  failures++;
  console.error(`  ❌ ${m}`);
};

async function main() {
  console.log("==================== (1) drift: committed JSON vs a fresh parse of the source PDF ====================");
  if (!existsSync(AIMS_SOURCE_DOCUMENT)) {
    console.log(`  SKIPPED: ${AIMS_SOURCE_DOCUMENT} not present (data/knowledge is gitignored)`);
  } else {
    const committed = readFileSync(AIMS_OUT_FILE, "utf8").replace(/\r\n/g, "\n");
    if (committed === serialize(await buildAimsFees())) ok(`${AIMS_OUT_FILE} matches the generator's output`);
    else fail(`${AIMS_OUT_FILE} drifted from the generator's output -- run: npx tsx scripts/generate-aims-fees.ts`);
  }

  console.log("\n==================== (2) committed-file invariants ====================");
  // [outside Australia excl. GST, within Australia incl. GST, page]; null = not stated for that column
  const expected: Record<string, [number | null, number | null, number]> = {
    aims_assessment_mls_mlt: [900, 990, 18], aims_assessment_ivf: [900, 990, 18], aims_assessment_pathology_collector: [900, 990, 18],
    aims_assessment_employer_requested: [null, null, 18], aims_amendment: [200, 220, 18], aims_appeal: [200, 220, 18],
    aims_reissue_lost_letter: [150, 165, 19], aims_exam_mls: [800, 880, 19], aims_exam_ivf: [800, 880, 19], aims_exam_pathology_collector: [800, 880, 19],
    aims_membership_exam_multi: [800, 880, 19], aims_membership_exam_discipline: [null, 880, 19], aims_membership_exam_remark: [150, 165, 19], aims_exam_deferral: [100, 110, 19],
  };
  const before = failures;
  if (data.fees.map((f) => f.id).join("|") !== Object.keys(expected).join("|")) fail(`rows: ${data.fees.map((f) => f.id).join(", ")}`);
  for (const [id, [out, within, page]] of Object.entries(expected)) {
    const f = data.fees.find((x) => x.id === id);
    if (!f || f.outsideAustraliaExclGstAud !== out || f.withinAustraliaInclGstAud !== within || f.page !== page) fail(`${id}: ${JSON.stringify(f)}`);
  }
  const employer = data.fees.find((f) => f.id === "aims_assessment_employer_requested");
  if (employer?.singleAmountAud !== 990) fail(`employer-requested single amount: ${employer?.singleAmountAud}`);
  if (failures === before) ok("14 rows, p.18-19: assessments 900 / 990 (employer-requested 990 only), amendment / appeal 200 / 220, reissue 150 / 165, exams 800 / 880, discipline-specific n/a / 880, remark 150 / 165, deferral 100 / 110");
  if (data.gstRule.page === 18 && /in Australia, the GST \(10%\) will apply/.test(data.gstRule.quote)) ok("GST rule: address in Australia -> GST (p.18)");
  else fail(`GST rule: ${JSON.stringify(data.gstRule)}`);
  if (data.processing.individual.months === 6 && data.processing.individual.pages.join() === "57,81" && data.processing.employerRequested.weeks === 16) ok("processing: individual within 6 months (pp.57, 81); employer-requested up to 16 weeks (p.8)");
  else fail(`processing: ${JSON.stringify(data.processing)}`);
  if (data.notStated.some((n) => n.id === "aims_special_professional_examination_fee")) ok("Special Professional Examination fee: needs human verification (not in the fee table)");

  // Registry.
  const extracted = new Set(data.fees.flatMap((f) => [f.outsideAustraliaExclGstAud, f.withinAustraliaInclGstAud]));
  const figures = aimsAuthority.pathways.flatMap((p) => p.fees.map((f) => f.amountAUD));
  const stray = figures.filter((v) => v !== undefined && !extracted.has(v));
  const undef = aimsAuthority.pathways.flatMap((p) => p.fees.filter((f) => f.amountAUD === undefined).map((f) => (typeof f.label === "string" ? f.label : f.label.en)));
  if (stray.length === 0 && undef.join() === "Special Professional Examination") ok("aims.ts: only extracted figures; the one unpriced fee is the Special Professional Examination");
  else fail(`aims.ts: stray ${stray.join(", ")}; unpriced ${undef.join(", ")}`);
  const codes = aimsAuthority.occupations.map((o) => o.anzscoCode).sort().join();
  const pathwayFor = (code: string) => aimsAuthority.pathways.find((p) => p.occupation?.includes(code));
  if (codes === "234611,311213,311216" && ["234611", "311213", "311216"].every((c) => pathwayFor(c))) ok("aims.ts: 234611, 311213, 311216, each with a pathway");
  else fail(`aims.ts occupations ${codes}`);
  const pc = pathwayFor("311216")!;
  if (selectPrimaryFee(pc, "IN")?.amountAUD === 900 && selectPrimaryFee(pc, "AU")?.amountAUD === 990) ok("report fee by location: outside Australia 900, within Australia 990");
  else fail("report fee by location is wrong");

  // 311213: in both vetassess.ts and aims.ts; Home Affairs names AIMS.
  const both = vetassessAuthority.occupations.some((o) => o.anzscoCode === "311213");
  if (getSkillsAssessmentAuthority("311213")?.authorityId === "AIMS" && getSkillsAssessmentAuthority("311216")?.authorityId === "AIMS") ok(`311213 -> AIMS${both ? " (over vetassess.ts, which also lists it)" : ""}; 311216 -> AIMS`);
  else fail(`311213 -> ${getSkillsAssessmentAuthority("311213")?.authorityId}; 311216 -> ${getSkillsAssessmentAuthority("311216")?.authorityId}`);

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
