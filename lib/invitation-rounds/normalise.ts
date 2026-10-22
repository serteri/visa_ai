/**
 * Normalises invitation-round rows read through unstable_cache. The cache stores JSON, so on a cache hit every Date column
 * (roundDate, createdAt) comes back as an ISO string, not a Date: calling Date methods on it threw and returned HTTP 500.
 * Rows that cannot be read (missing or invalid date, non-numeric counts) are dropped; if none remain the page falls back to the seed JSON.
 */
export type RoundView = {
  id: string;
  date: string;
  visaSubclass: string;
  visaName: string;
  invitations: number;
  lowestPoints: number | null;
  poolSize: number | null;
  notes: string | null;
  isEstimated: boolean;
  source: string;
};

function toDate(v: unknown): Date | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

export function normaliseDbRounds(rows: unknown): { rounds: RoundView[]; latestScraped: Date | null } {
  if (!Array.isArray(rows)) return { rounds: [], latestScraped: null };
  const rounds: RoundView[] = [];
  let latest: Date | null = null;
  for (const raw of rows) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const date = toDate(r.roundDate);
    const invitations = num(r.invitations);
    const lowestPoints = num(r.lowestPoints);
    if (!date || invitations === null || typeof r.visaSubclass !== "string") continue;
    rounds.push({
      id: String(r.id ?? `${r.visaSubclass}-${date.toISOString()}`),
      date: date.toISOString().slice(0, 10),
      visaSubclass: r.visaSubclass,
      visaName: typeof r.visaName === "string" ? r.visaName : r.visaSubclass,
      invitations,
      lowestPoints,
      poolSize: num(r.poolSize),
      notes: typeof r.notes === "string" ? r.notes : null,
      isEstimated: r.isEstimated === true,
      source: typeof r.source === "string" ? r.source : "DoHA Official",
    });
    const created = toDate(r.createdAt);
    if (created && (!latest || created.getTime() > latest.getTime())) latest = created;
  }
  return { rounds, latestScraped: latest };
}
