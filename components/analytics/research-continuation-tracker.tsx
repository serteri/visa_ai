"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics/events";

/** Uses only route categories and fixed link markers; never reads form answers or URL queries. */
export function ResearchContinuationTracker({ locale }: { locale: string }) {
  const pathname = usePathname();
  useEffect(() => {
    const path = pathname.replace(/^\/(en|tr|zh-Hans)(?=\/|$)/, "");
    // Occupation pages already have a dedicated listener, including professional-help clicks.
    if (path.startsWith("/occupations/")) return;
    const visa = path.match(/^\/visas\/(\d{3})$/);
    const tool = path.startsWith("/tools/");
    if (!visa && !tool) return;
    function onClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("a[data-professional-help]")) {
        trackEvent("professional_help_click", { source_page_type: visa ? "visa" : "tool", subclass: visa?.[1], locale });
      }
      const anchor = target?.closest<HTMLAnchorElement>("a[data-tool-destination]");
      const destination = anchor?.getAttribute("data-tool-destination");
      if (!destination) return;
      const completed = !!anchor?.closest('[data-calculator-complete="true"]');
      trackEvent("research_continuation_click", {
        source_page_type: visa ? "visa" : "tool",
        subclass: visa?.[1],
        destination,
        locale,
        continuation_stage: completed ? "calculator_complete_to_research" : visa ? "visa_to_tool" : "tool_to_tool",
      });
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [pathname, locale]);
  return null;
}
