"use client";

import { useEffect } from "react";

import { trackEvent } from "@/lib/analytics/events";

/** Fires `occupation_page_view` (ANZSCO code + locale only) once per page view. Renders nothing. */
export function OccupationViewTracker({ occupationCode, locale }: { occupationCode: string; locale: string }) {
  useEffect(() => {
    trackEvent("occupation_page_view", { occupation_code: occupationCode, locale });
  }, [occupationCode, locale]);
  return null;
}
