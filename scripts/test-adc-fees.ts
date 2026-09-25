/**
 * src/data/skills-assessment/adc-fees.json (scripts/generate-adc-fees.ts) -- the ADC document states no fee amount.
 *
 *   1. Drift: regenerates the file from the source PDF and diffs it (SKIPPED where data/knowledge is absent, i.e. CI).
 *      The generator itself fails if the document ever states an amount, so an updated fee schedule is noticed.
 *   2. Committed-file invariants (always): no amounts stated; the skills assessment and reissue fees kept as "needs
 *      human verification"; the "no additional charge" statement; scope "dentists and dental specialists"; adc.ts
 *      carrying no invented amount and no longer listing 411215 Oral Health Therapist. Also CASA (same pass of the
 *      skills-assessment documents): "around 14 days" and pilots only -- 231113 Flying Instructor is VETASSESS.
 */
import { existsSync, readFileSync } from "node:fs";

import data from "../src/data/skills-assessment/adc-fees.json";
import { ADC_OUT_FILE, ADC_SOURCE_DOCUMENT, buildAdcFees, serialize } from "./generate-adc-fees";
import { adcAuthority } from "../lib/skills-assessment/authorities/adc";
import { casaAustraliaAuthority } from "../lib/skills-assessment/authorities/casa-australia";
import { getSkillsAssessmentAuthority } from "../lib/skills-assessment";

let failures = 0;
const ok = (m: string) => console.log(`  ✅ ${m}`);
const fail = (m: string) => {
  failures++;
  console.error(`  ❌ ${m}`);
};

async function main() {
  console.log("==================== (1) drift: committed JSON vs a fresh parse of the source PDF ====================");
  if (!existsSync(ADC_SOURCE_DOCUMENT)) {
    console.log(`  SKIPPED: ${ADC_SOURCE_DOCUMENT} not present (data/knowledge is gitignored)`);
  } else {
    const committed = readFileSync(ADC_OUT_FILE, "utf8").replace(/\r\n/g, "\n");
    if (committed === serialize(await buildAdcFees())) ok(`${ADC_OUT_FILE} matches the generator's output (the document still states no amount)`);
    else fail(`${ADC_OUT_FILE} drifted from the generator's output -- run: npx tsx scripts/generate-adc-fees.ts`);
  }

  console.log("\n==================== (2) committed-file invariants ====================");
  if (data.amountsStated === false && data.processingTimeStated === false) ok("ADC document: no fee amount, no processing time");
  else fail("amountsStated / processingTimeStated should be false");
  const ids = data.notStated.map((n) => `${n.id}@p.${n.page}`).join(", ");
  if (ids === "adc_skills_assessment_fee@p.2, adc_reissue_fee@p.3" && data.notStated.every((n) => n.status === "needs human verification")) ok(`unpriced: ${ids} -- needs human verification`);
  else fail(`notStated: ${ids}`);
  const free = data.fees.find((f) => f.id === "adc_skills_assessment_after_dpa");
  if (free?.amountAud === 0 && free.page === 1 && /There is no additional charge for this service\./.test(free.quote)) ok("skills assessment after the dental practitioner process: no additional charge (p.1)");
  else fail(`after-DPA: ${JSON.stringify(free)}`);
  if (data.scope.page === 2 && data.scope.quote === "We only conduct skills assessments for dentists and dental specialists.") ok("scope: dentists and dental specialists (p.2)");
  else fail(`scope: ${JSON.stringify(data.scope)}`);

  const adcFigures = adcAuthority.pathways.flatMap((p) => p.fees.map((f) => f.amountAUD)).filter((v) => v !== undefined);
  if (adcFigures.every((v) => v === 0)) ok("adc.ts: no invented amount (only the stated no-charge 0)");
  else fail(`adc.ts amounts: ${adcFigures.join(", ")}`);
  const adcCodes = adcAuthority.occupations.map((o) => o.anzscoCode).sort().join();
  if (adcCodes === "252311,252312" && getSkillsAssessmentAuthority("411215")?.authorityId !== "ADC") ok("adc.ts: 252311 Dental Specialist, 252312 Dentist; 411215 Oral Health Therapist removed");
  else fail(`adc.ts occupations: ${adcCodes}`);

  const casa = casaAustraliaAuthority.pathways[0].processingTimeWeeks;
  const casaLabel = casa?.label && typeof casa.label !== "string" ? casa.label.en : casa?.label;
  if (casaLabel === "around 14 days" && casa?.standard === 2) ok('CASA: "around 14 days" (CASA p.2)');
  else fail(`CASA processing: ${JSON.stringify(casa)}`);
  const casaCodes = casaAustraliaAuthority.occupations.map((o) => o.anzscoCode).sort().join();
  if (casaCodes === "231111,231114" && getSkillsAssessmentAuthority("231113")?.authorityId === "VETASSESS") ok("CASA: 231111, 231114; 231113 Flying Instructor -> VETASSESS (Home Affairs)");
  else fail(`CASA occupations ${casaCodes}; 231113 -> ${getSkillsAssessmentAuthority("231113")?.authorityId}`);

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
