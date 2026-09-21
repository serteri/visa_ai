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
import visaFeesData from "../src/data/visa-fees.json";
import visaDetailsData from "../src/data/visa-details.json";
import {
  BASE_VAC_AUD,
  resolveAdditionalApplicantVac,
  SECOND_INSTALMENT_AUD,
  INCOME_THRESHOLD_491_TO_191_AUD,
  ENGLISH_TEST_VALIDITY_YEARS,
  CURRENT_CSIT,
} from "../lib/readiness/constants";
import { acsAuthority } from "../lib/skills-assessment/authorities/acs";
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
    console.log(`  ⚠️  ${fact.id}: value is null (known gap: ${fact.source}) -- metadata check skipped`);
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

// Income threshold: manifest vs constants.ts (no second JSON copy exists by design -- Phase 1 centralized it).
{
  const fact = findFact("income_threshold_491_to_191");
  if (fact.value !== INCOME_THRESHOLD_491_TO_191_AUD) {
    fail(`Income threshold disagrees: manifest=${fact.value}, constants.ts=${INCOME_THRESHOLD_491_TO_191_AUD}`);
  } else {
    ok(`Income threshold: manifest and constants.ts agree (AUD ${INCOME_THRESHOLD_491_TO_191_AUD})`);
  }
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

console.log("\n==================== (2b) additional-applicant VAC: recorded, cross-checked, and NOT treated as verified ====================");
{
  const before = failures;
  const feeVisas = (visaFeesData as unknown as { visas: Record<string, { vac?: { partner_18_plus?: number; child_under_18?: number } }> }).visas;
  let covered = 0;
  for (const [subclass, entry] of Object.entries(feeVisas)) {
    const adult = entry.vac?.partner_18_plus;
    const child = entry.vac?.child_under_18;
    if (typeof adult !== "number" || typeof child !== "number" || (adult === 0 && child === 0)) continue;
    const resolved = resolveAdditionalApplicantVac(subclass);
    if (!resolved || resolved.adult !== adult || resolved.child !== child) {
      fail(`resolveAdditionalApplicantVac(${subclass}) = ${JSON.stringify(resolved)} disagrees with visa-fees.json (${adult}/${child})`);
    }
    for (const [key, value] of [["adult", adult], ["child", child]] as const) {
      const fact = facts.find((f) => f.id === `vac_additional_${key}_${subclass}`);
      if (!fact) {
        fail(`visa-fees.json quotes an additional-applicant ${key} VAC for ${subclass} but fee-provenance.json has no vac_additional_${key}_${subclass} fact`);
        continue;
      }
      covered++;
      if (fact.value !== value) fail(`${fact.id}: manifest ${fact.value} != visa-fees.json ${value}`);
      // Never checked against an official source: must stay flagged as such until a human verifies it.
      if (fact.last_verified !== null) fail(`${fact.id}: last_verified must be null until a human checks it against an official source (got ${fact.last_verified})`);
      if (!fact.source?.startsWith("needs human verification")) fail(`${fact.id}: source must be "needs human verification"`);
    }
  }
  const stray = facts.filter((f) => f.id.startsWith("vac_additional_") && f.last_verified !== null);
  for (const f of stray) fail(`${f.id} claims verification (last_verified ${f.last_verified}) -- not allowed for unchecked figures`);
  if (covered === 0) fail("no additional-applicant VAC facts were cross-checked");
  if (failures === before) ok(`${covered} additional-applicant VAC facts agree with visa-fees.json and are marked unverified (last_verified null)`);
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

console.log(`\n\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
process.exitCode = failures === 0 ? 0 : 1;
