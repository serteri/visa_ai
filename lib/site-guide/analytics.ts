/** Site guide analytics: a fixed vocabulary only (page type, destination id and category, country, interaction). Typed text never reaches this module. */
import { trackEvent } from "@/lib/analytics/events";
import type { GuideCountry, PageType } from "./types";

export type GuideEventName =
  | "site_guide_impression"
  | "site_guide_open"
  | "site_guide_quick_action"
  | "site_guide_route_click"
  | "site_guide_ai_assistant_handoff"
  | "site_guide_dismiss";

export type GuideEventInput = {
  sourcePageType: PageType;
  destinationId?: string;
  destinationType?: string;
  country?: GuideCountry | "ANY" | null;
  interaction?: string;
};

/** The parameters of a guide event: nothing outside the allow-list, and only values from fixed vocabularies. */
export function guideEventParams(input: GuideEventInput): Record<string, string> {
  const out: Record<string, string> = { source_page_type: input.sourcePageType };
  if (input.destinationId) out.destination_slug = input.destinationId;
  if (input.destinationType) out.destination_type = input.destinationType;
  if (input.country === "AU" || input.country === "CA") out.country = input.country;
  if (input.interaction) out.interaction_type = input.interaction;
  return out;
}

export function trackGuideEvent(name: GuideEventName, input: GuideEventInput): void {
  trackEvent(name, guideEventParams(input));
}
