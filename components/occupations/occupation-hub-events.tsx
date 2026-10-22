"use client";

/**
 * Click and focus tracking for /occupations, through the existing fixed-vocabulary analytics (lib/analytics/events.ts). Only the event name and the locale
 * are sent: never what was typed in the search box, never an occupation, never a URL.
 */
import { useRef, type FocusEvent, type MouseEvent, type ReactNode } from "react";

import { trackEvent, type AnalyticsEventName } from "@/lib/analytics/events";

const CLICK_EVENTS = new Set<AnalyticsEventName>([
  "occupation_result_click",
  "occupation_pdf_click",
  "official_occupation_list_click",
  "skills_assessment_click_from_occupations",
  "assessment_click_from_occupations",
]);

export function OccupationHubEvents({ locale, children }: { locale: string; children: ReactNode }) {
  const searched = useRef(false);

  const onFocus = (e: FocusEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (!searched.current && target instanceof HTMLInputElement && target.dataset.occEvent === "occupation_search_start") {
      searched.current = true;
      trackEvent("occupation_search_start", { locale });
    }
  };

  const onClick = (e: MouseEvent<HTMLElement>) => {
    const anchor = (e.target as HTMLElement).closest?.("a[data-occ-event]") as HTMLElement | null;
    const name = anchor?.dataset.occEvent as AnalyticsEventName | undefined;
    if (name && CLICK_EVENTS.has(name)) trackEvent(name, { locale });
  };

  return (
    <div onFocusCapture={onFocus} onClickCapture={onClick}>
      {children}
    </div>
  );
}
