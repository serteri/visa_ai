import { runReadinessEngine } from "@/lib/readiness/engine";

const report = runReadinessEngine({
  locale: "en",
  country: "AU",
  mainGoal: "I want to get permanent residency through my employer",
  currentCountry: "Australia",
  passportCountry: "India",
  age: "34",
  occupation: "Software Engineer",
  englishLevel: "Superior",
  qualificationLevel: "Bachelor's Degree",
  annualSalaryAud: 95000,
  sponsorOrFamily: "Sponsored by my current employer",
  preferredPathway: "186",
  yearsInSponsoredPosition: 3,
  nominationStream: "trt",
});

console.log("detectedSubclasses:", report.detectedSubclasses);
console.log(
  "pathwayComparison subclasses:",
  report.pathwayComparison.map((p) => p.subclass)
);
const entry186 = report.pathwayComparison.find((p) => p.subclass === "186");
console.log("186 entry:", JSON.stringify(entry186, null, 2));
