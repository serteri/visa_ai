"use client";

import { useEffect } from "react";

import { trackEvent } from "@/lib/analytics/events";

type Tool = "anzsco_finder" | "skills_assessment_finder" | "state_nomination" | "cost_calculator";

/**
 * Fires one `tool_use` event per page view, on the first interaction with a form control inside the page content (typing, choosing, pressing a button).
 * Only the fixed tool name and the locale are sent: never what was typed or chosen. The header, footer and Site Guide sit outside <main> and do not count.
 */
export function ToolUseTracker({ tool, locale }: { tool: Tool; locale: string }) {
  useEffect(() => {
    let fired = false;
    const onInteract = (event: Event) => {
      if (fired) return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target?.closest("main")) return;
      if (!target.closest("input, select, textarea, button, [role='combobox'], [role='option']")) return;
      fired = true;
      trackEvent("tool_use", { tool, locale });
    };
    const types = ["input", "change", "click"] as const;
    for (const type of types) document.addEventListener(type, onInteract, true);
    return () => {
      for (const type of types) document.removeEventListener(type, onInteract, true);
    };
  }, [tool, locale]);
  return null;
}
