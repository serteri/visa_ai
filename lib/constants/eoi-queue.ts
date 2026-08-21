/**
 * EOI Queue page (app/[locale]/(main)/eoi-queue) constants: the occupation
 * categories used for the pill filters, and the row shape used by both the
 * server-fetched OccupationStat data and the client-side filter component.
 */
export const EOI_CATEGORIES = [
  "ALL",
  "HEALTHCARE",
  "EDUCATION",
  "ENGINEERING",
  "ICT",
  "TRADES",
  "BUSINESS",
] as const;

export type EoiCategory = (typeof EOI_CATEGORIES)[number];

export const EOI_CATEGORY_LABEL_KEY: Record<EoiCategory, string> = {
  ALL: "eoiQueue.category.all",
  HEALTHCARE: "eoiQueue.category.healthcare",
  EDUCATION: "eoiQueue.category.education",
  ENGINEERING: "eoiQueue.category.engineering",
  ICT: "eoiQueue.category.ict",
  TRADES: "eoiQueue.category.trades",
  BUSINESS: "eoiQueue.category.business",
};

export const EOI_TRENDS = ["UP", "DOWN", "FROZEN", "STABLE"] as const;
export type EoiTrend = (typeof EOI_TRENDS)[number];

export type OccupationStatRow = {
  id: string;
  anzscoCode: string;
  title: string;
  tier: Exclude<EoiCategory, "ALL">;
  pool189: number;
  pool190: number;
  cutoff189: number | null;
  avgWaitMonths: number | null;
  trend: EoiTrend;
};
