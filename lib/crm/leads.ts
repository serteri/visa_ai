import { prisma } from "@/lib/prisma";
import { PDF_LEAD_SOURCES } from "@/lib/crm/pdf-lead-sources";

export const DOC_STATUSES = ["New", "Missing Documents", "In Review", "Approved"] as const;
export type DocStatus = (typeof DOC_STATUSES)[number];

// ── Lead lists / details (agent-scoped) ─────────────────────────────────────

export type LeadSort = "newest" | "oldest";

/** Leads assigned to one agent, optionally filtered by tier and sorted by date.
 *  Always scoped by agentId so an agent can only ever see their own pool. */
export async function getAgentLeads(
  agentId: string,
  opts: { tier?: string; sort?: LeadSort } = {}
) {
  const where: { agentId: string; pointsTier?: string } = { agentId };
  if (opts.tier === "Hot" || opts.tier === "Warm" || opts.tier === "Cold") {
    where.pointsTier = opts.tier;
  }
  return prisma.userReport.findMany({
    where,
    orderBy: { createdAt: opts.sort === "oldest" ? "asc" : "desc" },
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
}

/** A single lead, scoped to the owning agent (returns null if not theirs). */
export async function getAgentLead(agentId: string, leadId: string) {
  return prisma.userReport.findFirst({
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
  const rows = await prisma.userReport.groupBy({
    by: ["agentId", "pointsTier"],
    where: { agentId: { not: null } },
    _count: { _all: true },
  });
  const map = new Map<string, AgentMetrics>();
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
    select: { id: true, name: true, email: true, image: true, market: true, createdAt: true },
  });
}

/** One agent user (null if the id isn't an AGENT). */
export async function getAgentUser(id: string) {
  return prisma.user.findFirst({
    where: { id, role: "AGENT" },
    select: { id: true, name: true, email: true, image: true, createdAt: true },
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
  return prisma.userReport.findMany({
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
}

/** Claims a pool lead for the given agent -- no-ops (returns false) if it was already claimed. */
export async function claimLead(agentId: string, leadId: string): Promise<boolean> {
  const result = await prisma.userReport.updateMany({
    where: { id: leadId, agentId: null },
    data: { agentId },
  });
  return result.count > 0;
}

/** Updates doc-review status and/or internal notes -- scoped to the owning agent. */
export async function updateLeadWorkflow(
  agentId: string,
  leadId: string,
  data: { docStatus?: string; agentNotes?: string }
): Promise<boolean> {
  const result = await prisma.userReport.updateMany({
    where: { id: leadId, agentId },
    data,
  });
  return result.count > 0;
}

export async function getUnassignedLeads() {
  return prisma.userReport.findMany({
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
}
