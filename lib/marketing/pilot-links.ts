import { SITE_ORIGIN } from "@/lib/seo/urls";

export type PilotSource = "agent_partner" | "complementary_partner" | "linkedin";
/** Campaign links contain only fixed campaign values and non-personal cohort IDs. */
export function pilotLink(path: string, source: PilotSource, id: string): string {
  const validId = source === "agent_partner" ? /^P(?:0[1-9]|[12][0-9]|30)$/ : source === "complementary_partner" ? /^C(?:0[1-9]|1[0-5])$/ : /^post[123]$/;
  if (!validId.test(id)) throw new Error("Use a non-personal pilot cohort ID");
  if (!path.startsWith("/") || path.startsWith("//") || /[?#]/.test(path)) throw new Error("Use a query-free public resource path");
  const url = new URL(path, SITE_ORIGIN);
  if (url.origin !== SITE_ORIGIN) throw new Error("Use a LogiVisa resource");
  url.search = new URLSearchParams({ utm_source: source, utm_medium: source === "linkedin" ? "social" : "referral", utm_campaign: "resource_pilot", utm_content: id }).toString();
  return url.toString();
}
