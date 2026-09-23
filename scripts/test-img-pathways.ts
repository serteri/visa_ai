/**
 * src/data/health-registration/img-pathways.json + provenance.json (scripts/generate-img-pathways.ts).
 *
 *   1. Drift: regenerates both files from the source PDF with the real generator and diffs them against the
 *      committed versions -- fails if they differ. The source lives in data/knowledge, which is gitignored, so
 *      this part runs wherever that folder exists (a maintainer's checkout) and reports SKIPPED elsewhere (CI).
 *   2. Committed-file invariants (always, including CI): the fee schedule's shape and arithmetic, that no
 *      deferred AMC / ECFMG / college fee carries an amount, that provenance covers every extracted item, and
 *      that the report helper resolves GP 253111 to the Medical Board fees it quotes.
 */
import { existsSync } from "node:fs";

import data from "../src/data/health-registration/img-pathways.json";
import provenance from "../src/data/health-registration/provenance.json";
import { buildImgPathways, buildProvenance, OUT_FILE, PROVENANCE_FILE, serialize, SOURCE_DOCUMENT } from "./generate-img-pathways";
import { AMC_OUT_FILE, AMC_SOURCE_DOCUMENT, buildAmcFees } from "./generate-amc-fees";
import amcFees from "../src/data/health-registration/amc-fees.json";
import { EXPEDITED_SPECIALTIES, resolveMedicalRegistration } from "../lib/health-registration/img-pathways";
import { readFileSync } from "node:fs";

let failures = 0;
const ok = (m: string) => console.log(`  ✅ ${m}`);
const fail = (m: string) => {
  failures++;
  console.error(`  ❌ ${m}`);
};

async function main() {
  console.log("==================== (1) drift: committed JSON vs a fresh parse of the source PDF ====================");
  if (!existsSync(SOURCE_DOCUMENT)) {
    console.log(`  SKIPPED: ${SOURCE_DOCUMENT} not present (data/knowledge is gitignored)`);
  } else {
    const extracted = await buildImgPathways();
    for (const [file, fresh] of [
      [OUT_FILE, serialize(extracted)],
      [PROVENANCE_FILE, serialize(buildProvenance(extracted))],
    ] as const) {
      const committed = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
      if (committed === fresh) ok(`${file} matches the generator's output`);
      else fail(`${file} drifted from the generator's output -- run: npx tsx scripts/generate-img-pathways.ts`);
    }
  }

  if (!existsSync(AMC_SOURCE_DOCUMENT)) {
    console.log(`  SKIPPED: ${AMC_SOURCE_DOCUMENT} not present (data/knowledge is gitignored)`);
  } else {
    const committed = readFileSync(AMC_OUT_FILE, "utf8").replace(/\r\n/g, "\n");
    if (committed === serialize(await buildAmcFees())) ok(`${AMC_OUT_FILE} matches the generator's output`);
    else fail(`${AMC_OUT_FILE} drifted from the generator's output -- run: npx tsx scripts/generate-amc-fees.ts`);
  }

  console.log("\n==================== (2) committed-file invariants ====================");
  const ids = data.pathways.map((p) => p.id);
  const expectedIds = ["competent-authority", "standard", "expedited-specialist", "specialist-recognition", "specialist-area-of-need", "short-term-training", "au-nz-graduates-overseas-specialist"];
  if (JSON.stringify(ids) === JSON.stringify(expectedIds)) ok(`7 pathways: ${ids.join(", ")}`);
  else fail(`pathway ids ${ids.join(", ")} != ${expectedIds.join(", ")}`);

  const schedule = data.ahpraFeeSchedule;
  if (schedule.effectiveDate === "1 August 2026") ok(`fee schedule effective date "${schedule.effectiveDate}"`);
  else fail(`fee schedule effective date is "${schedule.effectiveDate}"`);
  if (schedule.items.length === 28) ok("28 fee-schedule rows");
  else fail(`${schedule.items.length} fee-schedule rows (expected 28)`);
  const badMath = schedule.items.filter((r) => r.nationalFeeAud - r.nswRebateOrSurchargeAud !== r.nswFeeAud);
  if (badMath.length === 0) ok("every row: national fee - NSW rebate = NSW fee");
  else fail(`rows that do not add up: ${badMath.map((r) => r.item).join("; ")}`);

  for (const p of data.pathways) {
    if (!p.fees.items.some((f) => f.organisation === "Ahpra / Medical Board of Australia")) fail(`${p.id}: no Ahpra / Medical Board fee statement`);
    if (p.processBeforeRegistration.blocks.filter((b) => b.kind === "bullet").length < 3) fail(`${p.id}: fewer than 3 process steps`);
  }
  const priced = data.unresolvedFees.filter((f) => /\$\s*\d|AUD\s*\d|\d[\d,]{2,}/.test(f.text));
  if (priced.length === 0 && data.unresolvedFees.every((f) => f.status === "needs human verification")) {
    ok(`${data.unresolvedFees.length} deferred AMC / ECFMG / college / CPD / assessment fees: no amounts, all "needs human verification"`);
  } else fail(`deferred fees with a number or wrong status: ${priced.map((f) => f.text).join(" | ")}`);

  const facts = provenance.facts;
  const want = schedule.items.length + data.pathways.length + data.unresolvedFees.length;
  if (facts.length === want && facts.every((f) => typeof f.source === "string" && f.source.includes(data.sourceDocument))) {
    ok(`provenance: ${facts.length} facts, each citing ${data.sourceDocument.split("/").pop()}`);
  } else fail(`provenance has ${facts.length} facts (expected ${want}) or a fact without the source document`);

  if (EXPEDITED_SPECIALTIES.includes("general practice")) ok(`Expedited Specialist list (${EXPEDITED_SPECIALTIES.length}) includes general practice`);
  else fail(`Expedited Specialist list lost "general practice": ${EXPEDITED_SPECIALTIES.join(", ")}`);
  const gp = resolveMedicalRegistration({ anzscoCode: "253111" });
  if (gp.pathwayId === "expedited-specialist" && gp.applicationFee.nationalFeeAud === 1661 && gp.registrationFee.nationalFeeAud === 1102 && gp.totalAud === 2763) {
    ok("GP 253111 -> Expedited Specialist pathway, specialist registration AUD 1,661 + AUD 1,102 = AUD 2,763");
  } else fail(`GP 253111 resolved to ${gp.pathwayId} AUD ${gp.applicationFee.nationalFeeAud} + ${gp.registrationFee.nationalFeeAud}`);

  // AMC (amc-fees.json): only the clinical examination is priced; the rest stays "not stated".
  const inPerson = amcFees.fees.find((f) => f.id === "amc_clinical_exam_in_person");
  const online = amcFees.fees.find((f) => f.id === "amc_clinical_exam_online");
  if (inPerson?.amountAud === 3000 && online?.amountAud === 3400 && inPerson.quote.includes("$3,000") && online.quote.includes("$3,400")) {
    ok("AMC clinical examination: AUD 3,000 in person / AUD 3,400 online, each with its quote");
  } else fail(`AMC clinical examination fees wrong: ${JSON.stringify(amcFees.fees)}`);
  if (amcFees.effectiveDate === null && amcFees.notStated.length === 3 && amcFees.notStated.every((f) => f.status === "needs human verification")) {
    ok("AMC candidate account/PSV, CAT MCQ and WBA fees: not stated, needs human verification; no effective date");
  } else fail("AMC not-stated fees / effective date wrong");
  const rmo = resolveMedicalRegistration({ anzscoCode: "253112" });
  if (rmo.pathwayId === "standard" && rmo.totalMinAud === 1131 + 1102 + 3000 && rmo.totalMaxAud === 1131 + 1102 + 3400) {
    ok("RMO 253112 (Standard pathway): Medical Board AUD 2,233 + AMC clinical exam AUD 3,000-3,400 = AUD 5,233-5,633");
  } else fail(`RMO 253112 totals wrong: ${rmo.pathwayId} ${rmo.totalMinAud}-${rmo.totalMaxAud}`);
  if (gp.amcClinicalExam === undefined && gp.totalMinAud === 2763 && gp.totalMaxAud === 2763) ok("GP 253111: no AMC exam fee added (Expedited Specialist pathway), total unchanged at AUD 2,763");
  else fail("GP 253111 picked up an AMC exam fee it does not pay");

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
