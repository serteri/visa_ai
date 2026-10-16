"use client";

import { useEffect } from "react";

import { trackEvent } from "@/lib/analytics/events";

/**
 * One delegated click listener for the occupation page: a click on a link marked `data-tool-destination="<tool>"` sends
 * `occupation_tool_click` with the ANZSCO code, the destination name and the locale -- one event for every occupation and
 * tool, nothing else. Renders nothing.
 */
export function OccupationToolClickTracker({ occupationCode, locale }: { occupationCode: string; locale: string }) {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const help = (event.target as Element | null)?.closest?.("a[data-professional-help]");
      if (help) trackEvent("professional_help_click", { source_page_type: "occupation", source_page_id: occupationCode, locale });
      const anchor = (event.target as Element | null)?.closest?.("a[data-tool-destination]") as HTMLAnchorElement | null;
      const destination = anchor?.getAttribute("data-tool-destination");
      if (!destination) return;
      trackEvent("occupation_tool_click", { occupation_code: occupationCode, destination, locale });
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [occupationCode, locale]);
  return null;
}
