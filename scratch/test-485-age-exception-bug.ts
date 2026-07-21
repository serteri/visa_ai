import { runReadinessEngine } from "@/lib/readiness/engine";

function run(label: string, input: Record<string, unknown>) {
  const report = runReadinessEngine(input as any);
  const entry485 = report.pathwayComparison.find((p) => p.subclass === "485");
  console.log(`\n=== ${label} ===`);
  console.log("relevance:", entry485?.relevance);
  console.log("reason:", entry485?.reason);
}

// BUG CHECK: Hong Kong passport holder, Bachelor's degree, age 40 — should be
// ELIGIBLE on age (HK/BNO exception grants up to 50), per has485AgeException.
run("HK passport + Bachelor's + age 40 (expect eligible on age)", {
  locale: "en",
  country: "AU",
  mainGoal: "I recently graduated and want to stay and work in Australia",
  currentCountry: "Australia",
  passportCountry: "Hong Kong",
  age: "40",
  occupation: "Software Engineer",
  englishLevel: "Superior",
  qualificationLevel: "Bachelor's Degree",
  preferredPathway: "485",
});

// Control: PhD holder, age 40 — should already be fine per earlier reading
// (PhD isn't in QUALIFICATIONS_BACHELOR_OR_LOWER, so hard gate never fires).
run("PhD + age 40 (control, expect eligible on age)", {
  locale: "en",
  country: "AU",
  mainGoal: "I recently graduated and want to stay and work in Australia",
  currentCountry: "Australia",
  passportCountry: "India",
  age: "40",
  occupation: "Software Engineer",
  englishLevel: "Superior",
  qualificationLevel: "PhD/Doctorate",
  preferredPathway: "485",
});

// Control: Bachelor's, no exception, age 40 — should genuinely be ineligible.
run("Bachelor's, no exception, age 40 (control, expect ineligible)", {
  locale: "en",
  country: "AU",
  mainGoal: "I recently graduated and want to stay and work in Australia",
  currentCountry: "Australia",
  passportCountry: "India",
  age: "40",
  occupation: "Software Engineer",
  englishLevel: "Superior",
  qualificationLevel: "Bachelor's Degree",
  preferredPathway: "485",
});

// Boundary: HK passport + Bachelor's + age 51 — even WITH the exception,
// this should still be genuinely ineligible (exception caps at 50, not unlimited).
run("HK passport + Bachelor's + age 51 (expect still ineligible, exception has a ceiling)", {
  locale: "en",
  country: "AU",
  mainGoal: "I recently graduated and want to stay and work in Australia",
  currentCountry: "Australia",
  passportCountry: "Hong Kong",
  age: "51",
  occupation: "Software Engineer",
  englishLevel: "Superior",
  qualificationLevel: "Bachelor's Degree",
  preferredPathway: "485",
});
