/**
 * Product analytics events (Google Analytics). gtag only exists after components/analytics/analytics-provider.tsx loaded it (production deployment on a
 * production host, no QA session, analytics consent given); before that an event waits at most 10 s and is then dropped. No personal data: only a fixed set of non-identifying
 * parameters (occupation code, locale, visa subclass, link host) is ever sent -- never an email, name, input value,
 * points total or free text.
 */

import { RESEARCH_GUIDE_SLUGS } from "@/lib/guides/slugs";

export type AnalyticsEventName =
  | "occupation_page_view"
  | "calculator_start"
  | "calculator_complete"
  | "comparison_page_view"
  | "outbound_official_link_click"
  | "occupation_tool_click"
  | "research_continuation_click"
  | "assessment_entry_click"
  | "full_check_start"
  | "full_check_submit"
  | "full_check_complete"
  | "pdf_download"
  | "report_unlocked"
  | "checkout_initiated"
  | "professional_help_click"
  | "site_guide_impression"
  | "site_guide_open"
  | "site_guide_quick_action"
  | "site_guide_route_click"
  | "site_guide_ai_assistant_handoff"
  | "site_guide_dismiss"
  | "occupation_search_start"
  | "occupation_result_click"
  | "occupations_to_pdf_click"
  | "occupation_pdf_lead_start"
  | "occupation_pdf_submit"
  | "occupation_pdf_to_search_click"
  | "official_occupation_list_click"
  | "skills_assessment_click_from_occupations"
  | "assessment_click_from_occupations"
  | "tool_use"
  | "lead_magnet_success";

/** The only parameters that may be sent, and the only value types. */
const ALLOWED_PARAMS = ["occupation_code", "locale", "subclass", "calculator", "link_host", "page_type", "destination", "source_page_type", "source_page_id", "continuation_stage", "entry_source", "product_type", "source_type", "source_slug", "destination_type", "destination_slug", "country", "interaction_type", "tool", "document"] as const;
type ParamKey = (typeof ALLOWED_PARAMS)[number];
export type AnalyticsParams = Partial<Record<ParamKey, string>>;

export function sanitizeParams(params: Record<string, unknown> = {}): AnalyticsParams {
  const out: AnalyticsParams = {};
  for (const key of ALLOWED_PARAMS) {
    const v = params[key];
    if (typeof v !== "string" || v.length > 64 || /[@\s]/.test(v)) continue;
    if ((key === "occupation_code" || key === "source_page_id") && !/^\d{6}$/.test(v)) continue;
    if (key === "locale" && !["en", "tr", "zh-Hans"].includes(v)) continue;
    if (key === "subclass" && !/^\d{3}$/.test(v)) continue;
    if (key === "calculator" && v !== "australia_points" && v !== "canada_crs") continue;
    if (key === "tool" && !["anzsco_finder", "skills_assessment_finder", "state_nomination", "cost_calculator"].includes(v)) continue;
    // A lead-magnet document id: lower-case words, digits and hyphens (csol-2026), never typed text.
    if (key === "document" && !/^[a-z0-9]+(?:-[a-z0-9]+){0,4}$/.test(v)) continue;
    if (key === "page_type" && !["occupation", "visa", "tool", "visa_comparison", "points_calculator"].includes(v)) continue;
    if (key === "link_host" && !/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(v)) continue;
    if (key === "source_page_type" && !["occupation", "visa", "tool", "home", "comparison", "points", "guide", "canada", "other"].includes(v)) continue;
    if (key === "continuation_stage" && !["visa_to_tool", "tool_to_tool", "calculator_complete_to_research"].includes(v)) continue;
    if (key === "entry_source" && !["homepage", "homepage_assessment_section", "homepage_sample_report", "homepage_how_it_works", "sample_report_page", "navbar", "occupation", "visa_page", "tool", "other"].includes(v)) continue;
    if (key === "product_type" && v !== "premium") continue;
    if (key === "source_type" && v !== "guide") continue;
    if (key === "source_slug" && !RESEARCH_GUIDE_SLUGS.includes(v)) continue;
    if (key === "destination_type" && !["tool", "occupation", "visa", "guide", "comparison", "points", "skills-assessment", "state-nomination", "assessment", "australia", "canada"].includes(v)) continue;
    // Site guide: a registry id (lower-case words and hyphens), a country code and a fixed interaction vocabulary. Never typed text.
    if (key === "destination_slug" && !/^[a-z0-9]+(?:-[a-z0-9]+){0,6}$/.test(v)) continue;
    if (key === "country" && v !== "AU" && v !== "CA") continue;
    if (key === "interaction_type" && !["nudge", "launcher", "quick_action", "free_text", "context_link", "route_click", "handoff", "dismiss"].includes(v)) continue;
    if (key === "destination" && !["points_calculator", "skills_assessment", "state_nomination", "anzsco_finder", "visa_comparison", "document_checklist", "cost_calculator", "occupation_list"].includes(v)) continue;
    out[key] = v;
  }
  return out;
}

type PendingEvent = { name: AnalyticsEventName; params: AnalyticsParams };
const pending: PendingEvent[] = [];
let waiter: ReturnType<typeof setInterval> | null = null;

function gaDisabled(): boolean {
  const w = window as unknown as Record<string, unknown> & { __lv?: { blocked?: boolean; gaId?: string | null } };
  // The provider (components/analytics/analytics-provider.tsx) sets `blocked` for private pages, QA sessions and withdrawn consent.
  if (w.__lv?.blocked) return true;
  const gaId = w.__lv?.gaId || process.env.NEXT_PUBLIC_GA_ID?.trim();
  return Boolean(gaId && w[`ga-disable-${gaId}`]);
}

/** Sends what is queued when gtag exists. Returns false while gtag.js has not been initialised yet. */
function flushPending(): boolean {
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag !== "function") return false;
  // Re-checked at send time: the assessment privacy boundary may set the disable flag after the event was queued.
  const blocked = gaDisabled();
  while (pending.length) {
    const e = pending.shift()!;
    if (!blocked) gtag("event", e.name, e.params);
  }
  return true;
}

/**
 * Sends one event through gtag. An event fired on mount (occupation_page_view, comparison_page_view) runs before the GoogleAnalytics component has
 * initialised gtag -- @next/third-parties' sendGAEvent logs "GA has not been initialized" and drops it -- so the event is queued and sent as soon
 * as gtag exists (checked every 200 ms for up to 10 s, then dropped). Parameters always pass through sanitizeParams.
 */
export function trackEvent(name: AnalyticsEventName, params: Record<string, unknown> = {}): void {
  try {
    if (typeof window === "undefined") return;
    if (gaDisabled()) return;
    pending.push({ name, params: sanitizeParams(params) });
    if (flushPending() || waiter) return;
    let tries = 0;
    waiter = setInterval(() => {
      tries++;
      if (flushPending() || tries >= 50) {
        if (waiter) clearInterval(waiter);
        waiter = null;
        pending.length = 0;
      }
    }, 200);
  } catch {
    // Analytics must never break a page.
  }
}

/** True for a link to an official source: a *.gov.au host (Home Affairs, state governments) or one marked data-official-source. */
export function isOfficialSourceHost(host: string): boolean {
  const h = host.toLowerCase();
  return h === "gov.au" || h.endsWith(".gov.au");
}
