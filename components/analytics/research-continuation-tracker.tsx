"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics/events";
import { RESEARCH_GUIDE_SLUGS } from "@/lib/guides/slugs";

/** Uses only route categories and fixed link markers; never reads form answers or URL queries. */
export function ResearchContinuationTracker({ locale }: { locale: string }) {
  const pathname = usePathname();
  useEffect(() => {
    const path = pathname.replace(/^\/(en|tr|zh-Hans)(?=\/|$)/, "");
    // Occupation pages already have a dedicated listener, including professional-help clicks.
    if (path.startsWith("/occupations/")) return;
    // Sprint 2E research guides: guide -> research continuation, with only the fixed source slug and a destination category.
    const guideSlug = path.match(/^\/guides\/([a-z0-9-]+)$/)?.[1];
    if (guideSlug && RESEARCH_GUIDE_SLUGS.includes(guideSlug)) {
      const onGuideClick = (event: MouseEvent) => {
        const anchor = (event.target instanceof Element ? event.target : null)?.closest<HTMLAnchorElement>("a[data-guide-destination]");
        const destinationType = anchor?.getAttribute("data-guide-destination");
        if (!anchor || !destinationType) return;
        trackEvent("research_continuation_click", {
          source_type: "guide",
          source_slug: guideSlug,
          destination_type: destinationType,
          destination: anchor.getAttribute("data-tool-destination") ?? undefined,
          locale,
        });
      };
      document.addEventListener("click", onGuideClick, { capture: true });
      return () => document.removeEventListener("click", onGuideClick, { capture: true });
    }
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
