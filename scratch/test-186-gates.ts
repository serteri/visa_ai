import { runReadinessEngine } from "@/lib/readiness/engine";

function run(label: string, extra: Record<string, unknown>) {
  const report = runReadinessEngine({
    locale: "en",
    country: "AU",
    mainGoal: "Employer sponsorship permanent residency",
    currentCountry: "Australia",
    passportCountry: "India",
    age: "50",
    occupation: "Software Engineer",
    englishLevel: "Superior",
    qualificationLevel: "Bachelor's Degree",
    sponsorOrFamily: "Sponsored by my employer",
    preferredPathway: "186",
    ...extra,
  });
  const entry = report.pathwayComparison.find((p) => p.subclass === "186");
  console.log(`\n=== ${label} ===`);
  console.log("relevance:", entry?.relevance);
  console.log("confidenceLevel:", entry?.confidenceLevel);
  console.log("reason:", entry?.reason);
}

// TRT: insufficient tenure (1 year < 2 required)
run("TRT - insufficient tenure", { nominationStream: "trt", yearsInSponsoredPosition: 1, annualSalaryAud: 95000 });

// Direct Entry: age 50 > 45 cap, no exception keywords
run("Direct Entry - over age cap", { nominationStream: "direct_entry", annualSalaryAud: 95000, occupationConfirmed: "yes", offshoreExperienceYears: 4 });

// Below CSIT salary (shared gate, should ineligible regardless of stream)
run("Below CSIT salary", { nominationStream: "trt", yearsInSponsoredPosition: 3, annualSalaryAud: 60000 });

// No stream specified, both look weak -> needs_more_information
run("No stream specified, no tenure/skills data", { annualSalaryAud: 95000 });

// No stream specified, TRT viable
run("No stream specified, TRT viable", { yearsInSponsoredPosition: 3, annualSalaryAud: 95000 });
