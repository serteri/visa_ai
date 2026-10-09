import { prisma } from "@/lib/prisma";
import { clientReference } from "@/lib/crm/agent-access";

/**
 * An agent's own commission ledger, newest first -- for /agent/dashboard. No client detail: a sale is shown by a reference derived from the report
 * id (or "Guide purchase" for a sale with no report), never by the client's name or email (no consent to share exists yet).
 */
export async function getAgentTransactions(agentId: string) {
  const rows = await prisma.transaction.findMany({
    where: { agentId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      totalAmount: true,
      commissionAmount: true,
      createdAt: true,
      leadId: true,
    },
  });
  return rows.map((row) => ({
    id: row.id,
    leadName: row.leadId ? clientReference(row.leadId) : "Guide purchase",
    totalAmount: Number(row.totalAmount),
    commissionAmount: row.commissionAmount ? Number(row.commissionAmount) : 0,
    createdAt: row.createdAt,
  }));
}

/** Sum of an agent's commissionAmount across every recorded transaction. */
export async function getAgentCommissionTotal(agentId: string): Promise<number> {
  const result = await prisma.transaction.aggregate({
    where: { agentId },
    _sum: { commissionAmount: true },
  });
  return Number(result._sum.commissionAmount ?? 0);
}

export type AgentEarningsSummary = {
  /** Every lead ever routed to this agent (assigned, claimed, or referral-auto-assigned). */
  totalReferred: number;
  /** Of those, how many were paid through Stripe (payment_status "paid" and unlock_method "payment" -- a free-beta or admin unlock is not a sale). */
  totalPaid: number;
  /** Sum of commissionAmount across this agent's Transaction ledger -- an
   *  internal bookkeeping figure, not a cash payout (agents aren't paid out
   *  through Stripe; see the doc comment on the Transaction model). */
  totalCommission: number;
};

/** Stats-card summary for /agent/earnings. */
export async function getAgentEarnings(agentId: string): Promise<AgentEarningsSummary> {
  const [totalReferred, totalPaid, commissionResult] = await Promise.all([
    prisma.userReport.count({ where: { agentId } }),
    prisma.userReport.count({ where: { agentId, paymentStatus: "paid", unlockMethod: "payment" } }),
    prisma.transaction.aggregate({ where: { agentId }, _sum: { commissionAmount: true } }),
  ]);

  return {
    totalReferred,
    totalPaid,
    totalCommission: Number(commissionResult._sum.commissionAmount ?? 0),
  };
}

/** Admin view: every transaction tied to a given agent, full transparency. */
export async function getAgentTransactionsForAdmin(agentId: string) {
  const rows = await prisma.transaction.findMany({
    where: { agentId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      totalAmount: true,
      commissionRate: true,
      commissionAmount: true,
      createdAt: true,
      leadId: true,
      buyerEmail: true,
      lead: { select: { fullName: true, email: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    leadId: row.leadId,
    leadName: row.lead ? row.lead.fullName || row.lead.email : row.buyerEmail ?? "—",
    totalAmount: Number(row.totalAmount),
    commissionRate: row.commissionRate ? Number(row.commissionRate) : null,
    commissionAmount: row.commissionAmount ? Number(row.commissionAmount) : null,
    createdAt: row.createdAt,
  }));
}
