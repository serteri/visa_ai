/**
 * The status vocabulary of a state / territory nomination program, in one place (docs/admin-data-design.md section A.2).
 *
 * Current values are offered in the admin panel. Legacy values still exist in old data and in the score formula
 * (a seeded "High Demand" scores differently from "Open (Onshore & Offshore)"), so they stay valid but are no longer offered.
 */

export const CURRENT_STATE_STATUSES = [
  "Open (Onshore & Offshore)",
  "Open (Onshore only)",
  "Open (Offshore only)",
  "Closed with exceptions",
  "Suspended / Closed",
  "Not yet published",
  "Check official page",
] as const;

export const LEGACY_STATE_STATUSES = ["Open for Offshore", "High Demand", "Closed", "Onshore Only", "Open (Onshore Only)", "Open (Offshore Only)"] as const;

export type CurrentStateStatus = (typeof CURRENT_STATE_STATUSES)[number];
export type LegacyStateStatus = (typeof LEGACY_STATE_STATUSES)[number];
export type StateStatus = CurrentStateStatus | LegacyStateStatus;

export const ALL_STATE_STATUSES: readonly StateStatus[] = [...CURRENT_STATE_STATUSES, ...LEGACY_STATE_STATUSES];

export function isStateStatus(value: unknown): value is StateStatus {
  return typeof value === "string" && (ALL_STATE_STATUSES as readonly string[]).includes(value);
}

/** Spelling aliases only (same meaning): the capitalisation of "only" changed. Meaning-changing legacy values ("High Demand") are kept as they are. */
export function normalizeStateStatus(value: string): string {
  switch (value) {
    case "Open (Onshore Only)":
    case "Onshore Only":
      return "Open (Onshore only)";
    case "Open (Offshore Only)":
      return "Open (Offshore only)";
    case "Closed":
      return "Suspended / Closed";
    default:
      return value;
  }
}

/** Closed to new applications, or not yet open: never counted as open, scored at the closed floor. */
export function isClosedStatus(status: string | undefined | null): boolean {
  const s = status ? normalizeStateStatus(status) : "";
  return s === "Suspended / Closed" || s === "Closed with exceptions" || s === "Not yet published";
}

export function isOnshoreOnlyStatus(status: string | undefined | null): boolean {
  return (status ? normalizeStateStatus(status) : "") === "Open (Onshore only)";
}

export function isOffshoreOnlyStatus(status: string | undefined | null): boolean {
  return (status ? normalizeStateStatus(status) : "") === "Open (Offshore only)";
}

/** A status that does not confirm the program is open (the page must be checked): not counted as open either. */
export function isUnconfirmedStatus(status: string | undefined | null): boolean {
  return status === "Check official page";
}

/** The status in the reader's language (the report prints it). Values without a translation are printed as they are. */
const LABELS: Record<string, { tr: string; "zh-Hans": string }> = {
  "Open (Onshore & Offshore)": { tr: "Açık (Avustralya içi ve dışı)", "zh-Hans": "开放（境内和境外）" },
  "Open (Onshore only)": { tr: "Açık (yalnızca Avustralya içi)", "zh-Hans": "开放（仅境内）" },
  "Open (Offshore only)": { tr: "Açık (yalnızca Avustralya dışı)", "zh-Hans": "开放（仅境外）" },
  "Closed with exceptions": { tr: "Kapalı, istisnalarla", "zh-Hans": "已关闭（有例外）" },
  "Suspended / Closed": { tr: "Askıya alındı / kapalı", "zh-Hans": "已暂停 / 已关闭" },
  "Not yet published": { tr: "Henüz yayımlanmadı", "zh-Hans": "尚未公布" },
  "Check official page": { tr: "Resmi sayfayı kontrol edin", "zh-Hans": "请查看官方页面" },
};

export function stateStatusLabel(status: string, locale: "en" | "tr" | "zh-Hans"): string {
  const normalized = normalizeStateStatus(status);
  if (locale === "en") return normalized;
  return LABELS[normalized]?.[locale] ?? normalized;
}
