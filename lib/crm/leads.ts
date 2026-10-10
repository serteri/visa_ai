import { prisma } from "@/lib/prisma";
import { AGENT_GUIDE_POOL_ENABLED } from "@/lib/crm/agent-access";
import { PDF_LEAD_SOURCES } from "@/lib/crm/pdf-lead-sources";
import { isMissingColumnError } from "@/lib/db/missing-relation";

export const DOC_STATUSES = ["New", "Contacted", "Documents Pending", "Approved", "Rejected"] as const;
export type DocStatus = (typeof DOC_STATUSES)[number];

// ── Lead lists / details (agent-scoped) ─────────────────────────────────────

export type LeadSort = "newest" | "oldest";
export type LeadSortField = "name" | "tier" | "status" | "createdAt";
export type SortOrder = "asc" | "desc";

/** ADMIN ONLY: carries client names, emails and phones. Agent-facing views use getAgentReferrals (no client details). Leads assigned to one agent, optionally filtered by tier/status and sorted
 *  by a chosen column. Always scoped by agentId so an agent can only ever see
 *  their own pool. `sortField`/`order` (used by the admin agent-detail table)
 *  take precedence over the older `sort` shorthand (used by the agent's own
 *  dashboard) when both are present. */
export async function getAgentLeadsForAdmin(
  agentId: string,
  opts: { tier?: string; status?: string; sort?: LeadSort; sortField?: LeadSortField; order?: SortOrder } = {}
) {
  const where: { agentId: string; pointsTier?: string; docStatus?: string } = { agentId };
  if (opts.tier === "Hot" || opts.tier === "Warm" || opts.tier === "Cold") {
    where.pointsTier = opts.tier;
  }
  if (opts.status && (DOC_STATUSES as readonly string[]).includes(opts.status)) {
    where.docStatus = opts.status;
  }

  const order: SortOrder = opts.order ?? (opts.sort === "oldest" ? "asc" : "desc");
  const orderBy =
    opts.sortField === "name"
      ? { fullName: order }
      : opts.sortField === "tier"
        ? { pointsTier: order }
        : opts.sortField === "status"
          ? { docStatus: order }
          : { createdAt: order };

  try {
    return await prisma.userReport.findMany({
      where,
      orderBy,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        pointsTier: true,
        source: true,
        docStatus: true,
        createdAt: true,
      },
    });
  } catch (error) {
    if (isMissingColumnError(error, "agent_id")) return [];
    throw error;
  }
}

/** Admin-only: fetches any lead by id, unscoped by agent ownership. */
export async function getLeadById(leadId: string) {
  return prisma.userReport.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      pointsTier: true,
      leadTier: true,
      source: true,
      preferredPath: true,
      locale: true,
      isUnlocked: true,
      paymentStatus: true,
      createdAt: true,
      reportJson: true,
      inputJson: true,
      docStatus: true,
      agentNotes: true,
      market: true,
      agentId: true,
    },
  });
}

/**
 * What an agent may see of a referred report while client details are not shared (no consent yet): a reference, dates, the purchase state, the
 * workflow status and the agent's own notes. Never a name, email, phone, tier, entered details or the report. Scoped to the agent's own rows.
 */
export type AgentReferral = {
  id: string;
  createdAt: Date;
  source: string;
  docStatus: string | null;
  isUnlocked: boolean;
  /** Paid through Stripe (a free-beta or admin unlock is not a purchase). */
  isPaid: boolean;
};

const AGENT_REFERRAL_SELECT = { id: true, createdAt: true, source: true, docStatus: true, isUnlocked: true, paymentStatus: true, unlockMethod: true } as const;

type ReferralRow = { id: string; createdAt: Date; source: string; docStatus: string | null; isUnlocked: boolean; paymentStatus: string; unlockMethod: string | null };

const toReferral = (r: ReferralRow): AgentReferral => ({
  id: r.id,
  createdAt: r.createdAt,
  source: r.source,
  docStatus: r.docStatus,
  isUnlocked: r.isUnlocked,
  isPaid: r.paymentStatus === "paid" && r.unlockMethod === "payment",
});

// Agent-facing reads/writes never include guide-download / lead-magnet leads while AGENT_GUIDE_POOL_ENABLED is false.
const agentScope = (): { source?: { notIn: string[] } } => (AGENT_GUIDE_POOL_ENABLED ? {} : { source: { notIn: PDF_LEAD_SOURCES } });

/** The agent's referred reports, newest first (or oldest), without any client detail. */
export async function getAgentReferrals(agentId: string, opts: { sort?: LeadSort } = {}): Promise<AgentReferral[]> {
  try {
    const rows = await prisma.userReport.findMany({
      where: { agentId, ...agentScope() },
      orderBy: { createdAt: opts.sort === "oldest" ? "asc" : "desc" },
      select: AGENT_REFERRAL_SELECT,
    });
    return (rows as unknown as ReferralRow[]).map(toReferral);
  } catch (error) {
    if (isMissingColumnError(error, "agent_id")) return [];
    throw error;
  }
}

/** One referred report, scoped to the owning agent (null if not theirs), without any client detail. */
export async function getAgentLead(agentId: string, leadId: string): Promise<(AgentReferral & { agentNotes: string | null }) | null> {
  try {
    const row = await prisma.userReport.findFirst({
      where: { id: leadId, agentId, ...agentScope() },
      select: { ...AGENT_REFERRAL_SELECT, agentNotes: true },
    });
    return row ? { ...toReferral(row as unknown as ReferralRow), agentNotes: (row as unknown as { agentNotes: string | null }).agentNotes } : null;
  } catch (error) {
    if (isMissingColumnError(error, "agent_id")) return null;
    throw error;
  }
}

// ── Agent directory + performance metrics (admin) ───────────────────────────

export type AgentMetrics = { total: number; hot: number; warm: number; cold: number };

function emptyMetrics(): AgentMetrics {
  return { total: 0, hot: 0, warm: 0, cold: 0 };
}

function addTier(metrics: AgentMetrics, tier: string | null, count: number) {
  metrics.total += count;
  if (tier === "Hot") metrics.hot += count;
  else if (tier === "Warm") metrics.warm += count;
  else if (tier === "Cold") metrics.cold += count;
}

/** One grouped query → per-agent tier breakdown for the whole admin table. */
export async function getAllAgentMetrics(): Promise<Map<string, AgentMetrics>> {
  const map = new Map<string, AgentMetrics>();
  let rows;
  try {
    rows = await prisma.userReport.groupBy({
      by: ["agentId", "pointsTier"],
      where: { agentId: { not: null } },
      _count: { _all: true },
    });
  } catch (error) {
    if (isMissingColumnError(error, "agent_id")) return map;
    throw error;
  }
  for (const row of rows) {
    if (!row.agentId) continue;
    const metrics = map.get(row.agentId) ?? emptyMetrics();
    addTier(metrics, row.pointsTier, row._count._all);
    map.set(row.agentId, metrics);
  }
  return map;
}

/** Tier breakdown for a single agent. */
export async function getAgentMetrics(agentId: string): Promise<AgentMetrics> {
  const rows = await prisma.userReport.groupBy({
    by: ["pointsTier"],
    where: { agentId },
    _count: { _all: true },
  });
  const metrics = emptyMetrics();
  for (const row of rows) addTier(metrics, row.pointsTier, row._count._all);
  return metrics;
}

/** All AGENT-role users (the login accounts, not the marketing directory). */
export async function getAgents() {
  return prisma.user.findMany({
    where: { role: "AGENT" },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, image: true, market: true, approvalStatus: true, createdAt: true },
  });
}

/** One agent user (null if the id isn't an AGENT). */
/** The AGENT account for a referral id only when an admin has approved it: pending and rejected agents are never attributed a referral. */
export async function getApprovedAgentUser(id: string) {
  const agent = await getAgentUser(id);
  return agent && agent.approvalStatus === "APPROVED" ? agent : null;
}

export async function getAgentUser(id: string) {
  return prisma.user.findFirst({
    where: { id, role: "AGENT" },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      phone: true,
      companyName: true,
      address: true,
      approvalStatus: true,
      createdAt: true,
    },
  });
}

/** AGENT-role users awaiting admin approval -- feeds the dedicated pending-review queue. */
export async function getPendingAgents() {
  return prisma.user.findMany({
    where: { role: "AGENT", approvalStatus: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, phone: true, companyName: true, createdAt: true },
  });
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Splits a single captured full name into first/last for the CRM detail view. */
export function splitName(fullName?: string | null): { firstName: string; lastName: string } {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}
// ── Agent Lead Pool (PDF-guide leads, unassigned) ───────────────────────────
//
// Global Guide + Occupation List leads sit in a shared pool any agent can
// claim from. Turkish Guide leads are Turkey-market only -- filtered out
// here unless the requesting agent's `market` is "TR", so a global agent
// never even sees them in the pool query, not just in the UI.
export async function getLeadPool(agentMarket: string | null | undefined) {
  if (!AGENT_GUIDE_POOL_ENABLED) return [];
  try {
    return await prisma.userReport.findMany({
      where: {
        agentId: null,
        source: { in: PDF_LEAD_SOURCES },
        ...(agentMarket === "TR" ? {} : { market: { not: "TR" } }),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        source: true,
        market: true,
        docStatus: true,
        createdAt: true,
      },
    });
  } catch (error) {
    if (isMissingColumnError(error, "agent_id") || isMissingColumnError(error, "market")) return [];
    throw error;
  }
}

/** Claims a pool lead for the given agent -- no-ops (returns false) if it was already claimed. */
export async function claimLead(agentId: string, leadId: string): Promise<boolean> {
  if (!AGENT_GUIDE_POOL_ENABLED) return false;
  const result = await prisma.userReport.updateMany({
    where: { id: leadId, agentId: null },
    data: { agentId },
  });
  return result.count > 0;
}

/** Updates doc-review status only -- scoped to the owning agent. */
export async function updateLeadStatus(
  agentId: string,
  leadId: string,
  docStatus: string
): Promise<boolean> {
  const result = await prisma.userReport.updateMany({
    where: { id: leadId, agentId, ...agentScope() },
    data: { docStatus },
  });
  return result.count > 0;
}

// ── Agent notes log ──────────────────────────────────────────────────────────
//
// Simple append-only activity log, stored as JSON in the existing
// UserReport.agentNotes text column (no new table/column needed -- notes
// are timestamped, newest first). A plain-text value written before this
// format existed (or by any other path) is surfaced as one undated legacy
// entry rather than discarded.

export type NoteEntry = { text: string; at: string };

export function parseNotes(raw: string | null | undefined): NoteEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as NoteEntry[];
  } catch {
    return [{ text: raw, at: "" }];
  }
  return [];
}

// appendLeadNote (wrote to UserReport.agentNotes) was removed once the
// LeadNote model + addLeadNoteAction (lib/crm/notes-actions.ts) replaced it
// as the write path for new notes -- parseNotes/NoteEntry stay here so
// existing agentNotes JSON blobs can still be read and shown, read-only, for
// continuity with notes written before this migration.

/** Also fetches inputJson/reportJson/source so the CRM dashboard's
 *  LeadDetailSheet (app/[locale]/(portal)/admin/crm/dashboard/lead-assigner.tsx)
 *  can show a lead's full full-check profile without a second round-trip or
 *  navigating away from the pool. */
export async function getUnassignedLeads() {
  try {
    return await prisma.userReport.findMany({
      where: { agentId: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        pointsTier: true,
        createdAt: true,
        source: true,
        locale: true,
        inputJson: true,
        reportJson: true,
      },
      take: 50,
    });
  } catch (error) {
    if (isMissingColumnError(error, "agent_id")) return [];
    throw error;
  }
}
