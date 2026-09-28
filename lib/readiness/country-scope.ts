import type { ReadinessReport } from "./types";

// Moved from app/[locale]/(main)/full-check/actions.ts so the PDF download path (lib/reports/refresh-report.ts) applies
// the same country-scope guards as submission.

export function enforceCountryReportScope(report: ReadinessReport, country: "AU" | "CA"): ReadinessReport {
  const sanitized: ReadinessReport = {
    ...report,
    country,
  };

  if (country === "CA") {
    sanitized.rankedPathways = undefined;
    sanitized.stateNominationTracker = undefined;
    sanitized.lodgementReadyChecklist = undefined;
    sanitized.pathwayComparison = (report.pathwayComparison ?? []).filter(
      (item) => !["189", "190", "491"].includes(item.subclass)
    );

    if (sanitized.pathwayComparison.length === 0) {
      sanitized.pathwayComparison = [
        {
          subclass: "general",
          visaName: report.country === "CA" && report.pathwayComparison?.[0]?.visaName
            ? report.pathwayComparison[0].visaName
            : "Canada Express Entry",
          reason: "Country scope forced to Canada. Australian subclasses were removed.",
          relevance: "needs_more_information",
          confidenceLevel: "low",
          confidenceExplanation: "Country scope is Canada-only and requires more Canada-specific profile detail.",
          difficulty: "medium",
          requirementType: "Canada-only eligibility signals",
          userRelativePosition: "Needs more Canada-specific information",
          keyRequirements: ["CRS signal", "NOC/TEER alignment", "Language test profile"],
          pathwaySpecificRisks: ["Australian pathway data is intentionally excluded."],
        },
      ];
    }
  }

  if (country === "AU") {
    sanitized.pathwayComparison = (report.pathwayComparison ?? []).filter(
      (item) => !["CEC", "FSW", "FSTP", "AIP", "FAMILY_SPONSORSHIP", "PNP"].includes(item.subclass)
    );
  }

  return sanitized;
}

// ─── Country-specific report schema guards ───────────────────────────────────

const AU_PATHWAY_SUBCLASSES = new Set(["500", "485", "482", "189", "190", "491", "820", "801", "186", "general"]);
const CA_PATHWAY_SUBCLASSES = new Set(["CEC", "FSW", "FSTP", "AIP", "FAMILY_SPONSORSHIP", "PNP", "general"]);

export function ensureCountrySpecificReportSchema(report: ReadinessReport, country: "AU" | "CA"): ReadinessReport {
  const sanitized = enforceCountryReportScope(report, country);

  if (country === "CA") {
    const invalidPathway = (sanitized.pathwayComparison ?? []).find(
      (item) => !CA_PATHWAY_SUBCLASSES.has(item.subclass)
    );

    if (invalidPathway) {
      throw new Error(`Invalid Canada pathway schema key: ${invalidPathway.subclass}`);
    }

    if (sanitized.rankedPathways && sanitized.rankedPathways.length > 0) {
      throw new Error("Invalid Canada schema: rankedPathways must be omitted for CA reports.");
    }

    if (sanitized.stateNominationTracker) {
      throw new Error("Invalid Canada schema: stateNominationTracker must be omitted for CA reports.");
    }

    if (sanitized.lodgementReadyChecklist) {
      throw new Error("Invalid Canada schema: lodgementReadyChecklist must be omitted for CA reports.");
    }
  }

  if (country === "AU") {
    const invalidPathway = (sanitized.pathwayComparison ?? []).find(
      (item) => !AU_PATHWAY_SUBCLASSES.has(item.subclass)
    );

    if (invalidPathway) {
      throw new Error(`Invalid Australia pathway schema key: ${invalidPathway.subclass}`);
    }
  }

  return sanitized;
}

