import type { ReadinessInput, ReadinessReport } from "@/lib/readiness/types";

/**
 * The compact profile that goes into the PREMIUM system prompt. It is built from exactly one stored report and only
 * for a visitor who proved (restore link) that they control the report's email -- see loadVisitorProfile.
 */

export interface ProfileStore {
  /** Emails this visitor has VERIFIED (opened a restore link sent to that inbox). */
  verifiedEmailsForVisitor(visitorId: string): Promise<string[]>;
  /** The newest stored report for this email (case-insensitive), or null. */
  latestReportForEmail(email: string): Promise<{ reportJson: unknown; inputJson: unknown; createdAt: Date } | null>;
}

const clip = (s: unknown, n: number): string => {
  const t = typeof s === "string" ? s.replace(/\s+/g, " ").trim() : "";
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

const MAX_SUMMARY_CHARS = 2000;

export function buildProfileSummary(
  reportJson: unknown,
  inputJson: unknown,
  createdAt?: Date,
): string | null {
  if (!reportJson || typeof reportJson !== "object") return null;
  const report = reportJson as Partial<ReadinessReport>;
  const input = (inputJson && typeof inputJson === "object" ? inputJson : {}) as Partial<ReadinessInput>;
  const lines: string[] = [];

  const occupation = clip(input.occupation ?? report.occupationIndication?.occupation, 120);
  const code = clip(report.premiumSections?.historicalInvitationTrends?.occupationCode, 12) || clip(input.nocCode, 12);
  if (occupation) lines.push(`Occupation: ${occupation}${code ? ` (code ${code})` : " (code not recorded)"}`);

  const pe = report.pointsEstimate;
  if (pe && typeof pe.estimatedPoints === "number") {
    const parts = (pe.breakdown ?? [])
      .filter((b) => b && typeof b.points === "number")
      .map((b) => `${clip(b.label, 40)} ${b.points}${typeof b.max === "number" ? `/${b.max}` : ""}`);
    const potential = typeof pe.potentialPoints === "number" && pe.potentialPoints !== pe.estimatedPoints ? `, potential ${pe.potentialPoints}` : "";
    lines.push(`Points: ${pe.estimatedPoints}${potential}${parts.length ? ` (${parts.join("; ")})` : ""}`);
  }

  const gates = report.visaGates;
  if (gates && typeof gates === "object") {
    const rows = Object.entries(gates)
      .filter(([, g]) => g && typeof g.status === "string")
      .map(([visa, g]) => {
        const failed = (g.notMet ?? []).slice(0, 2).map((x) => clip(x.label, 70)).filter(Boolean);
        return `${visa}: ${g.status}${failed.length ? ` [${failed.join("; ")}]` : ""}`;
      });
    if (rows.length) lines.push(`Visa gate results: ${rows.join(" | ")}`);
  }

  const avail = report.stateNominationTracker?.nominationAvailability;
  if (avail) {
    const fmt = (v: string[] | undefined) => (v && v.length ? v.join(", ") : "none");
    lines.push(`States open for this occupation: 190 -> ${fmt(avail["190"])}; 491 -> ${fmt(avail["491"])}`);
  }

  const gaps: string[] = [];
  for (const [visa, g] of Object.entries(gates ?? {})) {
    if (g?.belowBenchmark) gaps.push(`${visa}: score ${g.belowBenchmark.score} vs recent invitation benchmark ${g.belowBenchmark.benchmark}`);
  }
  for (const c of report.twoTierStatus?.comparisons ?? []) gaps.push(clip(c, 140));
  if (gaps.length) lines.push(`Benchmark gaps: ${gaps.slice(0, 5).join(" | ")}`);

  if (lines.length === 0) return null;
  const header = `Source: the visitor's own stored LogiVisa report${createdAt ? ` (generated ${createdAt.toISOString().slice(0, 10)})` : ""}.`;
  return [header, ...lines].join("\n").slice(0, MAX_SUMMARY_CHARS);
}

/**
 * The summary for THIS visitor only: reports are looked up by the visitor's own verified emails, never by anything
 * else. A visitor with no verified email, or whose email has no report, gets null (general answers).
 */
export async function loadVisitorProfile(store: ProfileStore, visitorId: string): Promise<string | null> {
  const emails = await store.verifiedEmailsForVisitor(visitorId);
  let newest: { reportJson: unknown; inputJson: unknown; createdAt: Date } | null = null;
  for (const email of emails) {
    const row = await store.latestReportForEmail(email);
    if (row && (!newest || row.createdAt > newest.createdAt)) newest = row;
  }
  return newest ? buildProfileSummary(newest.reportJson, newest.inputJson, newest.createdAt) : null;
}
