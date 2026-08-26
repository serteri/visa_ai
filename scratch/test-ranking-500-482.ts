import { runReadinessEngine } from "@/src/lib/readiness-engine";

function run(label: string, input: Record<string, unknown>) {
  const report = runReadinessEngine(input as any);
  console.log(`\n=== ${label} ===`);
  console.log("detectedSubclasses:", report.detectedSubclasses);
  console.log(
    "rankedPathways:",
    report.rankedPathways?.map((rp) => ({
      subclass: rp.subclass,
      matchPercentage: rp.matchPercentage,
      qualitativeTier: rp.qualitativeTier,
      isPreliminaryOnly: rp.isPreliminaryOnly,
      isGateBased: rp.isGateBased,
      note: rp.preliminaryNote?.slice(0, 60),
    }))
  );
}

// Scenario 1: skilled (189/190/491) numerically ranked + 500 also detected
// (student intent alongside skilled migration interest)
run("Skilled + 500 both detected, full profile", {
  locale: "en",
  country: "AU",
  mainGoal: "Permanent residency through skilled migration, also considering study",
  currentCountry: "Australia",
  passportCountry: "India",
  age: "28",
  occupation: "Software Engineer",
  englishLevel: "Superior",
  qualificationLevel: "Bachelor's Degree",
  occupationConfirmed: "yes",
});

// Scenario 2: only 482 detected (employer sponsor context), no skilled pathway at all
run("Only 482 detected, no skilled pathway", {
  locale: "en",
  country: "AU",
  mainGoal: "My employer wants to sponsor me for a visa",
  currentCountry: "Philippines",
  passportCountry: "Philippines",
  age: "33",
  occupation: "Chef",
  englishLevel: "Competent",
  sponsorOrFamily: "Employer sponsor",
});

// Scenario 3 (regression): pure skilled case, no 500/482 signal at all
run("Pure skilled 189/190/491, no 500/482 signal (regression)", {
  locale: "en",
  country: "AU",
  mainGoal: "Permanent residency through skilled migration",
  currentCountry: "Australia",
  passportCountry: "India",
  age: "28",
  occupation: "Software Engineer",
  englishLevel: "Superior",
  qualificationLevel: "Bachelor's Degree",
  occupationConfirmed: "yes",
});

// Scenario 4 (regression): 186 should still NOT appear in ranking (out of scope this turn)
run("186 detected, should not appear in rankedPathways (regression)", {
  locale: "en",
  country: "AU",
  mainGoal: "Permanent residency via employer nomination",
  currentCountry: "Australia",
  passportCountry: "India",
  age: "38",
  occupation: "Software Engineer",
  englishLevel: "Superior",
  qualificationLevel: "Bachelor's Degree",
  annualSalaryAud: 95000,
  sponsorOrFamily: "Sponsored by employer",
  preferredPathway: "186",
  nominationStream: "trt",
  yearsInSponsoredPosition: 3,
});

// Scenario 5: 482 hard-ineligible (below CSIT) should NOT get a duplicate
// qualitative row from buildGateBasedRankedPathways (owned by the ineligible sweep instead)
run("482 hard-ineligible (below CSIT) - no duplicate row", {
  locale: "en",
  country: "AU",
  mainGoal: "My employer wants to sponsor me",
  currentCountry: "Philippines",
  passportCountry: "Philippines",
  age: "33",
  occupation: "Chef",
  englishLevel: "Competent",
  sponsorOrFamily: "Employer sponsor",
  annualSalaryAud: 55000,
});
