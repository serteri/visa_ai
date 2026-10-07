/**
 * Report mode and the Canada switch (server-side environment flags; never NEXT_PUBLIC_).
 *
 *   READINESS_REPORT_MODE   REVIEW (default; anything unset or unrecognised) | INFORMATION | DISABLED
 *   CANADA_REPORT_ENABLED   "true" turns Canada report generation back on; any other value (or unset) keeps it off
 *
 * Canada report generation is disabled during the beta: the Canada engine, PDF code and stored Canada reports stay in the
 * repository and stay viewable; only the creation of a NEW Canada report is switched off. DISABLED mode switches off
 * report generation for every country.
 */
export type ReadinessReportMode = "REVIEW" | "INFORMATION" | "DISABLED";

export const REPORT_MODE_ENV = "READINESS_REPORT_MODE";
export const CANADA_REPORT_FLAG = "CANADA_REPORT_ENABLED";

export function readinessReportMode(env: Record<string, string | undefined> = process.env): ReadinessReportMode {
  const v = env[REPORT_MODE_ENV]?.trim().toUpperCase();
  return v === "INFORMATION" || v === "DISABLED" ? v : "REVIEW";
}

export function isCanadaReportEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env[CANADA_REPORT_FLAG] === "true" && readinessReportMode(env) !== "DISABLED";
}

/** Neutral wording shown when a Canada report is requested while it is switched off. */
export const CANADA_REPORT_UNAVAILABLE: Record<"en" | "tr" | "zh-Hans", string> = {
  en: "Canada reports are not available during the beta.",
  tr: "Kanada raporları beta döneminde kullanılamıyor.",
  "zh-Hans": "测试期间暂不提供加拿大报告。",
};
