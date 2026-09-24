/**
 * Fee/threshold truth-audit -- provenance and duplicate-definition checks.
 *
 * (1) Fails if any fact in src/data/fee-provenance.json is missing
 *     source/last_verified metadata (a `value: null` / MISSING entry, like
 *     subclass 186's VAC, is exempt -- there is nothing to verify metadata
 *     for on a value that doesn't exist).
 * (2) Fails if two code locations that are supposed to define the SAME
 *     fact actually disagree -- this is the real regression guard: it
 *     would have caught the original AUD 4,640 vs 6,135/6,140 bug, and the
 *     flat 4,890-for-everyone second-instalment bug, before they shipped.
 *
 * Usage: npx tsx scripts/test-fee-provenance.ts
 */
import feeProvenance from "../src/data/fee-provenance.json";
import additionalApplicantVac from "../src/data/additional-applicant-vac.json";
import {
  buildAdditionalApplicantVac,
  serialize as serializeVac,
  SUBCLASS_DOCUMENTS,
  VAC_OUT_FILE,
} from "./generate-additional-applicant-vac";
import { existsSync, readFileSync } from "node:fs";
import visaFeesData from "../src/data/visa-fees.json";
import visaDetailsData from "../src/data/visa-details.json";
import {
  BASE_VAC_AUD,
  resolveAdditionalApplicantVac,
  SECOND_INSTALMENT_AUD,
  ENGLISH_TEST_VALIDITY_YEARS,
  CURRENT_CSIT,
} from "../lib/readiness/constants";
import * as readinessConstants from "../lib/readiness/constants";
import { acsAuthority } from "../lib/skills-assessment/authorities/acs";
import { anmacAuthority } from "../lib/skills-assessment/authorities/anmac";
import anmacFeesData from "../src/data/health-registration/anmac-fees.json";
import { listAuthorities } from "../lib/skills-assessment";
import { findAuthorityConflicts } from "../lib/skills-assessment/resolve-authority";

type Fact = {
  id: string;
  description: string;
  value: number | null;
  effective_from: string | null;
  last_verified: string | null;
  source: string | null;
  locations: string[];
};

const facts = (feeProvenance as { facts: Fact[] }).facts;
let failures = 0;

function fail(msg: string) {
  console.error(`  ❌ ${msg}`);
  failures++;
}
function ok(msg: string) {
  console.log(`  ✅ ${msg}`);
}

const unverifiedFacts: string[] = [];
console.log("==================== (1) provenance metadata completeness ====================");
for (const fact of facts) {
  if (fact.value === null) {
    // A verified fact with no dollar amount by design (e.g. "there is no minimum income requirement") carries
    // last_verified; a null value without it is a genuine gap.
    console.log(
      fact.last_verified
        ? `  ✅ ${fact.id}: verified ${fact.last_verified}, no dollar value by design -- ${fact.description}`
        : `  ⚠️  ${fact.id}: value is null (known gap: ${fact.source}) -- metadata check skipped`,
    );
    continue;
  }
  if (!fact.source || !fact.source.trim()) {
    fail(`${fact.id}: missing "source"`);
  } else if ((!fact.last_verified || !fact.last_verified.trim()) && fact.source.startsWith("needs human verification")) {
    // An honest "not verified yet": no date, and the source says so. It is reported, never counted as verified.
    console.log(`  ⚠️  ${fact.id}: UNVERIFIED (source: needs human verification, last_verified null) -- not treated as verified`);
    unverifiedFacts.push(fact.id);
  } else if (!fact.last_verified || !fact.last_verified.trim()) {
    fail(`${fact.id}: missing "last_verified"`);
  } else {
    const verified = fact.source.startsWith("needs human verification") ? " (unverified against an official source)" : "";
    ok(`${fact.id}: source + last_verified present${verified}`);
  }
}

console.log("\n==================== (2) duplicate-definition cross-checks ====================");

function findFact(id: string): Fact {
  const f = facts.find((x) => x.id === id);
  if (!f) throw new Error(`fee-provenance.json is missing a "${id}" entry`);
  return f;
}

function findVisaDetail(subclass: string): { fee?: number; secondInstalment?: { amount?: number } } | undefined {
  return (visaDetailsData as Array<{ subclass?: string; fee?: number; secondInstalment?: { amount?: number } }>).find(
    (v) => v.subclass === subclass
  );
}

const feesJson = visaFeesData as {
  visas: Record<string, { vac: { main: number; secondInstalmentEnglish?: number } }>;
};

function checkVac(subclass: string, factId: string) {
  const fact = findFact(factId);
  const constantVal = BASE_VAC_AUD[subclass];
  const jsonVal = feesJson.visas[subclass]?.vac.main;
  const detailVal = findVisaDetail(subclass)?.fee;
  const values = { manifest: fact.value, constants_ts: constantVal, visa_fees_json: jsonVal, visa_details_json: detailVal };
  const distinct = new Set(Object.values(values));
  if (distinct.size > 1) {
    fail(`VAC ${subclass} disagrees across sources: ${JSON.stringify(values)}`);
  } else {
    ok(`VAC ${subclass}: all sources agree (AUD ${constantVal}) -- ${JSON.stringify(values)}`);
  }
}

checkVac("189", "vac_189");
checkVac("190", "vac_190");
checkVac("491", "vac_491");
checkVac("482", "vac_482");

function checkSecondInstalment(subclass: string, factId: string) {
  const fact = findFact(factId);
  const constantVal = SECOND_INSTALMENT_AUD[subclass];
  const jsonVal = feesJson.visas[subclass]?.vac.secondInstalmentEnglish;
  const detailVal = findVisaDetail(subclass)?.secondInstalment?.amount;
  const values = { manifest: fact.value, constants_ts: constantVal, visa_fees_json: jsonVal, visa_details_json: detailVal };
  const distinct = new Set(Object.values(values));
  if (distinct.size > 1) {
    fail(`Second instalment ${subclass} disagrees across sources: ${JSON.stringify(values)}`);
  } else {
    ok(`Second instalment ${subclass}: all sources agree (AUD ${constantVal}) -- ${JSON.stringify(values)}`);
  }
}

checkSecondInstalment("189", "second_instalment_189_190");
checkSecondInstalment("190", "second_instalment_189_190");
checkSecondInstalment("491", "second_instalment_491");

// 491 -> 191 income requirement: the subclass 191 document says there is no minimum income (ATO notices of
// assessment for three income years instead) -- the manifest must say so, with no dollar value, and the old
// threshold constant must not come back.
{
  const fact = findFact("income_requirement_491_to_191");
  if (fact.value !== null) fail(`191 income requirement must carry no dollar value (got ${fact.value})`);
  else if (!/There is no minimum income requirement/.test(fact.source ?? "") || !/notices of assessment/.test(fact.source ?? "")) fail("191 income requirement source must quote the subclass 191 document");
  else if ("INCOME_THRESHOLD_491_TO_191_AUD" in readinessConstants) fail("INCOME_THRESHOLD_491_TO_191_AUD is back in constants.ts");
  else ok("191 income requirement: no minimum income, ATO notices of assessment (sourced), no threshold constant");
}

// English test validity: manifest vs constants.ts.
{
  const auFact = findFact("english_test_validity_au");
  const caFact = findFact("english_test_validity_ca");
  if (auFact.value !== ENGLISH_TEST_VALIDITY_YEARS.AU) {
    fail(`English validity AU disagrees: manifest=${auFact.value}, constants.ts=${ENGLISH_TEST_VALIDITY_YEARS.AU}`);
  } else {
    ok(`English validity AU: manifest and constants.ts agree (${ENGLISH_TEST_VALIDITY_YEARS.AU} years)`);
  }
  if (caFact.value !== ENGLISH_TEST_VALIDITY_YEARS.CA) {
    fail(`English validity CA disagrees: manifest=${caFact.value}, constants.ts=${ENGLISH_TEST_VALIDITY_YEARS.CA}`);
  } else {
    ok(`English validity CA: manifest and constants.ts agree (${ENGLISH_TEST_VALIDITY_YEARS.CA} years)`);
  }
}

// CSIT: manifest vs constants.ts.
{
  const fact = findFact("csit_current");
  if (fact.value !== CURRENT_CSIT.value) {
    fail(`CSIT disagrees: manifest=${fact.value}, constants.ts=${CURRENT_CSIT.value}`);
  } else {
    ok(`CSIT: manifest and constants.ts agree (AUD ${CURRENT_CSIT.value})`);
  }
}

// ACS General Skills Assessment fee: manifest vs the actual authority file.
{
  const fact = findFact("acs_general_skills_assessment_fee");
  const pathway = acsAuthority.pathways.find((p) => p.pathwayId === "GENERAL_SKILLS");
  const feeVal = pathway?.fees.find((f) => typeof f.amountAUD === "number")?.amountAUD;
  if (fact.value !== feeVal) {
    fail(`ACS General Skills Assessment fee disagrees: manifest=${fact.value}, acs.ts=${feeVal}`);
  } else {
    ok(`ACS General Skills Assessment fee: manifest and acs.ts agree (AUD ${feeVal})`);
  }
}

// ANMAC / NMBA nursing fees: manifest vs the extraction (src/data/health-registration/anmac-fees.json, from
// Anmac.pdf) vs the registry. Stated fees are dated and quote their page; the international application and
// registration fees are named in the document with no amount and must stay null / "needs human verification".
{
  const before = failures;
  const extraction = anmacFeesData as unknown as {
    sourceDocument: string;
    fees: Array<{ id: string; amountAud: number; page: number; quote: string }>;
    notStated: Array<{ id: string; status: string }>;
  };
  const STATED: Record<string, string> = {
    anmac_full_skills_assessment_fee: "anmac_full_skills_assessment",
    anmac_modified_skills_assessment_fee: "anmac_modified_skills_assessment",
    anmac_direct_care_skills_assessment_fee: "anmac_direct_care_skills_assessment",
    nmba_iqnm_assessment_fee: "nmba_iqnm_assessment_fee",
  };
  for (const [factId, feeId] of Object.entries(STATED)) {
    const fact = findFact(factId);
    const fee = extraction.fees.find((f) => f.id === feeId);
    if (!fee) { fail(`anmac-fees.json has no "${feeId}"`); continue; }
    if (fact.value !== fee.amountAud) fail(`${factId}: manifest ${fact.value} != anmac-fees.json ${fee.amountAud}`);
    if (!fact.last_verified) fail(`${factId}: stated in the document but last_verified is null`);
    if (!fact.source?.includes(extraction.sourceDocument) || !fact.source.includes(fee.quote) || !fact.source.includes(`p.${fee.page}`)) fail(`${factId}: source must cite ${extraction.sourceDocument} p.${fee.page} and quote "${fee.quote}"`);
  }
  for (const [pathwayId, factId] of [["FULL_SKILLS_ASSESSMENT", "anmac_full_skills_assessment_fee"], ["MODIFIED_SKILLS_ASSESSMENT", "anmac_modified_skills_assessment_fee"]] as const) {
    const fee = anmacAuthority.pathways.find((p) => p.pathwayId === pathwayId)?.fees[0];
    if (fee?.amountAUD !== findFact(factId).value || fee?.estimated) fail(`anmac.ts ${pathwayId} fee ${fee?.amountAUD} disagrees with ${factId} or is flagged estimated`);
  }
  for (const n of extraction.notStated) {
    const fact = findFact(n.id);
    if (fact.value !== null || fact.last_verified !== null || !fact.source?.startsWith("needs human verification -- document names it but states no amount")) {
      fail(`${n.id}: must be value null, last_verified null, source "needs human verification -- document names it but states no amount"`);
    }
    if (n.status !== "needs human verification") fail(`anmac-fees.json ${n.id} status is "${n.status}"`);
  }
  if (failures === before) ok("ANMAC Full 595 / Modified 395 / Direct care 545 and NMBA IQNM 410: manifest = anmac-fees.json = anmac.ts, each quoted; NMBA international application + registration fees unpriced (needs human verification)");
}

// Confirm the known gap is still honestly a gap, not silently "fixed" by
// someone inventing a number without updating the manifest.
{
  const fact = findFact("vac_186");
  if (fact.value !== null) {
    fail(`vac_186 manifest entry now has a value (${fact.value}) but this test was not updated to verify it against a real source -- update this test before trusting that number.`);
  } else if ("186" in BASE_VAC_AUD) {
    fail(`BASE_VAC_AUD now has a "186" entry but fee-provenance.json still marks it MISSING -- reconcile.`);
  } else {
    ok(`vac_186: consistently marked MISSING in both the manifest and BASE_VAC_AUD (no invented number).`);
  }
}

console.log("\n==================== (2b) additional-applicant VAC: recorded and cross-checked against visa-fees.json ====================");
{
  const before = failures;
  const feeVisas = (visaFeesData as unknown as { visas: Record<string, { vac?: { partner_18_plus?: number; child_under_18?: number } }> }).visas;
  // What each subclass's OWN knowledge document states (src/data/additional-applicant-vac.json, generated by
  // scripts/generate-additional-applicant-vac.ts from the 23 September 2026 pages): a fee-table row with the
  // amount, or "not stated" (deferred to the Visa Pricing Estimator). 482 is sourced from a sentence in its own
  // document instead (fee/threshold truth-audit, 2026-09-22).
  type Extracted = { amountAud: number; page: number; quote: string } | { status: string };
  const extraction = additionalApplicantVac as unknown as {
    subclasses: Record<string, { sourceDocument: string; adult18Plus: Extracted; childUnder18: Extracted }>;
  };
  const SENTENCE_SOURCED: Record<string, { adult: string; child: string }> = {
    "482": { adult: "AUD4,015.00 for the main applicant and for each dependant 18 years and over", child: "AUD1,005.00 for each dependant under 18 years old" },
  };
  const EXPECTED_SUBCLASSES = ["189", "190", "491", "485", "500", "820", "482"];
  let covered = 0;
  let verifiedCount = 0;
  for (const subclass of EXPECTED_SUBCLASSES) {
    const entry = feeVisas[subclass];
    const adult = entry?.vac?.partner_18_plus;
    const child = entry?.vac?.child_under_18;
    if (typeof adult !== "number" || typeof child !== "number") {
      fail(`visa-fees.json has no additional-applicant figures for ${subclass}`);
      continue;
    }
    const resolved = resolveAdditionalApplicantVac(subclass);
    if (!resolved || resolved.adult !== adult || resolved.child !== child) {
      fail(`resolveAdditionalApplicantVac(${subclass}) = ${JSON.stringify(resolved)} disagrees with visa-fees.json (${adult}/${child})`);
    }
    const extracted = extraction.subclasses[subclass];
    for (const [key, value, band] of [["adult", adult, "adult18Plus"], ["child", child, "childUnder18"]] as const) {
      const fact = facts.find((f) => f.id === `vac_additional_${key}_${subclass}`);
      if (!fact) {
        fail(`no vac_additional_${key}_${subclass} fact in fee-provenance.json`);
        continue;
      }
      covered++;
      if (fact.value !== value) fail(`${fact.id}: manifest ${fact.value} != visa-fees.json ${value}`);
      const row = extracted?.[band];
      const sentence = SENTENCE_SOURCED[subclass]?.[key];
      if (row && "amountAud" in row) {
        // Stated in this subclass's own document: real value, dated, quoting the exact fee-table row.
        verifiedCount++;
        if (value !== row.amountAud) fail(`${fact.id}: visa-fees.json ${value} != the document's "${row.quote}"`);
        if (!fact.last_verified) fail(`${fact.id}: stated in the document but last_verified is null`);
        if (!fact.source?.includes(extracted.sourceDocument) || !fact.source.includes(row.quote)) fail(`${fact.id}: source must cite ${extracted.sourceDocument} and quote "${row.quote}"`);
        if (fact.source?.startsWith("needs human verification")) fail(`${fact.id}: stated in the document but source still says "needs human verification"`);
      } else if (sentence) {
        verifiedCount++;
        if (!fact.last_verified) fail(`${fact.id}: sentence-sourced but last_verified is null`);
        if (!fact.source?.includes(sentence) || !fact.source.includes("data/knowledge")) fail(`${fact.id}: source must quote "${sentence}" from data/knowledge`);
      } else {
        // Deferred to the Visa Pricing Estimator: no date, and the source says so -- never a guessed number.
        if (fact.last_verified !== null) fail(`${fact.id}: last_verified must be null until a knowledge document states the figure (got ${fact.last_verified})`);
        if (!fact.source?.startsWith("needs human verification") || !/Estimator|No flat/i.test(fact.source ?? "")) fail(`${fact.id}: source must say "needs human verification" and state the deferral`);
      }
    }
  }
  if (covered !== 14) fail(`expected 14 additional-applicant VAC facts (7 subclasses x adult/child), cross-checked ${covered}`);
  if (failures === before) ok(`${covered} additional-applicant VAC facts agree with visa-fees.json (${verifiedCount} stated in their own subclass document, ${covered - verifiedCount} still deferred)`);
}

// (2c) is async (the generator parses PDFs), so it runs at the end of this file, before the summary.
async function checkAdditionalApplicantVacDrift() {
  console.log("\n==================== (2c) additional-applicant VAC extraction: drift against the source documents ====================");
  const docs = Object.values(SUBCLASS_DOCUMENTS);
  if (docs.some((f) => !existsSync(f))) {
    console.log("  SKIPPED: the subclass documents are not present (data/knowledge is gitignored)");
  } else {
    const fresh = serializeVac(await buildAdditionalApplicantVac());
    const committed = readFileSync(VAC_OUT_FILE, "utf8").replace(/\r\n/g, "\n");
    if (committed === fresh) ok(`${VAC_OUT_FILE} matches a fresh parse of the ${docs.length} subclass documents`);
    else fail(`${VAC_OUT_FILE} drifted from the source documents -- run: npx tsx scripts/generate-additional-applicant-vac.ts`);
  }
}

// Tally: how many facts a human has actually verified (a date AND a source that does not say "needs human verification").
{
  const verified = facts.filter((f) => f.value !== null && f.last_verified && !f.source?.startsWith("needs human verification"));
  console.log(`\n  verified against an official source: ${verified.length}; explicitly unverified (no date): ${unverifiedFacts.length}`);
}

console.log("\n==================== (3) authority conflicts recorded as needing human verification ====================");
{
  const conflicts = findAuthorityConflicts(listAuthorities());
  const recorded = facts.filter((f) => f.id.startsWith("authority_conflict_"));
  const before = failures;
  for (const c of conflicts) {
    const fact = recorded.find((f) => f.id === `authority_conflict_${c.anzscoCode}`);
    if (!fact) fail(`ANZSCO ${c.anzscoCode} (${c.title}) names two authorities but has no authority_conflict_* fact -- run: npx tsx scripts/audit-authority-conflicts.ts --write`);
    else if (fact.last_verified !== null || !/needs human verification/.test(fact.source ?? "")) fail(`${fact.id}: must be last_verified null and marked "needs human verification"`);
  }
  for (const fact of recorded) {
    if (!conflicts.some((c) => `authority_conflict_${c.anzscoCode}` === fact.id)) fail(`${fact.id} no longer matches a real conflict -- re-run the audit with --write`);
  }
  if (failures === before) ok(`${conflicts.length} authority conflicts recorded (last_verified null, needs human verification)`);
}

checkAdditionalApplicantVacDrift()
  .catch((err) => fail(`additional-applicant VAC drift check crashed: ${err instanceof Error ? err.message : String(err)}`))
  .finally(() => {
    console.log(`\n\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
    process.exitCode = failures === 0 ? 0 : 1;
  });
