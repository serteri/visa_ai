import type { ReadinessInput, ReadinessReport } from "@/lib/readiness/types";
import { pathwayStatusLabel } from "@/lib/readiness/visa-gates";

import { visitorAuthorityFee } from "./authority-fees";
import { residenceFacts, residenceLines } from "./residence";

import { isMissingTableError, type QuickProfileStore } from "./quick-profile";

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

const MAX_SUMMARY_CHARS = 3000;

export function buildProfileSummary(
  reportJson: unknown,
  inputJson: unknown,
  createdAt?: Date,
  origin: "report" | "quick" = "report",
): string | null {
  if (!reportJson || typeof reportJson !== "object") return null;
  const report = reportJson as Partial<ReadinessReport>;
  const input = (inputJson && typeof inputJson === "object" ? inputJson : {}) as Partial<ReadinessInput>;
  const lines: string[] = [];

  if (input.currentVisaSubclass) {
    lines.push(`Current visa: ${input.currentVisaSubclass === "none" ? "no Australian visa / outside Australia" : input.currentVisaSubclass === "other" ? "another visa" : `subclass ${clip(input.currentVisaSubclass, 8)}`}`);
  }
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
        return `${visa}: ${pathwayStatusLabel(g, "en")}${failed.length ? ` [${failed.join("; ")}]` : ""}`;
      });
    if (rows.length) lines.push(`Status by visa (LogiVisa labels): ${rows.join(" | ")}`);
  }

  const avail = report.stateNominationTracker?.nominationAvailability;
  if (avail) {
    const fmt = (v: string[] | undefined) => (v && v.length ? v.join(", ") : "none");
    lines.push(`States open for this occupation: 190 -> ${fmt(avail["190"])}; 491 -> ${fmt(avail["491"])}`);
  }

  // Residence and the assessment fee only add to a profile that already has report content (an empty report stays empty).
  const fee = lines.length > 0 ? visitorAuthorityFee(input) : undefined;
  if (lines.length > 0) lines.push(...residenceLines(residenceFacts(input)));
  if (fee) {
    const money = (n: number) => `AUD ${n.toLocaleString("en-AU", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
    const gst = fee.otherGstAmountAUD === undefined ? "" : fee.otherGstAmountAUD < fee.amountAUD ? ` incl. GST (applying from within Australia; ${money(fee.otherGstAmountAUD)} excl. GST, as the authority states it)` : ` excl. GST (applying from outside Australia; ${money(fee.otherGstAmountAUD)} incl. GST)`;
    lines.push(`Skills assessment fee in the visitor's report: ${fee.authority} (${fee.authorityId}), ${fee.pathway} pathway, ${money(fee.amountAUD)}${gst}${fee.estimated ? " (estimate pending verification)" : ""}. Other pathways of the same authority cost differently: name the pathway whenever you quote an assessment fee.`);
  }

  const blocked = report.stateNominationTracker?.conditionBlocked;
  if (blocked) {
    const rows = (["190", "491"] as const).flatMap((sub) => (blocked[sub] ?? []).map((b) => `${sub} -> ${b.code} (${b.reason})`));
    if (rows.length) lines.push(`Not available on the visitor's answers (state stream condition unmet): ${rows.join("; ")}`);
  }

  const gaps: string[] = [];
  for (const [visa, g] of Object.entries(gates ?? {})) {
    if (g?.belowBenchmark) gaps.push(`${visa}: score ${g.belowBenchmark.score} vs recent invitation benchmark ${g.belowBenchmark.benchmark}`);
  }
  for (const c of report.twoTierStatus?.comparisons ?? []) gaps.push(clip(c, 140));
  if (gaps.length) lines.push(`Benchmark gaps: ${gaps.slice(0, 5).join(" | ")}`);

  if (lines.length === 0) return null;
  const header = origin === "quick"
    ? `Source: the LogiVisa report engine, run on the visitor's quick profile card${createdAt ? ` (saved ${createdAt.toISOString().slice(0, 10)})` : ""}.`
    : `Source: the visitor's own stored LogiVisa report${createdAt ? ` (generated ${createdAt.toISOString().slice(0, 10)})` : ""}.`;
  return [header, ...lines].join("\n").slice(0, MAX_SUMMARY_CHARS);
}

export type LoadedProfile = { summary: string; source: "report" | "quick"; input: Partial<ReadinessInput>; /** The stored engine report (for the opening summary). */ report: unknown };

/**
 * The summary for THIS visitor only: reports are looked up by the visitor's own verified emails, never by anything
 * else. A visitor with no verified email, or whose email has no report, gets null (general answers).
 */
export async function loadVisitorProfile(store: ProfileStore, visitorId: string): Promise<string | null> {
  return (await loadLinkedReport(store, visitorId))?.summary ?? null;
}

/** The visitor's linked report (by a verified email), summarised; null without one. */
export async function loadLinkedReport(store: ProfileStore, visitorId: string): Promise<LoadedProfile | null> {
  const emails = await store.verifiedEmailsForVisitor(visitorId);
  let newest: { reportJson: unknown; inputJson: unknown; createdAt: Date } | null = null;
  for (const email of emails) {
    const row = await store.latestReportForEmail(email);
    if (row && (!newest || row.createdAt > newest.createdAt)) newest = row;
  }
  if (!newest) return null;
  const summary = buildProfileSummary(newest.reportJson, newest.inputJson, newest.createdAt, "report");
  return summary ? { summary, source: "report", input: (newest.inputJson ?? {}) as Partial<ReadinessInput>, report: newest.reportJson } : null;
}

/**
 * The profile the premium answer uses: the linked report when there is one, otherwise the quick profile card's engine
 * result. A missing quick-profile table (not created yet) reads as "no quick profile".
 */
export async function loadChatProfile(store: ProfileStore, quick: QuickProfileStore | undefined, visitorId: string): Promise<LoadedProfile | null> {
  const linked = await loadLinkedReport(store, visitorId);
  if (linked || !quick) return linked;
  let row: Awaited<ReturnType<QuickProfileStore["get"]>> = null;
  try {
    row = await quick.get(visitorId);
  } catch (err) {
    if (!isMissingTableError(err)) throw err;
  }
  if (!row) return null;
  const summary = buildProfileSummary(row.reportJson, row.inputJson, row.updatedAt, "quick");
  return summary ? { summary, source: "quick", input: (row.inputJson ?? {}) as Partial<ReadinessInput>, report: row.reportJson } : null;
}
