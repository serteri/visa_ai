import { runReadinessEngine } from "@/src/lib/readiness-engine";
import { generateReadinessPDF } from "@/lib/readiness/generate-pdf";
import { calculateVisaPoints } from "@/lib/readiness/visa-points-calculator";
import { getCostBreakdown } from "@/src/lib/financial-engine";
import type { ReadinessInput } from "@/lib/readiness/types";

const goldLeadInput: ReadinessInput = {
  locale: "en",
  mainGoal: "Skilled Nominated (190) as Software Engineer",
  preferredPathway: "190",
  currentCountry: "Turkey",
  passportCountry: "Turkey",
  age: "30",
  occupation: "Software Engineer (261313)",
  englishLevel: "superior",
  qualificationLevel: "Bachelor",
  offshoreExperienceYears: 6,
  onshoreExperienceYears: 0,
  englishTestTaken: "yes",
  occupationConfirmed: "yes",
  estimatedBudgetRange: "20k-30k AUD",
  timeline: "6-12 months",
  sponsorOrFamily: "Married, spouse has competent English but no skills assessment",
  biggestConcern: "Invitation score competitiveness and timing",
  preferredCity: "Sydney",
};

const readiness = runReadinessEngine(goldLeadInput);

const points = calculateVisaPoints({
  ageRange: "25_32",
  englishLevel: "Superior",
  qualificationLevel: "Bachelor",
  offshoreExperienceYears: 6,
  onshoreExperienceYears: 0,
  anzscoCode: "261313",
  occupationName: "Software Engineer",
  hasNAATI: false,
  hasProfessionalYear: false,
  hasRegionalStudy: false,
  partnerSkilled: false,
});

const financial = getCostBreakdown("190", "ACS", {
  adultDependants: 1,
  childDependants: 0,
  policeCheckCountriesPerAdult: 1,
});

// Enrich readiness report so PDF reflects all motors in one sample output
readiness.executiveSummary = [
  ...readiness.executiveSummary,
  `Gold Lead simulation: Software Engineer (261313), target visa 190, age 30, superior English, 6 years offshore experience.`,
  `Skill mapping validation: authority resolved as ${points.occupationAuthority ?? "Unknown"}; ACS deduction applied: ${points.acsDeductionApplied ? "Yes" : "No"}.`,
  `Points (motor): 189=${points.scores.subclass189}, 190=${points.scores.subclass190}, 491=${points.scores.subclass491}.`,
  `Financial estimate (motor): ${financial.totalEstimatedCost} ${financial.currency} (Government + Mandatory).`,
];

readiness.pointsBoosterSimulator = {
  currentEstimate: points.scores.subclass190,
  note: points.warnings.join(" | "),
  scenarios: points.boosters.map((b) => ({
    label: b.title,
    estimatedChange: b.potentialPoints,
    resultingEstimate: points.scores.subclass190 + b.potentialPoints,
    explanation: b.description,
  })),
};

readiness.financialRoadmap = financial.categorizedBreakdown.map((item) => ({
  category: item.item,
  estimateType:
    item.category === "Government"
      ? "official_fee"
      : item.category === "Mandatory"
        ? "third_party_estimate"
        : "variable",
  amountLabel: `${financial.currency} ${item.amount.toLocaleString("en-AU")}`,
  explanation:
    item.category === "Government"
      ? "Based on selected subclass and family composition."
      : item.category === "Mandatory"
        ? "Estimated mandatory third-party expenses."
        : "Optional/strategy-dependent cost item.",
}));

readiness.disclaimer =
  "This report is structured data analysis for planning context only and not migration advice. Official fees and invitation dynamics may change by legislative instrument.";

console.log("=== GOLD LEAD SUMMARY ===");
console.log(JSON.stringify({
  candidate: "Ahmet Yilmaz",
  visaTarget: "190",
  points,
  financial,
  documentChecklist: readiness.documentChecklist,
  actionPlan: readiness.suggestedNextSteps,
  frictionAnalysis: readiness.frictionAnalysis,
  premiumSections: readiness.premiumSections,
}, null, 2));

// Trigger PDF generation
generateReadinessPDF({
  report: readiness,
  locale: "en",
  userInputSummary: {
    name: "Ahmet Yilmaz",
    email: "ahmet.yilmaz@example.com",
    mainGoal: goldLeadInput.mainGoal,
    currentCountry: goldLeadInput.currentCountry,
    passportCountry: goldLeadInput.passportCountry,
    age: goldLeadInput.age,
    occupation: "Software Engineer (261313)",
    englishLevel: "PTE 79+ (Superior)",
    sponsorOrFamily: "Married, spouse English only (no skill assessment)",
    biggestConcern: goldLeadInput.biggestConcern,
  },
});

console.log("PDF generation invoked. Check project root for visa-readiness-report-<date>.pdf");
