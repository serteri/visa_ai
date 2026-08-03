/**
 * Test: Verify both ANZSCO (232111) and OSCA (241131) codes resolve to AACA.
 *
 * This covers the OSCA/ANZSCO confusion risk — the same occupation can
 * appear under either code system depending on the data source or how
 * the user typed it into the search box.
 */
import { getSkillsAssessmentAuthority } from "@/lib/skills-assessment";
import { normalizeOccupationCode } from "@/lib/skills-assessment/types";

const ASSERT = {
  ok(condition: boolean, msg: string) {
    if (!condition) {
      console.error(`  ❌ FAIL: ${msg}`);
      process.exitCode = 1;
    } else {
      console.log(`  ✅ ${msg}`);
    }
  },
};

function testCodeMatching() {
  console.log("─── normalizeOccupationCode ───");
  ASSERT.ok(normalizeOccupationCode("232111") === "232111", "bare ANZSCO '232111' → '232111'");
  ASSERT.ok(normalizeOccupationCode("241131") === "241131", "bare OSCA '241131' → '241131'");
  ASSERT.ok(normalizeOccupationCode("232111 Architect") === "232111", "'232111 Architect' → '232111'");
  ASSERT.ok(normalizeOccupationCode("Architect 232111") === "232111", "'Architect 232111' → '232111'");
  ASSERT.ok(normalizeOccupationCode("241131 Architect") === "241131", "'241131 Architect' → '241131'");
  ASSERT.ok(normalizeOccupationCode("Architect 241131") === "241131", "'Architect 241131' → '241131'");
  ASSERT.ok(normalizeOccupationCode("") === null, "empty string → null");
  ASSERT.ok(normalizeOccupationCode("123") === null, "short code '123' → null");
  ASSERT.ok(normalizeOccupationCode("1234") === "001234", "4-digit '1234' → padded '001234'");
}

function testAuthorityLookup() {
  console.log("\n─── getSkillsAssessmentAuthority ───");

  // Both ANZSCO and OSCA codes must resolve to AACA
  const a = getSkillsAssessmentAuthority("232111");
  ASSERT.ok(a !== null, "'232111' (ANZSCO) resolves to AACA");
  ASSERT.ok(a?.authorityId === "AACA", "resolved authority is AACA");
  ASSERT.ok(a?.authorityName?.includes("Architects") ?? false, "authority name contains 'Architects'");

  const b = getSkillsAssessmentAuthority("241131");
  ASSERT.ok(b !== null, "'241131' (OSCA) resolves to AACA");
  ASSERT.ok(b?.authorityId === "AACA", "resolved authority is AACA");
  ASSERT.ok(b?.authorityName?.includes("Architects") ?? false, "authority name contains 'Architects'");

  // Both resolve to the SAME authority object
  ASSERT.ok(a === b, "both codes resolve to the same AACA authority object");

  // With title suffix
  const c = getSkillsAssessmentAuthority("232111 Architect");
  ASSERT.ok(c?.authorityId === "AACA", "'232111 Architect' resolves to AACA");

  const d = getSkillsAssessmentAuthority("241131 Architect");
  ASSERT.ok(d?.authorityId === "AACA", "'241131 Architect' resolves to AACA");

  // ACS covers Software Engineer (261313)
  const e = getSkillsAssessmentAuthority("261313");
  ASSERT.ok(e?.authorityId === "ACS", "Software Engineer '261313' resolves to ACS");

  // Unknown code returns null
  const f = getSkillsAssessmentAuthority("999999"); // truly unknown
  ASSERT.ok(f === null, "truly unknown code '999999' returns null (generic fallback)");
}

function testAACADataIntegrity() {
  console.log("\n─── AACA data integrity ───");
  const a = getSkillsAssessmentAuthority("232111");
  ASSERT.ok(a?.occupations.length === 1, "AACA has exactly 1 occupation entry");
  ASSERT.ok(a?.occupations[0]?.anzscoCode === "232111", "ANZSCO code is 232111");
  ASSERT.ok(a?.occupations[0]?.oscaCode === "241131", "OSCA code is 241131");
  ASSERT.ok(a?.occupations[0]?.title === "Architect", "title is 'Architect'");
  ASSERT.ok((a?.pathways?.length ?? 0) >= 4, "AACA has at least 4 pathways (OQA, Verification, UK MRA, EPA)");
  ASSERT.ok(a?.lastVerified === "2025-10-01", "lastVerified is '2025-10-01'");
  ASSERT.ok(a?.validityPeriod?.years === 3, "validity period is 3 years");
  ASSERT.ok((a?.fraudPolicy ?? "") !== "", "fraud policy exists");
}

function testOQAPathway() {
  console.log("\n─── OQA pathway details ───");
  const a = getSkillsAssessmentAuthority("232111");
  const oqa = a?.pathways.find((p) => p.pathwayId === "OQA");
  ASSERT.ok(oqa !== undefined, "OQA pathway exists");
  ASSERT.ok(oqa?.fees.length === 4, "OQA has 4 fee items");
  ASSERT.ok(oqa?.fees[0]?.amountAUD === 4900, "OQA New Applicants fee is AUD 4,900");
  ASSERT.ok(oqa?.fees[1]?.amountAUD === 3000, "OQA Stage 2 legacy fee is AUD 3,000");
  ASSERT.ok(oqa?.fees[2]?.amountAUD === 0, "2nd interview fee is AUD 0");
  ASSERT.ok(oqa?.fees[3]?.amountAUD === 440, "Renewal fee is AUD 440");
  ASSERT.ok(oqa?.processingTimeWeeks?.standard === 7, "Standard processing 7 weeks");
  ASSERT.ok(oqa?.processingTimeWeeks?.ifIncomplete === 12, "Incomplete processing 12 weeks");
  ASSERT.ok(oqa?.minWorkExperienceMonths === 6, "Min 6 months work experience");
  ASSERT.ok(oqa?.documentRequirements.length === 11, "OQA has 11 document requirements");
  ASSERT.ok(oqa?.competencyAssessment?.interviewDurationMinutes === 60, "OQA interview is 60 min");
  ASSERT.ok(oqa?.competencyAssessment?.topicAreas?.length === 7, "OQA has 7 topic areas");
  ASSERT.ok(oqa?.notes?.length === 6, "OQA has 6 notes");
}

function testEPAPathway() {
  console.log("\n─── EPA pathway details ───");
  const a = getSkillsAssessmentAuthority("232111");
  const epa = a?.pathways.find((p) => p.pathwayId === "EPA");
  ASSERT.ok(epa !== undefined, "EPA pathway exists");
  ASSERT.ok(epa?.fees.length === 3, "EPA has 3 fee items");
  ASSERT.ok(epa?.fees[0]?.amountAUD === 3650, "EPA Local fee is AUD 3,650");
  ASSERT.ok(epa?.fees[1]?.amountAUD === 4990, "EPA Overseas fee is AUD 4,990");
  ASSERT.ok(epa?.minWorkExperienceYears === 10, "EPA min 10 years experience");
  ASSERT.ok(epa?.competencyAssessment?.interviewDurationMinutes === 90, "EPA interview is 90 min");
  ASSERT.ok(epa?.notes?.length === 4, "EPA has 4 notes");
}

function testDefaultPathway() {
  console.log("\n─── Default pathway ───");
  const { getDefaultPathway } = require("@/lib/skills-assessment");
  const a = getSkillsAssessmentAuthority("232111");
  const defaultPw = getDefaultPathway(a);
  ASSERT.ok(defaultPw?.pathwayId === "OQA", "Default pathway is OQA (first in list)");
  ASSERT.ok(defaultPw?.fees[0]?.amountAUD === 4900, "Default OQA fee is AUD 4,900");
}

// Run all tests
console.log("=== AACA Authority Code Matching Tests ===\n");
testCodeMatching();
testAuthorityLookup();
testAACADataIntegrity();
testOQAPathway();
testEPAPathway();
testDefaultPathway();

const failed = (process as any).exitCode === 1;
console.log(`\n${failed ? "❌ SOME TESTS FAILED" : "✅ All tests passed"}`);
if (failed) process.exit(1);
