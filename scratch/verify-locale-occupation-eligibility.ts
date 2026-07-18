import { runReadinessEngine } from "@/src/lib/readiness-engine";

const base = {
  country: "AU" as const,
  mainGoal: "Skilled migration to Australia",
  currentCountry: "Turkey",
  passportCountry: "Turkey",
  age: "31",
  englishLevel: "superior",
  qualificationLevel: "Bachelor's Degree" as const,
  annualSalaryAud: 120000,
  sponsorOrFamily: "single",
};

function run(label: string, locale: "en" | "tr" | "zh-Hans", occupation: string) {
  const report = runReadinessEngine({
    ...base,
    locale,
    occupation,
  });

  return {
    label,
    locale,
    occupationInput: occupation,
    eligibility: report.assessmentState?.occupationEligibility,
    reason: report.assessmentState?.occupationEligibilityReason,
    canShowNumericRanking: report.assessmentState?.canShowNumericRanking,
  };
}

const cases = [
  run("english", "en", "Software Engineer"),
  run("turkish", "tr", "Yazılım Mühendisi"),
  run("turkish_ascii", "tr", "yazilim muhendisi"),
  run("chinese", "zh-Hans", "软件工程师"),
];

console.log(JSON.stringify(cases, null, 2));
