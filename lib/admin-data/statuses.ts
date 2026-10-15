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

/** The program year the stored content describes is older than this when the state has not published the current year's settings yet. */
export const CURRENT_PROGRAM_YEAR = "2026-27";

/** "2026-27 not yet published" for a row whose content describes an earlier year; null when the row holds the current year. */
export function nextYearNotPublishedNote(programYear: string): string | null {
  return programYear < CURRENT_PROGRAM_YEAR ? `${CURRENT_PROGRAM_YEAR} not yet published` : null;
}

export type AvailabilityPair = { onshore: Array<"open" | "priority" | "closed" | "unknown">; offshore: Array<"open" | "limited" | "closed" | "unknown"> };

/**
 * The scoring availabilities a status allows (null = no constraint: a legacy status keeps the inputs it was scored with). Scoring inputs are derived from
 * the status and must never contradict it. `exception` is the side an exception on the row opens ("closed except the exception").
 */
export function allowedAvailability(status: string, exception: "onshore" | "offshore" | "all" | null): AvailabilityPair | null {
  switch (normalizeStateStatus(status)) {
    case "Suspended / Closed":
      return { onshore: ["closed"], offshore: ["closed"] };
    case "Check official page":
    case "Not yet published":
      return { onshore: ["unknown"], offshore: ["unknown"] };
    case "Closed with exceptions":
      return { onshore: exception === "onshore" || exception === "all" ? ["closed", "priority"] : ["closed"], offshore: exception === "offshore" || exception === "all" ? ["closed", "limited"] : ["closed"] };
    case "Open (Onshore only)":
      return { onshore: ["open", "priority"], offshore: exception === "offshore" || exception === "all" ? ["closed", "limited"] : ["closed"] };
    case "Open (Offshore only)":
      return { onshore: exception === "onshore" || exception === "all" ? ["closed", "priority"] : ["closed"], offshore: ["open", "limited"] };
    case "Open (Onshore & Offshore)":
      return { onshore: ["open", "priority"], offshore: ["open", "limited"] };
    default:
      return null;
  }
}

/** The availabilities a status implies, used to seed the scoring inputs (null for a legacy status: the dataset value is kept). */
export function availabilityFor(status: string): { onshore: "open" | "closed" | "unknown"; offshore: "open" | "closed" | "unknown" } | null {
  switch (normalizeStateStatus(status)) {
    case "Suspended / Closed":
    case "Closed with exceptions":
      return { onshore: "closed", offshore: "closed" };
    case "Check official page":
    case "Not yet published":
      return { onshore: "unknown", offshore: "unknown" };
    case "Open (Onshore only)":
      return { onshore: "open", offshore: "closed" };
    case "Open (Offshore only)":
      return { onshore: "closed", offshore: "open" };
    case "Open (Onshore & Offshore)":
      return { onshore: "open", offshore: "open" };
    default:
      return null;
  }
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

export function stateStatusLabel(status: string, locale: string): string {
  const normalized = normalizeStateStatus(status);
  if (locale === "en") return normalized;
  return (LABELS[normalized] as Record<string, string> | undefined)?.[locale] ?? normalized;
}
