/**
 * src/data/health-registration/anmac-fees.json (scripts/generate-anmac-fees.ts).
 *
 *   1. Drift: regenerates the file from the source PDF with the real generator and diffs it against the committed
 *      version -- fails if they differ. The source lives in data/knowledge, which is gitignored, so this part runs
 *      wherever that folder exists (a maintainer's checkout) and reports SKIPPED elsewhere (CI).
 *   2. Committed-file invariants (always, including CI): the four stated fees with their pages and quotes, the
 *      stated 6–8 week wait, the NMBA application/registration fees kept unpriced ("needs human verification"), and
 *      the occupation mapping in lib/health-registration/anmac-fees.ts for all 15 ANMAC occupations.
 */
import { existsSync, readFileSync } from "node:fs";

import data from "../src/data/health-registration/anmac-fees.json";
import { ANMAC_OUT_FILE, ANMAC_SOURCE_DOCUMENT, buildAnmacFees, serialize } from "./generate-anmac-fees";
import { FULL_SKILLS_ASSESSMENT_CODES, resolveAnmacAssessment, UNMAPPED_CODES } from "../lib/health-registration/anmac-fees";
import { anmacAuthority } from "../lib/skills-assessment/authorities/anmac";

let failures = 0;
const ok = (m: string) => console.log(`  ✅ ${m}`);
const fail = (m: string) => {
  failures++;
  console.error(`  ❌ ${m}`);
};

async function main() {
  console.log("==================== (1) drift: committed JSON vs a fresh parse of the source PDF ====================");
  if (!existsSync(ANMAC_SOURCE_DOCUMENT)) {
    console.log(`  SKIPPED: ${ANMAC_SOURCE_DOCUMENT} not present (data/knowledge is gitignored)`);
  } else {
    const committed = readFileSync(ANMAC_OUT_FILE, "utf8").replace(/\r\n/g, "\n");
    if (committed === serialize(await buildAnmacFees())) ok(`${ANMAC_OUT_FILE} matches the generator's output`);
    else fail(`${ANMAC_OUT_FILE} drifted from the generator's output -- run: npx tsx scripts/generate-anmac-fees.ts`);
  }

  console.log("\n==================== (2) committed-file invariants ====================");
  const expected: Record<string, { amount: number; page: number; quoteHas: string; wait: boolean }> = {
    anmac_full_skills_assessment: { amount: 595, page: 26, quoteHas: "Fee: $595 AUD", wait: true },
    anmac_direct_care_skills_assessment: { amount: 545, page: 33, quoteHas: "Fee: $545 AUD", wait: true },
    anmac_modified_skills_assessment: { amount: 395, page: 37, quoteHas: "Fee: $395 AUD", wait: true },
    nmba_iqnm_assessment_fee: { amount: 410, page: 20, quoteHas: "IQNM assessment fee (assessment and orientation) of $410", wait: false },
  };
  if (data.fees.length === 4) ok("4 stated fees");
  else fail(`${data.fees.length} fees (expected 4)`);
  for (const [id, e] of Object.entries(expected)) {
    const f = data.fees.find((x) => x.id === id);
    if (!f) { fail(`no fee "${id}"`); continue; }
    const w = f.waitTimeToStart;
    const waitOk = e.wait ? w?.minWeeks === 6 && w?.maxWeeks === 8 && w?.page === e.page : w === undefined;
    if (f.amountAud === e.amount && f.page === e.page && f.quote.includes(e.quoteHas) && waitOk) {
      ok(`${id}: AUD ${e.amount}, p.${e.page}, quote "${e.quoteHas}"${e.wait ? ", wait to start 6–8 weeks" : ""}`);
    } else fail(`${id}: ${JSON.stringify({ amount: f.amountAud, page: f.page, quote: f.quote, wait: w })}`);
  }
  const full = data.fees.find((x) => x.id === "anmac_full_skills_assessment")!;
  const countries = full.eligibility?.nursing?.registeredIn ?? [];
  if (countries.join("|") === "Canada|Hong Kong|Ireland|Singapore|Spain|United Kingdom|United States") ok("Full skills assessment: the 7 registration countries");
  else fail(`Full skills assessment countries: ${countries.join(", ")}`);
  const direct = data.fees.find((x) => x.id === "anmac_direct_care_skills_assessment")!;
  if (direct.occupations?.map((o) => o.anzscoCode).join("|") === "423312|423313") ok("Direct care skills assessment: ANZSCO 423312 / 423313 only");
  else fail(`Direct care occupations: ${JSON.stringify(direct.occupations)}`);

  const ids = data.notStated.map((f) => f.id).join("|");
  if (ids === "nmba_international_application_fee|nmba_international_registration_fee" && data.notStated.every((f) => f.status === "needs human verification" && !/\$\s*\d|AUD\s*\d/.test(f.item))) {
    ok('NMBA international application + registration fees: named, no amount, "needs human verification"');
  } else fail(`notStated wrong: ${JSON.stringify(data.notStated)}`);
  if (data.effectiveDate === null) ok("no effective date (the document states none)");
  else fail(`effectiveDate is ${data.effectiveDate}`);

  // Occupation mapping: all 15 ANMAC occupations are either Full (AUD 595) or explicitly unmapped.
  const codes = anmacAuthority.occupations.map((o) => o.anzscoCode!);
  const unmapped = codes.filter((c) => !FULL_SKILLS_ASSESSMENT_CODES.has(c));
  if (codes.length === 15 && unmapped.join("|") === "411411" && Object.keys(UNMAPPED_CODES).join("|") === "411411") ok("15 ANMAC occupations: 14 -> Full skills assessment, 411411 Enrolled Nurse -> needs human verification");
  else fail(`mapping: ${codes.length} occupations, unmapped ${unmapped.join(", ")}`);
  const stray = [...FULL_SKILLS_ASSESSMENT_CODES].filter((c) => !codes.includes(c));
  if (stray.length === 0) ok("every Full-mapped code is an ANMAC occupation");
  else fail(`Full-mapped codes that are not ANMAC occupations: ${stray.join(", ")}`);
  for (const code of codes) {
    const overseas = resolveAnmacAssessment({ anzscoCode: code });
    const au = resolveAnmacAssessment({ anzscoCode: code, qualificationAwardedInAustralia: true });
    if (au.fee?.amountAud !== 395) fail(`${code} AU-qualified should be Modified AUD 395, got ${au.fee?.amountAud}`);
    if (code === "411411" ? overseas.fee !== undefined : overseas.fee?.amountAud !== 595) fail(`${code} overseas resolved to ${overseas.assessmentId} ${overseas.fee?.amountAud}`);
  }
  if (anmacAuthority.pathways.every((p) => p.fees.every((f) => f.amountAUD !== 1000 && !f.estimated) && !p.processingTimeWeeks)) ok("registry: no AUD 1,000 / estimated fee, no unstated processing time");
  else fail("registry still carries a placeholder fee or processing time");

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
