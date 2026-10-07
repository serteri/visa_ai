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
  | "outbound_official_link_click";

/** The only parameters that may be sent, and the only value types. */
const ALLOWED_PARAMS = ["occupation_code", "locale", "subclass", "calculator", "link_host", "page_type"] as const;
type ParamKey = (typeof ALLOWED_PARAMS)[number];
export type AnalyticsParams = Partial<Record<ParamKey, string>>;

export function sanitizeParams(params: Record<string, unknown> = {}): AnalyticsParams {
  const out: AnalyticsParams = {};
  for (const key of ALLOWED_PARAMS) {
    const v = params[key];
    if (typeof v === "string" && v.length <= 64 && !/[@\s]/.test(v)) out[key] = v;
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
