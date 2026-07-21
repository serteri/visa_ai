import { runReadinessEngine } from "@/lib/readiness/engine";

const report = runReadinessEngine({
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

console.log(JSON.stringify(report.pathwayComparison[0], null, 2));

const reportTr = runReadinessEngine({
  locale: "tr",
  country: "AU",
  mainGoal: "Partnerim Avustralya vatandaşı, nişanlıyız",
  currentCountry: "Australia",
  passportCountry: "India",
  age: "30",
  occupation: "Accountant",
  englishLevel: "Superior",
  qualificationLevel: "Bachelor's Degree",
  preferredPathway: "820_801",
});
console.log("\n--- TR ---");
console.log(JSON.stringify(reportTr.pathwayComparison[0], null, 2));
