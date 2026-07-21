import { runReadinessEngine } from "@/lib/readiness/engine";

function run(label: string, input: Record<string, unknown>) {
  const report = runReadinessEngine(input as any);
  console.log(`\n=== ${label} ===`);
  console.log("detectedSubclasses:", report.detectedSubclasses);
  console.log(
    "pathwayComparison subclasses:",
    report.pathwayComparison.map((p) => `${p.subclass} (${p.relevance})`)
  );
}

// Scenario 1: user explicitly selects "Partner visa 820/801" from the
// dropdown (real value: "820_801"), occupation is confirmed MLTSSL-listed
// (Accountant, 221111/271111). mainGoal avoids the word "sponsor" to isolate
// just the pathway-dropdown-vs-occupation-detection conflation.
run("preferredPathway=820_801 (dropdown value), confirmed-MLTSSL occupation", {
  locale: "en",
  country: "AU",
  mainGoal: "My partner is an Australian citizen, we are engaged",
  currentCountry: "Australia",
  passportCountry: "India",
  age: "30",
  occupation: "Accountant",
  englishLevel: "Superior",
  qualificationLevel: "Bachelor's Degree",
  preferredPathway: "820_801",
});

// Scenario 2: sponsorOrFamily field set to "Partner / Dependants with
// Functional English" (the actual dropdown option text), confirmed-MLTSSL
// occupation, no explicit pathway selection.
run("sponsorOrFamily=Partner/Dependants text, confirmed-MLTSSL occupation, no pathway selected", {
  locale: "en",
  country: "AU",
  mainGoal: "Looking into my options",
  currentCountry: "Australia",
  passportCountry: "India",
  age: "30",
  occupation: "Accountant",
  englishLevel: "Superior",
  qualificationLevel: "Bachelor's Degree",
  sponsorOrFamily: "Partner / Dependants with Functional English",
});

// Scenario 3: the earlier "my partner is sponsoring me" phrasing — checking
// whether the word "sponsor(ing)" in a PARTNER context gets misread as
// EMPLOYER-sponsorship (482) signal — a separate conflation to document.
run("mainGoal mentions partner 'sponsoring' me (keyword collision check)", {
  locale: "en",
  country: "AU",
  mainGoal: "My partner is an Australian citizen and sponsoring me",
  currentCountry: "Australia",
  passportCountry: "India",
  age: "30",
  occupation: "Accountant",
  englishLevel: "Superior",
  qualificationLevel: "Bachelor's Degree",
  preferredPathway: "820_801",
});
