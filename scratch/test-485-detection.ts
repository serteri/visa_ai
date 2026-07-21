import { runReadinessEngine } from "@/lib/readiness/engine";

function run(label: string, input: Record<string, unknown>) {
  const report = runReadinessEngine(input as any);
  console.log(`\n=== ${label} ===`);
  console.log("detectedSubclasses:", report.detectedSubclasses);
  const entry485 = report.pathwayComparison.find((p) => p.subclass === "485");
  console.log("485 entry present:", Boolean(entry485));
  if (entry485) {
    console.log("485 relevance:", entry485.relevance);
    console.log("485 reason:", entry485.reason);
  }
}

// Scenario A: preferredPathway="485" explicitly (dropdown value), occupation on MLTSSL
// (previously this silently produced only a 189/190/491 card, never 485)
run("preferredPathway=485, MLTSSL occupation, no other signal", {
  locale: "en",
  country: "AU",
  mainGoal: "I want to stay and work after finishing my degree",
  currentCountry: "Australia",
  passportCountry: "India",
  age: "26",
  occupation: "Software Engineer",
  englishLevel: "Superior",
  qualificationLevel: "Bachelor's Degree",
  preferredPathway: "485",
});

// Scenario B: hasGraduateVisaPathwayIntent=true, preferredPathway unset,
// no freetext keyword match at all — the structured checkbox alone should trigger 485.
run("hasGraduateVisaPathwayIntent=true only, no freetext/dropdown signal", {
  locale: "en",
  country: "AU",
  mainGoal: "Not sure what to do next",
  currentCountry: "Australia",
  passportCountry: "Nepal",
  age: "24",
  occupation: "Software Engineer",
  englishLevel: "Superior",
  qualificationLevel: "Bachelor's Degree",
  hasGraduateVisaPathwayIntent: true,
});

// Scenario C (regression): no 485 signal at all, occupation on MLTSSL — should NOT show 485
run("No 485 signal, MLTSSL occupation only (regression check)", {
  locale: "en",
  country: "AU",
  mainGoal: "Permanent residency through skilled migration",
  currentCountry: "India",
  passportCountry: "India",
  age: "30",
  occupation: "Software Engineer",
  englishLevel: "Superior",
  qualificationLevel: "Bachelor's Degree",
});

// Scenario D: age >35 hard-ineligible gate should still fire once 485 is detected
run("preferredPathway=485, age 40, Bachelor's (hard age gate)", {
  locale: "en",
  country: "AU",
  mainGoal: "Graduated recently, want to stay",
  currentCountry: "Australia",
  passportCountry: "India",
  age: "40",
  occupation: "Software Engineer",
  englishLevel: "Superior",
  qualificationLevel: "Bachelor's Degree",
  preferredPathway: "485",
});
