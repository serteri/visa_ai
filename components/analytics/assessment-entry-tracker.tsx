"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics/events";

export function AssessmentEntryTracker({ locale }: { locale: string }) {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const anchor = (event.target instanceof Element ? event.target : null)?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;
      const url = new URL(anchor.href, window.location.origin);
      if (url.origin !== window.location.origin || !/^\/(?:en\/|tr\/|zh-Hans\/)?full-check\/?$/.test(url.pathname)) return;
      const path = window.location.pathname.replace(/^\/(en|tr|zh-Hans)(?=\/|$)/, "") || "/";
      const source = anchor.dataset.assessmentEntry ?? (path === "/" ? "homepage" : path.startsWith("/occupations/") ? "occupation" : path.startsWith("/visas/") ? "visa_page" : path.startsWith("/tools/") ? "tool" : "other");
      trackEvent("assessment_entry_click", { entry_source: source, locale });
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [locale]);
  return null;
}
