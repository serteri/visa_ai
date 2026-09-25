/**
 * src/data/skills-assessment/caanz-fees.json (scripts/generate-caanz-fees.ts).
 *
 *   1. Drift: regenerates the file from CA ANZ's source PDF with the real generator and diffs it against the committed
 *      version -- fails if they differ. The source lives in data/knowledge, which is gitignored, so this part runs
 *      wherever that folder exists (a maintainer's checkout) and reports SKIPPED elsewhere (CI).
 *   2. Committed-file invariants (always, including CI): the 12 fee-table rows with their amounts, previous amounts,
 *      processing times, pages and quotes; the 1 July 2026 effective date; no location variants; the six occupations
 *      (= the registry's); and lib/skills-assessment/authorities/caanz.ts carrying only these figures -- none of the
 *      CPA Australia figures it used to copy, no "22 pages" citation.
 */
import { existsSync, readFileSync } from "node:fs";

import data from "../src/data/skills-assessment/caanz-fees.json";
import { CAANZ_OUT_FILE, CAANZ_SOURCE_DOCUMENT, buildCaanzFees, serialize } from "./generate-caanz-fees";
import { caanzAuthority } from "../lib/skills-assessment/authorities/caanz";
import { getAuthorityById, getDefaultPathway, getSkillsAssessmentAuthority, selectPrimaryFee } from "../lib/skills-assessment";

let failures = 0;
const ok = (m: string) => console.log(`  ✅ ${m}`);
const fail = (m: string) => {
  failures++;
  console.error(`  ❌ ${m}`);
};

async function main() {
  console.log("==================== (1) drift: committed JSON vs a fresh parse of the source PDF ====================");
  if (!existsSync(CAANZ_SOURCE_DOCUMENT)) {
    console.log(`  SKIPPED: ${CAANZ_SOURCE_DOCUMENT} not present (data/knowledge is gitignored)`);
  } else {
    const committed = readFileSync(CAANZ_OUT_FILE, "utf8").replace(/\r\n/g, "\n");
    if (committed === serialize(await buildCaanzFees())) ok(`${CAANZ_OUT_FILE} matches the generator's output`);
    else fail(`${CAANZ_OUT_FILE} drifted from the generator's output -- run: npx tsx scripts/generate-caanz-fees.ts`);
  }

  console.log("\n==================== (2) committed-file invariants ====================");
  // [previous, from 1 July 2026, business days, page]
  const expected: Record<string, [number, number, number, number]> = {
    caanz_qualification_standard: [560, 565, 10, 45],
    caanz_qualification_express: [660, 665, 5, 45],
    caanz_skilled_employment_standard: [260, 265, 15, 45],
    caanz_skilled_employment_express: [360, 365, 10, 46],
    caanz_combined: [620, 625, 20, 46],
    caanz_reassessment_single: [180, 185, 10, 46],
    caanz_reassessment_both: [360, 365, 15, 47],
    caanz_internal_review_single: [180, 185, 10, 47],
    caanz_internal_review_both: [360, 365, 15, 47],
    caanz_external_appeal_single: [180, 185, 10, 48],
    caanz_external_appeal_both: [360, 365, 15, 48],
    caanz_withdrawal: [90, 95, 2, 49],
  };
  if (data.fees.map((f) => f.id).join("|") === Object.keys(expected).join("|")) ok("12 fee-table rows, in document order");
  else fail(`rows: ${data.fees.map((f) => f.id).join(", ")}`);
  for (const [id, [prev, amount, days, page]] of Object.entries(expected)) {
    const f = data.fees.find((x) => x.id === id);
    if (!f) { fail(`no fee "${id}"`); continue; }
    const quoteOk = f.quote.includes(`$${prev} $${amount} ${days} business days`);
    if (f.previousAmountAud === prev && f.amountAud === amount && f.processingBusinessDays === days && f.page === page && quoteOk) continue;
    fail(`${id}: ${JSON.stringify({ prev: f.previousAmountAud, amount: f.amountAud, days: f.processingBusinessDays, page: f.page, quote: f.quote })}`);
  }
  if (failures === 0) ok("every row: previous fee, fee from 1 July 2026, business days, page and quote as stated");
  if (data.effectiveDate === "2026-07-01" && data.effectiveDateSource.page === 44 && /From 1 July 2026/.test(data.effectiveDateSource.quote)) ok("effective 1 July 2026 (p.44)");
  else fail(`effective date: ${JSON.stringify(data.effectiveDateSource)}`);
  if (data.locationVariants.stated === false) ok("no onshore / offshore / Singapore variants (the document states one AUD fee per type)");
  else fail("locationVariants.stated should be false");

  const codes = data.occupations.list.map((o) => o.anzscoCode).sort();
  const registryCodes = caanzAuthority.occupations.map((o) => o.anzscoCode!).sort();
  if (codes.join("|") === "132211|221111|221112|221113|221212|221213" && codes.join("|") === registryCodes.join("|")) ok("six occupations (p.3-4) = caanz.ts occupations");
  else fail(`occupations: document ${codes.join(", ")}; registry ${registryCodes.join(", ")}`);

  // Registry: only extracted figures, no copied CPA figures, no "22 pages".
  const extracted = new Set(data.fees.flatMap((f) => [f.amountAud, f.previousAmountAud]));
  const registryFigures = [
    ...caanzAuthority.pathways.flatMap((p) => p.fees.map((f) => f.amountAUD)),
    ...(caanzAuthority.feesSchedule ?? []).flatMap((r) => [r.currentFeeAUD, r.previousFeeAUD]),
  ];
  const stray = registryFigures.filter((v) => v === undefined || !extracted.has(v));
  if (stray.length === 0) ok(`caanz.ts: all ${registryFigures.length} fee figures come from caanz-fees.json`);
  else fail(`caanz.ts carries figures the CA ANZ document does not state: ${[...new Set(stray)].join(", ")}`);
  if ((caanzAuthority.feesSchedule ?? []).length === data.fees.length) ok("caanz.ts feesSchedule: one row per fee-table row");
  else fail(`feesSchedule has ${(caanzAuthority.feesSchedule ?? []).length} rows`);
  if (!/22 pages/.test(caanzAuthority.sourceDocument) && caanzAuthority.sourceDocument === data.sourceTitle) ok(`caanz.ts cites "${caanzAuthority.sourceDocument}"`);
  else fail(`caanz.ts sourceDocument: "${caanzAuthority.sourceDocument}"`);
  const q = caanzAuthority.pathways.find((p) => p.pathwayId === "qualification-assessment");
  if (q?.processingTimeWeeks?.standard === 2) ok("qualification assessment: 10 business days = 2 weeks");
  else fail(`qualification assessment processing: ${JSON.stringify(q?.processingTimeWeeks)}`);

  // What the report would quote if CA ANZ is the resolved authority: the engine's own selection.
  const authority = getAuthorityById("CA-ANZ");
  const pathway = getDefaultPathway(authority);
  const fee = pathway ? selectPrimaryFee(pathway, "IN") : undefined;
  if (fee?.amountAUD === 565 && typeof fee.note !== "string" && fee.note?.en.includes("p.45")) ok("report's CA ANZ fee: AUD 565 with \"10 business days; CA ANZ document p.45\", for any location");
  else fail(`report's CA ANZ fee: ${JSON.stringify(fee)}`);
  // For the record: which authority the report resolves for CA ANZ's six occupations (CPA Australia comes first in the
  // registry for all six -- a deliberate preference, not changed here).
  const resolved = [...new Set(codes.map((c) => getSkillsAssessmentAuthority(c)?.authorityId))];
  console.log(`  ℹ️  the report resolves CA ANZ's six occupations to: ${resolved.join(", ")}`);

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
