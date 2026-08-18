import { prisma } from "@/lib/prisma";

/**
 * First-N-users launch promo cap, shared between the checkout route that
 * actually enforces it (app/api/checkout/route.ts) and every UI surface
 * that displays remaining-slots messaging. Previously the UI read a
 * completely separate counter (full_check_usage / MAX_FREE_REPORTS via
 * getCachedFullCheckUsage, 5-minute cache) while checkout enforced this
 * isFreePromo-backed count -- the two could (and did) disagree, showing
 * "13 spots left" after the real quota was already exhausted.
 */
export const FREE_PROMO_LIMIT = 14;

export type FreePromoStatus = {
  remaining: number;
  total: number;
  isFreeActive: boolean;
};

/**
 * Always reads live from the database -- no caching layer. The promo slot
 * count changes in real time as checkouts complete, and this is used to
 * decide whether to show pricing/UI that promises something checkout may
 * no longer be able to grant, so a stale read here is a direct source of
 * user-facing contradictions, not just a cosmetic staleness issue.
 */
export async function getFreePromoStatus(): Promise<FreePromoStatus> {
  const used = await prisma.userReport.count({ where: { isFreePromo: true } });
  const remaining = Math.max(0, FREE_PROMO_LIMIT - used);

  return {
    remaining,
    total: FREE_PROMO_LIMIT,
    isFreeActive: remaining > 0,
  };
}
