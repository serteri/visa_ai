/**
 * Product analytics events (Google Analytics, only when NEXT_PUBLIC_GA_ID is set -- the layout mounts <GoogleAnalytics>
 * conditionally; without it gtag never exists and events are dropped after 10 s). No personal data: only a fixed set of non-identifying
 * parameters (occupation code, locale, visa subclass, link host) is ever sent -- never an email, name, input value,
 * points total or free text.
 */

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
  | "professional_help_click";

/** The only parameters that may be sent, and the only value types. */
const ALLOWED_PARAMS = ["occupation_code", "locale", "subclass", "calculator", "link_host", "page_type", "destination", "source_page_type", "source_page_id", "continuation_stage", "entry_source", "product_type"] as const;
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
    if (key === "calculator" && v !== "australia_points") continue;
    if (key === "page_type" && !["occupation", "visa", "tool", "visa_comparison", "points_calculator"].includes(v)) continue;
    if (key === "link_host" && !/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(v)) continue;
    if (key === "source_page_type" && !["occupation", "visa", "tool"].includes(v)) continue;
    if (key === "continuation_stage" && !["visa_to_tool", "tool_to_tool", "calculator_complete_to_research"].includes(v)) continue;
    if (key === "entry_source" && !["homepage", "homepage_assessment_section", "homepage_sample_report", "homepage_how_it_works", "sample_report_page", "navbar", "occupation", "visa_page", "tool", "other"].includes(v)) continue;
    if (key === "product_type" && v !== "premium") continue;
    if (key === "destination" && !["points_calculator", "skills_assessment", "state_nomination", "anzsco_finder", "visa_comparison", "document_checklist", "cost_calculator"].includes(v)) continue;
    out[key] = v;
  }
  return out;
}

type PendingEvent = { name: AnalyticsEventName; params: AnalyticsParams };
const pending: PendingEvent[] = [];
let waiter: ReturnType<typeof setInterval> | null = null;

function gaDisabled(): boolean {
  const gaId = process.env.NEXT_PUBLIC_GA_ID?.trim();
  return Boolean(gaId && (window as unknown as Record<string, unknown>)[`ga-disable-${gaId}`]);
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
