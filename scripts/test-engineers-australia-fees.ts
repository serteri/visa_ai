/**
 * src/data/skills-assessment/engineers-australia-fees.json (scripts/generate-engineers-australia-fees.ts).
 *
 *   1. Drift: regenerates the file from the source PDF with the real generator and diffs it against the committed
 *      version. The source lives in data/knowledge (gitignored), so this part reports SKIPPED where it is absent (CI).
 *   2. Committed-file invariants (always): the 20 rows (12 pathway fees, 8 additional services) with excl./incl. GST
 *      amounts and pages; the fee period; processing stated only as time to an assessor; GST applicability unpriced;
 *      the registry's pathway fees = these rows; the report's figure (CDR; manager CDR + skilled employment); and the
 *      Home Affairs occupation moves (5 added, 313213/313214 in, 312312/312412/312512 out to TRA).
 */
import { existsSync, readFileSync } from "node:fs";

import data from "../src/data/skills-assessment/engineers-australia-fees.json";
import { EA_OUT_FILE, EA_SOURCE_DOCUMENT, buildEngineersAustraliaFees, serialize } from "./generate-engineers-australia-fees";
import { engineersAustraliaAuthority } from "../lib/skills-assessment/authorities/engineers-australia";
import { traAustraliaAuthority } from "../lib/skills-assessment/authorities/tra-australia";
import { resolveEngineersAustraliaAssessment } from "../lib/skills-assessment/engineers-australia-fees";
import { resolveAssessingAuthority } from "../lib/skills-assessment/resolve-authority";

let failures = 0;
const ok = (m: string) => console.log(`  ✅ ${m}`);
const fail = (m: string) => {
  failures++;
  console.error(`  ❌ ${m}`);
};

async function main() {
  console.log("==================== (1) drift: committed JSON vs a fresh parse of the source PDF ====================");
  if (!existsSync(EA_SOURCE_DOCUMENT)) {
    console.log(`  SKIPPED: ${EA_SOURCE_DOCUMENT} not present (data/knowledge is gitignored)`);
  } else {
    const committed = readFileSync(EA_OUT_FILE, "utf8").replace(/\r\n/g, "\n");
    if (committed === serialize(await buildEngineersAustraliaFees())) ok(`${EA_OUT_FILE} matches the generator's output`);
    else fail(`${EA_OUT_FILE} drifted from the generator's output -- run: npx tsx scripts/generate-engineers-australia-fees.ts`);
  }

  console.log("\n==================== (2) committed-file invariants ====================");
  // [excl. GST, incl. GST, page]
  const expected: Record<string, [number, number, number]> = {
    ea_accord: [505, 555.5, 8], ea_accord_rse: [940, 1034, 8], ea_accord_phd: [780, 858, 8], ea_accord_rse_phd: [1215, 1336.5, 8],
    ea_australian: [315, 346.5, 8], ea_australian_rse: [750, 825, 8], ea_australian_phd: [590, 649, 8], ea_australian_rse_phd: [1025, 1127.5, 8],
    ea_cdr: [940, 1034, 9], ea_cdr_rse: [1375, 1512.5, 9], ea_cdr_phd: [1215, 1336.5, 9], ea_cdr_rse_phd: [1650, 1815, 9],
    ea_fast_track: [360, 396, 10], ea_separate_rse: [485, 533.5, 10], ea_separate_phd: [325, 357.5, 10], ea_separate_rse_phd: [760, 836, 10],
    ea_review: [335, 368.5, 10], ea_appeal: [640, 704, 10], ea_updated_outcome_letter: [165, 181.5, 10], ea_administration: [130, 143, 10],
  };
  const before = failures;
  if (data.fees.map((f) => f.id).join("|") !== Object.keys(expected).join("|")) fail(`rows: ${data.fees.map((f) => f.id).join(", ")}`);
  for (const [id, [excl, incl, page]] of Object.entries(expected)) {
    const f = data.fees.find((x) => x.id === id);
    if (!f || f.feeExclGstAud !== excl || f.feeInclGstAud !== incl || f.page !== page || !f.quote.startsWith(f.item)) fail(`${id}: ${JSON.stringify(f && { excl: f.feeExclGstAud, incl: f.feeInclGstAud, page: f.page, quote: f.quote })}`);
  }
  if (failures === before) ok("20 rows: 12 pathway fees (Accord / Australian / CDR x 4 combinations) + 8 additional services, excl. and incl. GST, pp.8-10");
  if (data.feePeriod.from === 2026 && data.feePeriod.to === 2027 && data.feePeriod.page === 7) ok("fee period 2026–2027 (p.7)");
  else fail(`fee period: ${JSON.stringify(data.feePeriod)}`);
  const p = data.processing;
  if (p.standardWeeksToAssessor === 15 && p.standardPage === 13 && p.fastTrackBusinessDaysToAssessor === 20 && p.fastTrackPage === 9) ok("processing: 15 weeks (p.13) / 20 business days fast track (p.9) -- to an assessor, not to an outcome");
  else fail(`processing: ${JSON.stringify(p)}`);
  if (data.notStated.some((n) => n.id === "ea_gst_applicability" && n.status === "needs human verification")) ok("which applicants pay GST: needs human verification (the document does not say)");
  else fail("GST applicability should be recorded as needs human verification");
  if (data.occupationalCategories.varyFees === false) ok("fees do not vary by occupational category");

  // Registry: each pathway carries its rows' excl. GST amounts.
  const pathwayRows: Record<string, string> = { AU_QUALIFICATION: "australian", WASHINGTON_ACCORD: "accord", SYDNEY_ACCORD: "accord", DUBLIN_ACCORD: "accord", CDR: "cdr" };
  for (const [pid, pathway] of Object.entries(pathwayRows)) {
    const reg = engineersAustraliaAuthority.pathways.find((x) => x.pathwayId === pid)?.fees.map((f) => f.amountAUD);
    const want = data.fees.filter((f) => f.pathway === pathway).map((f) => f.feeExclGstAud);
    if (JSON.stringify(reg) !== JSON.stringify(want)) fail(`engineers-australia.ts ${pid} fees ${JSON.stringify(reg)} != ${JSON.stringify(want)}`);
  }
  if (engineersAustraliaAuthority.pathways.every((x) => x.fees.every((f) => typeof f.amountAUD === "number"))) ok("engineers-australia.ts: every pathway fee is an extracted figure (no amountAUD: undefined)");
  else fail("engineers-australia.ts still has a fee without an amount");

  const civil = resolveEngineersAustraliaAssessment({ anzscoCode: "233211" });
  const manager = resolveEngineersAustraliaAssessment({ anzscoCode: "133211" });
  if (civil.fee.id === "ea_cdr" && civil.amountMin === 940 && civil.amountMax === 1034 && manager.fee.id === "ea_cdr_rse" && manager.amountMin === 1375 && manager.amountMax === 1512.5) ok("report: CDR AUD 940–1,034; Engineering Manager CDR + skilled employment AUD 1,375–1,512.50");
  else fail(`report figures: civil ${JSON.stringify(civil)}, manager ${JSON.stringify(manager)}`);

  // Home Affairs occupation moves.
  const eaCodes = new Set(engineersAustraliaAuthority.occupations.map((o) => o.anzscoCode));
  const traCodes = new Set(traAustraliaAuthority.occupations.map((o) => o.anzscoCode));
  const toEa = ["233215", "233513", "233611", "312999", "313212", "313213", "313214"];
  const toTra = ["312312", "312412", "312512"];
  const wrong = [
    ...toEa.filter((c) => !eaCodes.has(c) || traCodes.has(c) || resolveAssessingAuthority(c).authorityId !== "EA").map((c) => `${c} -> ${resolveAssessingAuthority(c).authorityId}`),
    ...toTra.filter((c) => !traCodes.has(c) || eaCodes.has(c) || resolveAssessingAuthority(c).authorityId !== "TRA").map((c) => `${c} -> ${resolveAssessingAuthority(c).authorityId}`),
  ];
  if (wrong.length === 0) ok(`${toEa.join(", ")} -> EA; ${toTra.join(", ")} -> TRA (Home Affairs skilled occupation list)`);
  else fail(`occupation moves: ${wrong.join("; ")}`);

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
