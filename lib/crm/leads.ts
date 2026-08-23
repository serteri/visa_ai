import { prisma } from "@/lib/prisma";
import { PDF_LEAD_SOURCES } from "@/lib/crm/pdf-lead-sources";
import { isMissingColumnError } from "@/lib/db/missing-relation";

export const DOC_STATUSES = ["New", "Contacted", "Documents Pending", "Approved", "Rejected"] as const;
export type DocStatus = (typeof DOC_STATUSES)[number];

// ── Lead lists / details (agent-scoped) ─────────────────────────────────────

export type LeadSort = "newest" | "oldest";
export type LeadSortField = "name" | "tier" | "status" | "createdAt";
export type SortOrder = "asc" | "desc";

/** Leads assigned to one agent, optionally filtered by tier/status and sorted
 *  by a chosen column. Always scoped by agentId so an agent can only ever see
 *  their own pool. `sortField`/`order` (used by the admin agent-detail table)
 *  take precedence over the older `sort` shorthand (used by the agent's own
 *  dashboard) when both are present. */
export async function getAgentLeads(
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

/** A single lead, scoped to the owning agent (returns null if not theirs). */
export async function getAgentLead(agentId: string, leadId: string) {
  try {
    return await prisma.userReport.findFirst({
      where: { id: leadId, agentId },
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
      },
    });
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
    where: { id: leadId, agentId },
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

/** Appends a new timestamped note (newest first) -- scoped to the owning agent. */
export async function appendLeadNote(agentId: string, leadId: string, text: string): Promise<boolean> {
  const lead = await prisma.userReport.findFirst({
    where: { id: leadId, agentId },
    select: { agentNotes: true },
  });
  if (!lead) return false;

  const notes = parseNotes(lead.agentNotes);
  notes.unshift({ text, at: new Date().toISOString() });

  const result = await prisma.userReport.updateMany({
    where: { id: leadId, agentId },
    data: { agentNotes: JSON.stringify(notes) },
  });
  return result.count > 0;
}

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
      },
      take: 50,
    });
  } catch (error) {
    if (isMissingColumnError(error, "agent_id")) return [];
    throw error;
  }
}
