import type { ReadinessReport } from "./types";
import { getEligibilityBadgeState } from "./eligibility-badge";
import { resolveAssessingAuthority } from "../skills-assessment/resolve-authority";

/**
 * Post-generation consistency check, run before a report is shown to the
 * user (see callers in engine.ts / generate-pdf.ts). Catches the class of
 * bug where independently-built sections drift from the same underlying
 * assessmentState: mismatched points across sections, encouraging language
 * shown alongside a blocked EOI status, or a blocked pathway rendered as a
 * strong signal. Returns an empty array when the report is consistent;
 * never throws -- callers log and continue (same graceful-degradation style
 * as the rest of this engine), since a flagged report is still safer to
 * show than none, but the flag must be visible in logs.
 */
export const ENCOURAGING_LANGUAGE_PATTERNS = [
  // Exact phrases seen in the wild.
  /profile is strong/i,
  /proceed directly to the application/i,
  /you can now focus on the application/i,
  /apply now/i,
  /strong fit/i,
  /profiliniz güçlü/i,
  /başvuru sürecine geçebilirsiniz/i,
  /档案较强/i,
  /可以立即开始申请/i,
  // Word-order-flexible: "strong" near "profile"/"fit"/"match" in either
  // order within the same clause (catches "strong profile", "70% match
  // rate — strong profile", "a strong match for this pathway", etc. --
  // paraphrases the exact-phrase list above would miss).
  /\bstrong\b[^.!?]{0,30}\b(profile|fit|match)\b/i,
  /\b(profile|fit|match)\b[^.!?]{0,30}\bstrong\b/i,
  // Points-threshold "passed" badges/status text -- the cover-page hero
  // badge and points gauge bar bug this guards against. Word-order-flexible
  // for the same reason as above.
  /\bthreshold\b[^.!?]{0,20}\bexceeded\b/i,
  /\bexceeded\b[^.!?]{0,20}\bthreshold\b/i,
  /puan barajını aştınız/i,
  /已超过积分门槛/i,
];

/**
 * Scans a single block of free-text for blocked-language violations. Shared
 * between checkReportInvariants (deterministic fields -- log-only, see
 * generatePremiumStrategy's retry/fallback in lib/ai/generate-premium-strategy.ts
 * for the LLM-text path, which is NOT log-only: per-request LLM drift is
 * still possible after this fix, unlike the deterministic sections where
 * drift is now structurally prevented).
 */
export function textMatchesBlockedLanguage(text: string): boolean {
  return ENCOURAGING_LANGUAGE_PATTERNS.some((pattern) => pattern.test(text));
}

export function checkReportInvariants(report: ReadinessReport): string[] {
  const violations: string[] = [];
  const { assessmentState } = report;

  // 1. Every 189/190/491 ranked pathway's pointsSignal must equal the
  // canonical base points figure -- never a bonus-inflated or independently
  // recomputed number.
  const canonicalBase = assessmentState.pathwayPoints?.["189"]?.base;
  if (canonicalBase !== undefined) {
    for (const pathway of report.rankedPathways ?? []) {
      if (
        (pathway.subclass === "189" || pathway.subclass === "190" || pathway.subclass === "491") &&
        pathway.pointsSignal !== undefined &&
        pathway.pointsSignal !== canonicalBase
      ) {
        violations.push(
          `Pathway ${pathway.subclass} shows pointsSignal=${pathway.pointsSignal}, but the canonical points figure is ${canonicalBase}.`
        );
      }
    }
  }

  // 2. Encouraging/"proceed" language must never appear while EOI lodgement
  // is blocked.
  if (!assessmentState.isEoiEligible) {
    const textsToScan = [...report.executiveSummary, ...report.suggestedNextSteps];
    for (const text of textsToScan) {
      if (textMatchesBlockedLanguage(text)) {
        violations.push(
          `EOI is blocked (${assessmentState.eoiIneligibilityReason ?? "reason unspecified"}), but encouraging/"proceed" language was found: "${text}"`
        );
      }
    }

    for (const pathway of report.rankedPathways ?? []) {
      if (
        (pathway.subclass === "189" || pathway.subclass === "190" || pathway.subclass === "491") &&
        pathway.recommendationTag === "🌟 Highly Recommended Pathway"
      ) {
        violations.push(
          `Pathway ${pathway.subclass} is tagged "Highly Recommended" while EOI lodgement is blocked (${assessmentState.eoiIneligibilityReason ?? "reason unspecified"}).`
        );
      }
    }
  }

  // 3. Reference benchmark must be identical across 189/190/491.
  const benchmarks = assessmentState.referenceBenchmarks;
  if (benchmarks) {
    const values = new Set(Object.values(benchmarks));
    if (values.size > 1) {
      violations.push(`referenceBenchmarks differ across pathways: ${JSON.stringify(benchmarks)}`);
    }
  }

  // 4. A hard-ineligible or points-threshold-blocked pathway must never be
  // shown with "stronger_signal" positioning.
  for (const item of report.pathwayStrengthComparison ?? []) {
    if ((item.isHardIneligible || item.isPointsThresholdOnly) && item.relativePosition === "stronger_signal") {
      violations.push(
        `Pathway ${item.subclass} is blocked (isHardIneligible=${item.isHardIneligible}, isPointsThresholdOnly=${item.isPointsThresholdOnly}) but positioned as "stronger_signal".`
      );
    }
  }

  // 5. Badge/status-color regression guard: any renderer using
  // getEligibilityBadgeState() (cover-page hero badge, points gauge bar)
  // must agree with assessmentState.isEoiEligible by construction, since
  // that function derives its output solely from assessmentState. This is
  // largely redundant with the fact that both now call the same function
  // (Part 2.2) -- it exists to catch a future edit to eligibility-badge.ts
  // that makes it diverge from isEoiEligible.
  const badgeState = getEligibilityBadgeState(assessmentState, "en");
  if (badgeState.passed !== assessmentState.isEoiEligible) {
    violations.push(
      `getEligibilityBadgeState() returned passed=${badgeState.passed}, but assessmentState.isEoiEligible=${assessmentState.isEoiEligible} -- the shared badge helper has diverged from the canonical eligibility flag.`
    );
  }

  // 6. Benchmark consistency: within each pathway's reality-check text, the
  // per-round invitation benchmark must not cite conflicting unlabeled numbers.
  // Any secondary threshold (e.g. occupation-specific competitive pressure at 90)
  // must be explicitly labeled as distinct from the per-round benchmark.
  for (const item of report.frictionAnalysis ?? []) {
    const text = item.realityCheck ?? "";
    const benchmarkMatches = Array.from(text.matchAll(/invitation benchmark(?:s)? \((?:is )?(\d+)\)/gi)).map((m) => m[1]);
    const uniqueBenchmarks = new Set(benchmarkMatches);
    if (uniqueBenchmarks.size > 1) {
      violations.push(
        `Pathway ${item.pathway} reality-check text contains multiple conflicting invitation benchmarks: ${Array.from(uniqueBenchmarks).join(", ")}.`
      );
    }
  }

  // 7. Assessing authority consistency: if an occupation resolves to a specific
  // assessing authority (e.g. ACS, AACA, TRA, Engineers Australia), financial
  // roadmap items must cite that authority, not a conflicting generic fallback.
  if (report.assessmentState.occupation) {
    const rawOcc = report.assessmentState.occupation;
    const specificAuthority = resolveAssessingAuthority(rawOcc).authority;

    if (specificAuthority && specificAuthority.authorityId !== "GENERAL") {
      for (const item of report.financialRoadmap ?? []) {
        if (
          item.category.includes("Skills Assessment") ||
          item.category.includes("Beceri Değerlendirmesi") ||
          item.category.includes("技能评估")
        ) {
          const content = `${item.category} ${item.explanation}`;
          if (
            /VETASSESS/i.test(content) &&
            specificAuthority.authorityId !== "VETASSESS"
          ) {
            violations.push(
              `Financial roadmap skills assessment item cites VETASSESS, but occupation "${rawOcc}" resolves to ${specificAuthority.authorityName} (${specificAuthority.authorityId}).`
            );
          }
        }
      }
    }
  }

  return violations;
}

/**
 * Convenience wrapper: runs checkReportInvariants and logs a single
 * console.error with a greppable tag when violations are found. Does not
 * throw or block report generation/rendering.
 */
export function logReportInvariantViolations(report: ReadinessReport, context: string): void {
  const violations = checkReportInvariants(report);
  if (violations.length > 0) {
    console.error(`[report_invariant_violation] (${context})`, violations);
  }
}

/** AU-only sponsorship terms that must never appear in a CA report's Employer Sponsorship section, and vice versa. */
const AU_ONLY_SPONSORSHIP_TERMS = /\b(subclass\s*(482|186)|\b482\b|\b186\b|CSOL|MLTSSL|ENS|Employer Nomination Scheme|Skills in Demand)\b/i;
const CA_ONLY_SPONSORSHIP_TERMS = /\b(LMIA|PNP|Labour Market Impact Assessment|Provincial Nominee)\b/i;

/**
 * Scans the rendered Employer Sponsorship module content (built by
 * lib/readiness/pdf-content/employer-sponsorship.ts) for the other
 * country's terminology -- this content isn't stored on ReadinessReport
 * (it's computed on-the-fly at render time from assessmentState.
 * employerSponsorship), so it can't be covered by checkReportInvariants'
 * scan over report fields; called directly from the render path instead
 * (pdf-personalized-content.ts), same non-blocking log-and-continue style.
 */
export function checkEmployerSponsorshipTerminology(
  content: { title: string; intro: string; rows: Array<{ label: string; value: string }>; note?: string },
  country: "AU" | "CA"
): string[] {
  const texts = [content.title, content.intro, ...content.rows.map((r) => `${r.label}: ${r.value}`), content.note ?? ""];
  const wrongCountryPattern = country === "CA" ? AU_ONLY_SPONSORSHIP_TERMS : CA_ONLY_SPONSORSHIP_TERMS;
  return texts.filter((t) => wrongCountryPattern.test(t));
}
