import type { ReadinessInput } from "@/lib/readiness/types";
import { runReadinessEngine } from "@/src/lib/readiness-engine";

const input: ReadinessInput = {
  locale: "en",
  country: "CA",
  mainGoal: "Express Entry skilled migration to Canada",
  currentCountry: "Turkey",
  passportCountry: "Turkey",
  age: "30",
  occupation: "Software Engineer 21232",
  englishLevel: "CLB 9",
  englishTestTaken: "yes",
  occupationConfirmed: "yes",
  estimatedBudgetRange: "15000-25000",
  timeline: "0-6 months",
  sponsorOrFamily: "No spouse, no provincial sponsor yet",
  preferredPathway: "FSW",
  biggestConcern: "CRS score competitiveness",
  qualificationLevel: "Bachelor",
  offshoreExperienceYears: 5,
  onshoreExperienceYears: 0,
};

function main() {
  const report = runReadinessEngine(input);

  console.log("=== TARGET COUNTRY ===");
  console.log(input.country);

  console.log("\n=== POINTS ESTIMATE (should be CRS, not AU 189/190/491 points) ===");
  console.log(JSON.stringify(report.pointsEstimate, null, 2));

  console.log("\n=== PATHWAY COMPARISON (should be CEC/FSW/FSTP, not 189/190/491) ===");
  report.pathwayComparison.forEach((p) => console.log(`- ${p.subclass}: ${p.visaName}`));

  console.log("\n=== DISCLAIMER (should mention RCIC, not MARA) ===");
  console.log(report.disclaimer);

  console.log("\n=== DOCUMENT CHECKLIST (should have ECA/CELPIP/IRCC items, no NAATI) ===");
  report.documentChecklist.forEach((cat) => {
    console.log(`- ${cat.category}: ${cat.items.join(" | ")}`);
  });
  const allDocText = report.documentChecklist.flatMap((c) => [c.category, ...c.items]).join(" ");
  console.log(`\nContains "NAATI"? ${allDocText.toLowerCase().includes("naati")}`);
  console.log(`Contains "ECA"? ${allDocText.toLowerCase().includes("eca")}`);
  console.log(`Contains "CELPIP"? ${allDocText.toLowerCase().includes("celpip")}`);

  console.log("\n=== GANTT CHART (should say provincial nomination / ECA / ITA, not state nomination / skills assessment / EOI) ===");
  console.log(`Timeline band: ${report.premiumSections.strategicGanttChart.timelineBand}`);
  report.premiumSections.strategicGanttChart.steps.forEach((s) => {
    console.log(`- ${s.title}: ${s.description}`);
  });
  const ganttText = JSON.stringify(report.premiumSections.strategicGanttChart);
  console.log(`\nGantt contains "provincial nomination"? ${ganttText.toLowerCase().includes("provincial nomination")}`);
  console.log(`Gantt contains "state nomination"? ${ganttText.toLowerCase().includes("state nomination")}`);
  console.log(`Gantt contains "ECA"? ${ganttText.includes("ECA")}`);
  console.log(`Gantt contains "Skills Assessment"? ${ganttText.includes("Skills Assessment")}`);
  console.log(`Gantt contains "ITA"? ${ganttText.includes("ITA")}`);
  console.log(`Gantt contains standalone "EOI"? ${/\bEOI\b/.test(ganttText)}`);

  console.log("\n=== HISTORICAL INVITATION TRENDS (should be a clear 'coming soon' placeholder) ===");
  console.log(JSON.stringify(report.premiumSections.historicalInvitationTrends, null, 2));

  console.log("\n=== LIVING COST PROJECTION (should be a clear 'coming soon' placeholder) ===");
  console.log(JSON.stringify(report.premiumSections.livingCostProjection, null, 2));
}

main();
