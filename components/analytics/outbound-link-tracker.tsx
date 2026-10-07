"use client";

import { useEffect } from "react";

import { isOfficialSourceHost, trackEvent } from "@/lib/analytics/events";

/**
 * One delegated click listener: a click on a link to an official source (*.gov.au, or an <a data-official-source>)
 * sends `outbound_official_link_click` with the link's HOST only -- no path, no query string. Renders nothing.
 */
export function OutboundLinkTracker({ locale }: { locale: string }) {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      let host = "";
      try {
        const url = new URL(anchor.href, window.location.href);
        if (url.origin === window.location.origin) return;
        host = url.hostname;
      } catch {
        return;
      }
      if (!isOfficialSourceHost(host) && !anchor.hasAttribute("data-official-source")) return;
      trackEvent("outbound_official_link_click", { link_host: host, locale });
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [locale]);
  return null;
}
