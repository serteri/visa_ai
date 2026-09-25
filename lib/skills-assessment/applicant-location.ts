import type { ApplicantLocation } from "./types";

/**
 * Where the applicant applies from, from the intake's current country (an ISO code such as "AU" / "SG", or a
 * name). Same rule as the state-nomination and ranked-pathways offshore checks: anything that is not Australia is
 * offshore; no country given -> unknown. In its own module so fee helpers the registry imports can use it without
 * importing the registry index.
 */
export function applicantLocationFor(currentCountry: string | undefined): ApplicantLocation | undefined {
  const c = (currentCountry ?? "").trim().toLowerCase();
  if (!c) return undefined;
  if (c === "au" || c.includes("australia") || c.includes("australya")) return "onshore";
  if (c === "sg" || c.includes("singapore") || c.includes("singapur")) return "singapore";
  return "offshore";
}
