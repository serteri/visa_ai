import { Prisma, type PrismaClient } from "@prisma/client";

import type { RestoreStore } from "./restore";

export function prismaRestoreStore(db: PrismaClient): RestoreStore {
  return {
    countRequests: (filter, since) =>
      db.chatRestoreRequest.count({
        where: { createdAt: { gte: since }, ...(filter.email ? { email: filter.email } : {}), ...(filter.ip ? { ipAddress: filter.ip } : {}) },
      }),
    async logRequest(email, ip, at) {
      await db.chatRestoreRequest.create({ data: { email, ipAddress: ip, createdAt: at } });
    },
    async hasCredits(email) {
      const links = await db.chatCreditLink.findMany({ where: { email }, select: { visitorId: true } });
      if (links.length === 0) return false;
      const n = await db.chatVisitor.count({ where: { id: { in: links.map((l) => l.visitorId) }, premiumCredits: { gt: 0 } } });
      return n > 0;
    },
    async createToken(tokenHash, email, expiresAt) {
      await db.chatRestoreToken.create({ data: { tokenHash, email, expiresAt } });
    },
    async consumeToken(tokenHash, now) {
      // One statement decides the race: only the first confirm can flip usedAt from null.
      const { count } = await db.chatRestoreToken.updateMany({
        where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (count !== 1) return null;
      const row = await db.chatRestoreToken.findUnique({ where: { tokenHash }, select: { email: true } });
      return row?.email ?? null;
    },
    transferCredits(email, visitorId) {
      return db.$transaction(async (tx) => {
        const links = await tx.chatCreditLink.findMany({ where: { email }, select: { visitorId: true } });
        let moved = 0;
        for (const link of links) {
          if (link.visitorId === visitorId) continue;
          // Read-and-zero in one locked statement, so a message being sent from the old device cannot spend a credit
          // that is also being moved.
          const rows = await tx.$queryRaw<Array<{ old: number }>>(Prisma.sql`
            UPDATE chat_visitors AS t SET premium_credits = 0
            FROM (SELECT id, premium_credits AS old FROM chat_visitors WHERE id = ${link.visitorId} FOR UPDATE) AS o
            WHERE t.id = o.id
            RETURNING o.old AS old`);
          moved += rows[0]?.old ?? 0;
        }
        if (moved > 0) await tx.chatVisitor.update({ where: { id: visitorId }, data: { premiumCredits: { increment: moved } } });
        await tx.chatCreditLink.upsert({
          where: { email_visitorId: { email, visitorId } },
          create: { email, visitorId, verified: true },
          update: { verified: true },
        });
        const v = await tx.chatVisitor.findUniqueOrThrow({ where: { id: visitorId }, select: { premiumCredits: true } });
        return v.premiumCredits;
      });
    },
  };
}
