"use client";

import { useEffect } from "react";

import { trackEvent, type AnalyticsEventName } from "@/lib/analytics/events";

/** Fires one named event per page view (e.g. comparison_page_view) with non-identifying parameters. Renders nothing. */
export function PageViewTracker({ event, params }: { event: AnalyticsEventName; params?: Record<string, string> }) {
  const key = JSON.stringify(params ?? {});
  useEffect(() => {
    trackEvent(event, JSON.parse(key));
  }, [event, key]);
  return null;
}
