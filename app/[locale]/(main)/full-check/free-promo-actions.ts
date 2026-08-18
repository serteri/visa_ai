"use server";

import { getFreePromoStatus, type FreePromoStatus } from "@/lib/services/free-promo";

/**
 * Live re-check for PremiumFeatureGate -- the page-load-time SSR props can
 * go stale by the time a user actually opens the unlock modal (another
 * visitor may have claimed the last free-promo slot in the meantime), so
 * the client calls this directly rather than trusting props alone.
 */
export async function getFreePromoStatusAction(): Promise<FreePromoStatus> {
  return getFreePromoStatus();
}
