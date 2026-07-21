import { runReadinessEngine } from "@/lib/readiness/engine";

const report = runReadinessEngine({
  locale: "en",
  country: "AU",
  mainGoal:
    "Permanent residency via employer nomination. Worked 1.5 years for Employer A (approved sponsor) then 1.5 years for Employer B (approved sponsor), both under 482, different employers, total 3 years sponsored.",
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

const entry186 = report.pathwayComparison.find((p) => p.subclass === "186");
console.log("=== Two-employer, 3-year aggregated TRT scenario ===");
console.log("relevance:", entry186?.relevance);
console.log("confidenceLevel:", entry186?.confidenceLevel);
console.log("reason:", entry186?.reason);
console.log("risks:", entry186?.pathwaySpecificRisks);

// Confirm the reason text never claims a same-employer requirement
const fullText = JSON.stringify(entry186);
console.log("\nMentions 'same employer' (should be false):", /same employer/i.test(fullText));
