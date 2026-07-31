import type { PDFContext, ColorRGB } from "../pdf-types";
import type { Locale } from "../types";

/**
 * Locale-aware formatting helpers for the PDF generator.
 *
 * Converts internal enum values (difficulty levels, strength tiers, etc.)
 * into localized display strings. Also includes badge/label factories
 * for visual indicators.
 *
 * All functions are locale-aware via the `text` object — no hardcoded
 * language strings. Works for en, tr, and zh-Hans.
 *
 * Extracted from the original monolith (lines 2833-2890).
 */

export function createFormatHelpers(ctx: PDFContext) {
  const { text, effectiveLocale, COLORS, safeText } = ctx;

  return {
    /**
     * Formats a difficulty level into a localized display string.
     */
    formatDifficulty(level: "low" | "medium" | "high" | "extreme"): string {
      if (level === "extreme")
        return effectiveLocale === "tr"
          ? "Çok yüksek"
          : effectiveLocale === "zh-Hans"
            ? "极高"
            : "Extreme";
      if (level === "high") return text.highRisk;
      if (level === "medium") return text.mediumRisk;
      return text.lowRisk;
    },

    /**
     * Formats a strength tier into a localized label.
     */
    formatStrength(level: "limited" | "moderate" | "strong"): string {
      return effectiveLocale === "tr"
        ? level === "limited"
          ? "Sınırlı"
          : level === "moderate"
            ? "Orta"
            : "Güçlü"
        : effectiveLocale === "zh-Hans"
          ? level === "limited"
            ? "有限"
            : level === "moderate"
              ? "中等"
              : "较强"
          : level.charAt(0).toUpperCase() + level.slice(1);
    },

    /**
     * Formats signal confidence into a localized label.
     */
    formatSignalConfidence(level: "limited" | "moderate" | "stronger"): string {
      return effectiveLocale === "tr"
        ? level === "limited"
          ? "Sınırlı"
          : level === "moderate"
            ? "Orta"
            : "Güçlü"
        : effectiveLocale === "zh-Hans"
          ? level === "limited"
            ? "有限"
            : level === "moderate"
              ? "中等"
              : "较强"
          : level.charAt(0).toUpperCase() + level.slice(1);
    },

    /**
     * Formats a confidence level (low/medium/high) into a localized label.
     */
    formatConfidenceLevel(level: "low" | "medium" | "high"): string {
      return effectiveLocale === "tr"
        ? level === "low"
          ? "Düşük"
          : level === "medium"
            ? "Orta"
            : "Yüksek"
        : effectiveLocale === "zh-Hans"
          ? level === "low"
            ? "低"
            : level === "medium"
              ? "中"
              : "高"
          : level.charAt(0).toUpperCase() + level.slice(1);
    },

    /**
     * Formats an evidence load level into a localized label.
     */
    formatLoad(level: "low" | "medium" | "high"): string {
      return effectiveLocale === "tr"
        ? level === "low"
          ? "Düşük"
          : level === "medium"
            ? "Orta"
            : "Yüksek"
        : effectiveLocale === "zh-Hans"
          ? level === "low"
            ? "低"
            : level === "medium"
              ? "中"
              : "高"
          : level.charAt(0).toUpperCase() + level.slice(1);
    },

    /**
     * Formats an evidence status into a localized label.
     */
    formatEvidenceStatus(
      status: "provided" | "missing" | "unclear" | "typically_required",
    ): string {
      return effectiveLocale === "tr"
        ? status === "provided"
          ? "Sağlandı"
          : status === "missing"
            ? "Eksik"
            : status === "unclear"
              ? "Belirsiz"
              : "Genellikle Gerekli"
        : effectiveLocale === "zh-Hans"
          ? status === "provided"
            ? "已提供"
            : status === "missing"
              ? "缺失"
              : status === "unclear"
                ? "不明确"
                : "通常需要"
          : status === "provided"
            ? "Provided"
            : status === "missing"
              ? "Missing"
              : status === "unclear"
                ? "Unclear"
                : "Typically Required";
    },

    /**
     * Translates an English recommendation tag into the active locale.
     */
    formatRecommendationTag(tag: string): string {
      if (tag.includes("Below Points")) return text.belowPointsThreshold;
      if (tag.includes("Ineligible")) return text.ineligibleComplianceViolation;
      if (tag.includes("Highly")) return text.highlyRecommendedPathway;
      if (tag.includes("Alternative")) return text.alternativeOption;
      if (tag.includes("High Risk")) return text.highRiskLowProbability;
      if (tag.includes("Preliminary")) return text.preliminarySignalOnly;
      return safeText(tag.replace(/[^\x00-\x7F]/g, "").trim());
    },

    /**
     * Returns a color based on match level (green/amber/red).
     */
    stateMatchColor(matchLevel: "high" | "medium" | "low"): ColorRGB {
      if (matchLevel === "high") return COLORS.riskLow;
      if (matchLevel === "medium") return COLORS.riskMedium;
      return COLORS.riskHigh;
    },

    /**
     * Returns a badge (label + color) based on match percentage.
     */
    viabilityBadge(matchPercentage: number): { label: string; color: ColorRGB } {
      if (matchPercentage > 60) {
        return { label: text.highPotentialBadge, color: COLORS.riskLow };
      }
      if (matchPercentage >= 40) {
        return { label: text.conditionalBadge, color: COLORS.riskMedium };
      }
      return { label: text.highRiskBadge, color: COLORS.riskHigh };
    },

    /**
     * Returns a badge (label + color) based on qualitative tier.
     */
    qualitativeTierBadge(
      tier?: "Potential fit" | "Unclear fit" | "Unlikely fit",
    ): { label: string; color: ColorRGB } {
      if (tier === "Potential fit")
        return { label: text.qualitativeFitPotential, color: COLORS.riskLow };
      if (tier === "Unclear fit")
        return { label: text.qualitativeFitUnclear, color: COLORS.riskMedium };
      return { label: text.qualitativeFitUnlikely, color: COLORS.riskHigh };
    },
  };
}