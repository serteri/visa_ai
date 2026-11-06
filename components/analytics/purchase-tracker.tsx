"use client";

import { useEffect } from "react";

import { reportPurchase, validPurchase, type PurchasePayload } from "@/lib/analytics/purchase-client";

type Lv = { gaId: string | null; blocked: boolean; analyticsConsent: boolean; restricted: boolean };

/**
 * Sends the purchase the SERVER verified (app/[locale]/(main)/checkout/success/page.tsx). Renders nothing. With no verified purchase (an unpaid, failed,
 * expired or free session, or a hand-typed URL) it does nothing at all. GA4 is sent through the already loaded gtag with a path-only location (see
 * lib/analytics/purchase-client.ts).
 */
export function PurchaseTracker({ purchase }: { purchase: PurchasePayload | null }) {
  useEffect(() => {
    if (!purchase || !validPurchase(purchase)) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    let tries = 0;

    const attempt = () => {
      tries++;
      const w = window as unknown as { __lv?: Lv; gtag?: (...a: unknown[]) => void };
      let storage: Storage | null = null;
      try {
        storage = window.localStorage;
      } catch {
        storage = null;
      }
      const gaReady = Boolean(w.__lv?.analyticsConsent && w.__lv.gaId && !w.__lv.blocked && typeof w.gtag === "function");
      const result = reportPurchase(purchase, {
        storage,
        gtag: gaReady ? w.gtag! : null,
        pageLocation: `${window.location.origin}${window.location.pathname}`,
      });
      if ((result.done || tries >= 40) && timer) {
        clearInterval(timer);
        timer = null;
      }
    };
    attempt();
    timer = setInterval(attempt, 300);
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [purchase]);
  return null;
}
