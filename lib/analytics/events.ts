/**
 * Product analytics events (Google Analytics, only when NEXT_PUBLIC_GA_ID is set -- the layout mounts <GoogleAnalytics>
 * conditionally, and sendGAEvent is a no-op without it). No personal data: only a fixed set of non-identifying
 * parameters (occupation code, locale, visa subclass, link host) is ever sent -- never an email, name, input value,
 * points total or free text.
 */
import { sendGAEvent } from "@next/third-parties/google";

export type AnalyticsEventName =
  | "occupation_page_view"
  | "calculator_start"
  | "calculator_complete"
  | "comparison_page_view"
  | "outbound_official_link_click"
  | "occupation_tool_click"
  | "research_continuation_click"
  | "professional_help_click";

/** The only parameters that may be sent, and the only value types. */
const ALLOWED_PARAMS = ["occupation_code", "locale", "subclass", "calculator", "link_host", "page_type", "destination", "source_page_type", "source_page_id", "continuation_stage"] as const;
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
    if (key === "destination" && !["points_calculator", "skills_assessment", "state_nomination", "anzsco_finder", "visa_comparison", "document_checklist"].includes(v)) continue;
    out[key] = v;
  }
  return out;
}

export function trackEvent(name: AnalyticsEventName, params: Record<string, unknown> = {}): void {
  try {
    if (typeof window === "undefined") return;
    sendGAEvent("event", name, sanitizeParams(params));
  } catch {
    // Analytics must never break a page.
  }
}

/** True for a link to an official source: a *.gov.au host (Home Affairs, state governments) or one marked data-official-source. */
export function isOfficialSourceHost(host: string): boolean {
  const h = host.toLowerCase();
  return h === "gov.au" || h.endsWith(".gov.au");
}
