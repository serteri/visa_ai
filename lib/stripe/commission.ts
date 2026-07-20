import type Stripe from "stripe";

import { prisma } from "@/lib/prisma";

// LogiVisa's own Stripe account collects every payment; agents are never
// paid out through Stripe -- this is a commission *ledger* only. Hardcoded
// here (not read from env/DB) per the requirement that a future rate change
// must never retroactively alter already-recorded transactions -- each row
// freezes the rate/amount that applied at the time of that specific sale.
const COMMISSION_RATE = 0.2;

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
  const commissionRate = agentId ? COMMISSION_RATE : null;
  const commissionAmount = agentId ? Math.round(totalAmount * COMMISSION_RATE * 100) / 100 : null;

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
