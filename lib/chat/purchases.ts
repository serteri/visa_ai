import { Prisma, type PrismaClient } from "@prisma/client";

import { normalizeEmail } from "./restore";

export type PurchaseOutcome = "credited" | "duplicate";

/**
 * Credits a checkout session to the visitor that started it and links the email Stripe collected, in ONE
 * transaction with a unique-per-session purchase row -- so a redelivered webhook cannot credit twice. The link is
 * unverified: the buyer typed the email, it is only proven by opening a restore link.
 *
 * If the chat-credit tables have not been created yet (scripts/add-chat-credit-tables.ts), falls back to the old
 * plain increment so a paid purchase is never refused.
 */
export async function recordCreditPurchase(
  db: PrismaClient,
  args: { sessionId: string; visitorId: string; credits: number; email: unknown },
): Promise<PurchaseOutcome> {
  const email = normalizeEmail(args.email);
  try {
    return await db.$transaction(async (tx) => {
      // Existence check first (a P2002 inside the transaction would leave it aborted); the unique constraint stays
      // as the backstop for two concurrent deliveries, handled below.
      if (await tx.chatCreditPurchase.findUnique({ where: { stripeSessionId: args.sessionId }, select: { id: true } })) {
        return "duplicate" as const;
      }
      await tx.chatCreditPurchase.create({
        data: { stripeSessionId: args.sessionId, visitorId: args.visitorId, credits: args.credits, email },
      });
      await tx.chatVisitor.update({ where: { id: args.visitorId }, data: { premiumCredits: { increment: args.credits } } });
      if (email) {
        await tx.chatCreditLink.upsert({
          where: { email_visitorId: { email, visitorId: args.visitorId } },
          create: { email, visitorId: args.visitorId },
          update: {},
        });
      }
      return "credited" as const;
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return "duplicate";
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2021") {
      console.error("[chat/purchases] chat-credit tables missing; crediting without email link", { sessionId: args.sessionId });
      await db.chatVisitor.update({ where: { id: args.visitorId }, data: { premiumCredits: { increment: args.credits } } });
      return "credited";
    }
    throw err;
  }
}
