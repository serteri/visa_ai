/**
 * EOI Queue page (app/[locale]/(main)/eoi-queue) constants: the occupation
 * categories used for the pill filters, and static mock data for the table
 * while OccupationStat (prisma/schema.prisma) has no live rows yet. Once
 * that table is seeded, page.tsx's data source swaps to a real Prisma
 * query -- this mock array is only for wiring up and testing the UI.
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

/** Static mock data -- clearly fake figures for UI testing only, per this task's explicit scope. */
export const MOCK_OCCUPATION_STATS: OccupationStatRow[] = [
  {
    id: "1",
    anzscoCode: "254111",
    title: "Registered Nurse",
    tier: "HEALTHCARE",
    pool189: 4820,
    pool190: 1210,
    cutoff189: 85,
    avgWaitMonths: 14,
    trend: "UP",
  },
  {
    id: "2",
    anzscoCode: "134211",
    title: "Nursing Clinical Director",
    tier: "HEALTHCARE",
    pool189: 340,
    pool190: 98,
    cutoff189: 80,
    avgWaitMonths: 9,
    trend: "STABLE",
  },
  {
    id: "3",
    anzscoCode: "241111",
    title: "Early Childhood Teacher",
    tier: "EDUCATION",
    pool189: 1650,
    pool190: 610,
    cutoff189: 75,
    avgWaitMonths: 11,
    trend: "DOWN",
  },
  {
    id: "4",
    anzscoCode: "241411",
    title: "Secondary School Teacher",
    tier: "EDUCATION",
    pool189: 0,
    pool190: 420,
    cutoff189: null,
    avgWaitMonths: null,
    trend: "FROZEN",
  },
  {
    id: "5",
    anzscoCode: "233211",
    title: "Civil Engineer",
    tier: "ENGINEERING",
    pool189: 3120,
    pool190: 890,
    cutoff189: 90,
    avgWaitMonths: 18,
    trend: "UP",
  },
  {
    id: "6",
    anzscoCode: "233512",
    title: "Mechanical Engineer",
    tier: "ENGINEERING",
    pool189: 2410,
    pool190: 705,
    cutoff189: 88,
    avgWaitMonths: 16,
    trend: "STABLE",
  },
  {
    id: "7",
    anzscoCode: "261313",
    title: "Software Engineer",
    tier: "ICT",
    pool189: 6740,
    pool190: 2130,
    cutoff189: 95,
    avgWaitMonths: 22,
    trend: "UP",
  },
  {
    id: "8",
    anzscoCode: "262112",
    title: "ICT Security Specialist",
    tier: "ICT",
    pool189: 1890,
    pool190: 540,
    cutoff189: 85,
    avgWaitMonths: 13,
    trend: "DOWN",
  },
  {
    id: "9",
    anzscoCode: "334111",
    title: "Electrician",
    tier: "TRADES",
    pool189: 0,
    pool190: 260,
    cutoff189: null,
    avgWaitMonths: null,
    trend: "FROZEN",
  },
  {
    id: "10",
    anzscoCode: "351311",
    title: "Chef",
    tier: "TRADES",
    pool189: 980,
    pool190: 610,
    cutoff189: 65,
    avgWaitMonths: 8,
    trend: "STABLE",
  },
  {
    id: "11",
    anzscoCode: "221111",
    title: "Accountant (General)",
    tier: "BUSINESS",
    pool189: 5230,
    pool190: 1440,
    cutoff189: 92,
    avgWaitMonths: 20,
    trend: "UP",
  },
  {
    id: "12",
    anzscoCode: "132411",
    title: "Marketing Manager",
    tier: "BUSINESS",
    pool189: 1120,
    pool190: 380,
    cutoff189: 78,
    avgWaitMonths: 10,
    trend: "DOWN",
  },
];
