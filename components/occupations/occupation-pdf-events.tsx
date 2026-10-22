"use client";

/**
 * Tracking for the occupation-list PDF page, through the existing fixed-vocabulary analytics. Only the event name and the locale are sent: nothing the
 * visitor types (name, email, phone) and no form value is ever read here.
 */
import { useRef, type FocusEvent, type FormEvent, type MouseEvent, type ReactNode } from "react";

import { trackEvent } from "@/lib/analytics/events";

export function OccupationPdfEvents({ locale, children }: { locale: string; children: ReactNode }) {
  const started = useRef(false);

  // The first time a field of the form is focused.
  const onFocus = (e: FocusEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (!started.current && target instanceof HTMLInputElement && target.closest("form")) {
      started.current = true;
      trackEvent("occupation_pdf_lead_start", { locale });
    }
  };

  // A submit of the form (the form's own handler still validates and sends).
  const onSubmit = (e: FormEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).tagName === "FORM") trackEvent("occupation_pdf_submit", { locale });
  };

  const onClick = (e: MouseEvent<HTMLElement>) => {
    const anchor = (e.target as HTMLElement).closest?.("a[data-pdf-event]") as HTMLElement | null;
    if (anchor?.dataset.pdfEvent === "occupation_pdf_to_search_click") trackEvent("occupation_pdf_to_search_click", { locale });
  };

  return (
    <div onFocusCapture={onFocus} onSubmitCapture={onSubmit} onClickCapture={onClick}>
      {children}
    </div>
  );
}
