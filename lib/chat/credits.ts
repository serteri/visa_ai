import type { PrismaClient } from "@prisma/client";

/** Credit bookkeeping for chat messages. Atomic in the database: two concurrent messages cannot spend one credit. */
export interface CreditStore {
  /**
   * Spend one credit for a message: only succeeds while premiumCredits > 0, and counts the message. Returns false
   * (nothing changed) when the balance is already 0.
   */
  reserve(visitorId: string): Promise<boolean>;
  /** Give back a reserved credit (and the message count) when the model call failed or was aborted. */
  refund(visitorId: string): Promise<void>;
  /** Free path: count a message once the model produced a reply. */
  recordFreeMessage(visitorId: string): Promise<void>;
}

export function prismaCreditStore(db: Pick<PrismaClient, "chatVisitor">): CreditStore {
  return {
    async reserve(visitorId) {
      const { count } = await db.chatVisitor.updateMany({
        where: { id: visitorId, premiumCredits: { gt: 0 } },
        data: { premiumCredits: { decrement: 1 }, messageCount: { increment: 1 } },
      });
      return count === 1;
    },
    async refund(visitorId) {
      await db.chatVisitor.update({
        where: { id: visitorId },
        data: { premiumCredits: { increment: 1 }, messageCount: { decrement: 1 } },
      });
    },
    async recordFreeMessage(visitorId) {
      await db.chatVisitor.update({ where: { id: visitorId }, data: { messageCount: { increment: 1 } } });
    },
  };
}
