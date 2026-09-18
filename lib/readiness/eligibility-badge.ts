import type { AssessmentState, Locale } from "./types";

/**
 * Key into the PDF renderer's local COLORS object (generate-pdf.ts /
 * pdf-personalized-content.ts) -- kept as a string key rather than an
 * imported color value so this module stays decoupled from jsPDF and can be
 * reused by any future non-PDF renderer (e.g. a React status chip) without
 * dragging PDF color constants along.
 */
export type EligibilityBadgeColorKey = "riskLow" | "accent" | "riskHigh";

export type EligibilityBadgeState = {
  /** True only when the points threshold is met AND EOI lodgement is not blocked for any other reason. */
  passed: boolean;
  colorKey: EligibilityBadgeColorKey;
  label: string;
};

const LABELS: Record<"exceeded" | "belowPoints" | "blocked", Record<Locale, string>> = {
  exceeded: {
    en: "Points threshold exceeded",
    tr: "Puan barajını aştınız",
    "zh-Hans": "已超过积分门槛",
  },
  belowPoints: {
    en: "Below points threshold",
    tr: "Puan barajının altında",
    "zh-Hans": "未达积分门槛",
  },
  blocked: {
    en: "Pathway Blocked — Action Required",
    tr: "Yol Engellendi — Eyleme Geçin Gerekiyor",
    "zh-Hans": "路径受阻——需要采取行动",
  },
};

/**
 * Canonical passed/blocked visual state for any UI element that shows a
 * points-threshold badge, gauge, or status color -- derived ONLY from
 * assessmentState.isEoiEligible / eoiIneligibilityReason, never from raw
 * arithmetic on estimatedPoints. This is what closes the gap that let the
 * cover-page hero badge and points gauge bar independently recompute
 * `estimatedPoints >= 65` and print "Points threshold exceeded" on a report
 * whose EOI lodgement was actually blocked (e.g. missing Skills Assessment).
 *
 * Three states, not two: a raw "did the number clear the bar" boolean loses
 * the distinction between "didn't hit the number" and "hit the number but
 * still can't lodge" -- the second case is exactly the contradiction this
 * function exists to prevent, so it gets its own label rather than being
 * folded into "below threshold" (factually wrong) or "exceeded" (misleading).
 */
export function getEligibilityBadgeState(
  assessmentState: AssessmentState,
  locale: Locale
): EligibilityBadgeState {
  if (assessmentState.isEoiEligible) {
    return { passed: true, colorKey: "riskLow", label: LABELS.exceeded[locale] };
  }
  if (assessmentState.eoiIneligibilityReason === "points") {
    return { passed: false, colorKey: "accent", label: LABELS.belowPoints[locale] };
  }
  return { passed: false, colorKey: "riskHigh", label: LABELS.blocked[locale] };
}
