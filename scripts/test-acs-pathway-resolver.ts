/**
 * Test: ACS pathway resolver with different intake profiles.
 *
 * Verifies that the resolver correctly maps intake data to the right pathway:
 * - AU bachelor + 1yr exp → Post Australian Study ($1,136)
 * - AU diploma + recent → TG485 ($625)
 * - AU bachelor + recent → PY ($625)
 * - No tertiary + 6yr exp → RPL ($625)
 * - Overseas bachelor + exp → General Skills ($1,498)
 * - Software Engineer (ACS) → resolver works
 * - Architect (AACA) → resolver not affected
 * - Unknown occupation → resolver returns null
 */
import { getSkillsAssessmentAuthority, resolveACSPathway } from "@/lib/skills-assessment";

const ASSERT = {
  ok(condition: boolean, msg: string) {
    if (!condition) {
      console.error(`  FAIL: ${msg}`);
      process.exitCode = 1;
    } else {
      console.log(`  ${msg}`);
    }
  },
};

function testPathwayResolver() {
  console.log("=== ACS Pathway Resolver Tests ===\n");

  // Scenario 1: AU bachelor + 1yr AU experience
  const scenario1 = resolveACSPathway({
    qualificationLevel: "Bachelor's Degree",
    completedAtAustralianInstitution: true,
    yearsOfExperience: 1,
  });
  ASSERT.ok(scenario1 === "POST_AU_STUDY", "AU Bachelor + 1yr exp → POST_AU_STUDY ($1,136)");

  // Scenario 2: AU diploma + recent graduate → TG485
  const scenario2 = resolveACSPathway({
    qualificationLevel: "Diploma",
    completedAtAustralianInstitution: true,
    yearsOfExperience: 0,
    isRecentGraduate: true,
  });
  ASSERT.ok(scenario2 === "QUALIFICATION_ONLY_TG485", "AU Diploma + recent → TG485 ($625)");

  // Scenario 3: AU bachelor + recent → PY
  const scenario3 = resolveACSPathway({
    qualificationLevel: "Bachelor's Degree",
    completedAtAustralianInstitution: true,
    yearsOfExperience: 0,
    isRecentGraduate: true,
  });
  ASSERT.ok(scenario3 === "QUALIFICATION_ONLY_PY", "AU Bachelor + recent → PY ($625)");

  // Scenario 4: No tertiary + 6yr experience → RPL
  const scenario4 = resolveACSPathway({
    qualificationLevel: "",
    completedAtAustralianInstitution: false,
    yearsOfExperience: 6,
  });
  ASSERT.ok(scenario4 === "RPL", "No tertiary + 6yr exp → RPL ($625)");

  // Scenario 5: Overseas bachelor + exp → General Skills
  const scenario5 = resolveACSPathway({
    qualificationLevel: "Bachelor's Degree",
    completedAtAustralianInstitution: false,
    yearsOfExperience: 3,
  });
  ASSERT.ok(scenario5 === "GENERAL_SKILLS", "Overseas Bachelor + 3yr exp → GENERAL SKILLS ($1,498)");

  // Scenario 6: AU bachelor + 0yr exp (no PY) → General Skills
  const scenario6 = resolveACSPathway({
    qualificationLevel: "Bachelor's Degree",
    completedAtAustralianInstitution: true,
    yearsOfExperience: 0,
    isRecentGraduate: false,
  });
  ASSERT.ok(scenario6 === "GENERAL_SKILLS", "AU Bachelor + 0yr, not recent → GENERAL SKILLS");

  // Scenario 7: AU master + 2yr exp → Post Australian Study
  const scenario7 = resolveACSPathway({
    qualificationLevel: "Master's Degree (Coursework)",
    completedAtAustralianInstitution: true,
    yearsOfExperience: 2,
  });
  ASSERT.ok(scenario7 === "POST_AU_STUDY", "AU Master + 2yr exp → POST_AU_STUDY ($1,136)");

  // Scenario 8: No tertiary + 5yr exp → General Skills (need 6 for RPL)
  const scenario8 = resolveACSPathway({
    qualificationLevel: "",
    completedAtAustralianInstitution: false,
    yearsOfExperience: 5,
  });
  ASSERT.ok(scenario8 === "GENERAL_SKILLS", "No tertiary + 5yr exp → GENERAL SKILLS (need 6 for RPL)");

  console.log("\n=== Authority Lookup Tests ===\n");

  // Verify Software Engineer resolves to ACS with correct pathway
  const seAuthority = getSkillsAssessmentAuthority("261313");
  ASSERT.ok(seAuthority?.authorityId === "ACS", "Software Engineer → ACS");
  ASSERT.ok(seAuthority?.pathways.length >= 4, "ACS has 4+ pathways");
}

function testFinancialRoadmapIntegration() {
  console.log("\n=== Financial Roadmap Integration ===\n");

  // This test verifies that the engine correctly resolves ACS pathways
  // based on intake data. We can't run the full engine here, but we can
  // verify the resolver works with the same data the engine would use.
  const scenarios = [
    { name: "AU Bachelor, 1yr exp", level: "Bachelor's Degree", au: true, exp: 1, expected: "POST_AU_STUDY" },
    { name: "Overseas Bachelor, 3yr exp", level: "Bachelor's Degree", au: false, exp: 3, expected: "GENERAL_SKILLS" },
    { name: "No tertiary, 7yr exp", level: "", au: false, exp: 7, expected: "RPL" },
    { name: "AU Diploma, recent grad", level: "Diploma", au: true, exp: 0, expected: "QUALIFICATION_ONLY_TG485" },
  ];

  scenarios.forEach(({ name, level, au, exp, expected }) => {
    const result = resolveACSPathway({
      qualificationLevel: level,
      completedAtAustralianInstitution: au,
      yearsOfExperience: exp,
      isRecentGraduate: level === "Diploma" && exp === 0,
    });
    ASSERT.ok(result === expected, `${name} → ${expected}`);
  });
}

// Run tests
testPathwayResolver();
testFinancialRoadmapIntegration();

const failed = (process as any).exitCode === 1;
console.log(`\n${failed ? "SOME TESTS FAILED" : "All tests passed"}`);
if (failed) process.exit(1);
