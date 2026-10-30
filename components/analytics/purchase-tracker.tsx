"use client";

import { useEffect } from "react";

import { CONSENT_STORAGE_KEY, isQaCookie, parseConsent, PRODUCTION_ANALYTICS_HOSTS, QA_COOKIE, readCookie } from "@/lib/analytics/policy";
import { PURCHASE_FRAME_PATH, reportPurchase, validPurchase, type PurchasePayload } from "@/lib/analytics/purchase-client";

type Lv = { gaId: string | null; blocked: boolean; analyticsConsent: boolean; restricted: boolean };

/**
 * Sends the purchase the SERVER verified (app/[locale]/(main)/checkout/success/page.tsx). Renders nothing. With no verified purchase (an unpaid, failed,
 * expired or free session, or a hand-typed URL) it does nothing at all. GA4 is sent through the already loaded gtag with a path-only location; the Meta
 * Purchase goes through the isolated frame so the Pixel never sees this page's URL (see lib/analytics/purchase-client.ts).
 */
export function PurchaseTracker({ purchase }: { purchase: PurchasePayload | null }) {
  useEffect(() => {
    if (!purchase || !validPurchase(purchase)) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    let frame: HTMLIFrameElement | null = null;
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
      const consent = parseConsent(storage?.getItem(CONSENT_STORAGE_KEY) ?? null);
      const qa = isQaCookie(readCookie(document.cookie, QA_COOKIE));
      const gaReady = Boolean(w.__lv?.analyticsConsent && w.__lv.gaId && !w.__lv.blocked && typeof w.gtag === "function");
      const metaOk = Boolean(consent?.marketing && !qa && (PRODUCTION_ANALYTICS_HOSTS as readonly string[]).includes(window.location.hostname));
      const result = reportPurchase(purchase, {
        storage,
        gtag: gaReady ? w.gtag! : null,
        pageLocation: `${window.location.origin}${window.location.pathname}`,
        postToMeta: metaOk
          ? (p) => {
              frame = document.createElement("iframe");
              frame.src = PURCHASE_FRAME_PATH;
              frame.title = "";
              frame.hidden = true;
              frame.referrerPolicy = "no-referrer";
              frame.setAttribute("sandbox", "allow-scripts allow-same-origin");
              frame.addEventListener("load", () => frame?.contentWindow?.postMessage({ lvPurchase: p }, window.location.origin));
              document.body.appendChild(frame);
            }
          : null,
      });
      if ((result.done || tries >= 40) && timer) {
        clearInterval(timer);
        timer = null;
        if (frame) setTimeout(() => frame?.remove(), 15000);
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
