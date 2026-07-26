import type Stripe from "stripe";

import { prisma } from "@/lib/prisma";

// LogiVisa's own Stripe account collects every payment; agents are never
// paid out through Stripe -- this is a commission *ledger* only.
//
// Rate is now read per-agent from User.commissionRate (set at account
// creation, see admin/crm/actions.ts's createAgentAction) instead of one
// global constant. This does NOT change the original freezing guarantee:
// the resolved rate/amount is still written onto the Transaction row at
// creation time and never re-read from the User later, so a future change
// to an agent's commissionRate still cannot retroactively alter
// already-recorded transactions -- each row keeps freezing whatever rate
// applied at the time of that specific sale, same as before.
//
// Fallback: User.commissionRate is nullable (self-registered agents via
// /agent/register never set one, and it predates this column entirely for
// any agent created before this change) -- falls back to the previous
// global default, 20%, rather than erroring or silently charging 0%.
const DEFAULT_COMMISSION_RATE = 0.2;

/**
 * User.commissionRate is stored as a whole-number percentage (e.g. 20 for
 * 20%, per the admin "Commission rate (%)" create-agent form), while
 * Transaction.commissionRate (and the rest of this file's math) uses a
 * fraction (0.2). Converting in one place so this unit mismatch can't be
 * reintroduced by a future edit that forgets to divide by 100.
 */
function resolveCommissionRateFraction(userCommissionRatePercent: number | null | undefined): number {
  if (userCommissionRatePercent === null || userCommissionRatePercent === undefined) {
    return DEFAULT_COMMISSION_RATE;
  }
  return userCommissionRatePercent / 100;
}

function isUniqueConstraintViolation(error: unknown): boolean {
  return Boolean(
    error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002"
  );
}

/**
 * Records a Transaction from a completed Stripe Checkout Session, using the
 * leadId/agentId placed in session metadata at checkout-creation time (see
 * full-check/actions.ts's createStripeCheckoutSession and
 * app/api/checkout/route.ts). No-ops if the session has no leadId -- not
 * every checkout (e.g. a PDF-book purchase) is tied to a CRM lead.
 *
 * Idempotent: stripeSessionId is unique, so a Stripe-redelivered webhook
 * event just hits the unique-constraint branch and is silently skipped
 * rather than double-recording the sale.
 */
export async function recordCommissionTransaction(session: Stripe.Checkout.Session): Promise<void> {
  const leadId = session.metadata?.leadId?.trim();
  if (!leadId) return;

  const agentId = session.metadata?.agentId?.trim() || null;
  const totalAmount = (session.amount_total ?? 0) / 100;

  let commissionRate: number | null = null;
  let commissionAmount: number | null = null;
  if (agentId) {
    const agent = await prisma.user.findUnique({ where: { id: agentId }, select: { commissionRate: true } });
    commissionRate = resolveCommissionRateFraction(agent?.commissionRate);
    commissionAmount = Math.round(totalAmount * commissionRate * 100) / 100;
  }

  try {
    await prisma.transaction.create({
      data: {
        leadId,
        agentId,
        stripeSessionId: session.id,
        totalAmount,
        commissionRate,
        commissionAmount,
      },
    });
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      console.warn("[commission] Transaction already recorded for session", session.id);
      return;
    }
    throw error;
  }
}
