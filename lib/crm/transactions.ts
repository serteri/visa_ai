import { prisma } from "@/lib/prisma";

/** An agent's own commission ledger, newest first -- for /agent/dashboard. */
export async function getAgentTransactions(agentId: string) {
  const rows = await prisma.transaction.findMany({
    where: { agentId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      totalAmount: true,
      commissionAmount: true,
      createdAt: true,
      buyerEmail: true,
      lead: { select: { fullName: true, email: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    // No lead for direct sales with no CRM report behind them (e.g. a
    // lead-magnet campaign PDF purchase) -- buyerEmail identifies the buyer
    // instead (see Transaction.leadId's doc comment in schema.prisma).
    leadName: row.lead ? row.lead.fullName || row.lead.email : row.buyerEmail ?? "—",
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
