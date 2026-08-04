import type { SkillsAssessmentAuthority } from "./types";
import { aacaAuthority } from "./authorities/aaca";
import { acsAuthority } from "./authorities/acs";
import { adcAuthority } from "./authorities/adc";
import { engineersAustraliaAuthority } from "./authorities/engineers-australia";
import { vetassessAuthority } from "./authorities/vetassess";
import { cpaAustraliaAuthority } from "./authorities/cpa-australia";
import { aimsAuthority } from "./authorities/aims";
import { caanzAuthority } from "./authorities/caanz";
import { ipaAustraliaAuthority } from "./authorities/ipa-australia";
import { normalizeOccupationCode } from "./types";

/**
 * Registry of all skills assessment authorities. New authorities (AHPRA,
 * WES, ICAS) are added here and exposed through
 * `getSkillsAssessmentAuthority()` by occupation code.
 */
const AUTHORITIES: SkillsAssessmentAuthority[] = [
  aacaAuthority,
  acsAuthority,
  adcAuthority,
  engineersAustraliaAuthority,
  vetassessAuthority,
  cpaAustraliaAuthority,
  aimsAuthority,
  caanzAuthority,
  ipaAustraliaAuthority,
];

/**
 * Looks up the assessing authority for a given occupation code.
 *
 * Accepts AU (ANZSCO/OSCA) and CA (NOC) codes in any of these forms:
 *   - bare 6-digit code: "232111"
 *   - with title suffix: "232111 Architect"
 *   - full display form: "Architect 232111"
 *
 * Returns `null` when no authority in the registry covers the code — callers
 * must fall back to the generic Skills Assessment row.
 */
export function getSkillsAssessmentAuthority(
  occupationCode: string | undefined
): SkillsAssessmentAuthority | null {
  const code = normalizeOccupationCode(occupationCode);
  if (!code) return null;

  for (const authority of AUTHORITIES) {
    for (const occupation of authority.occupations) {
      if (
        occupation.anzscoCode === code ||
        occupation.oscaCode === code ||
        occupation.nocCode === code
      ) {
        return authority;
      }
    }
  }
  return null;
}

/** Convenience helper for callers that only need the default pathway. */
export function getDefaultPathway(
  authority: SkillsAssessmentAuthority | null
): SkillsAssessmentAuthority["pathways"][number] | null {
  return authority?.pathways[0] ?? null;
}

/**
 * Input parameters for pathway resolution from intake data.
 * These map to the ReadinessInput fields the engine already has.
 */
export interface PathwayResolverInput {
  qualificationLevel: string;
  completedAtAustralianInstitution: boolean;
  yearsOfExperience: number;
  isRecentGraduate?: boolean;
}

/**
 * ACS pathway identifiers — same as the pathwayId strings in acs.ts.
 */
export type ACSPathwayId =
  | "POST_AU_STUDY"
  | "GENERAL_SKILLS"
  | "RPL"
  | "QUALIFICATION_ONLY_TG485"
  | "QUALIFICATION_ONLY_PY";

/**
 * Resolves the most likely ACS pathway from intake data.
 *
 * This is an advisory heuristic — the final eligibility determination
 * rests with ACS after application. The function never returns a hard
 * "you are eligible" claim; callers should phrase the result as a
 * "probable pathway" recommendation.
 *
 * Resolution logic (priority order):
 * 1. AU bachelor+ → 1yr exp or PY → Post Australian Study
 * 2. AU diploma/associate + 485 target → Qualification Only (TG485)
 * 3. AU bachelor+ → PY enrolment intent → Qualification Only (PY)
 * 4. No tertiary + 6yr exp (2yr recent) → RPL
 * 5. Fallback → General Skills Assessment
 */
export function resolveACSPathway(input: PathwayResolverInput): ACSPathwayId {
  const lvl = input.qualificationLevel;
  const isAU = input.completedAtAustralianInstitution;
  const exp = input.yearsOfExperience;
  const isRecent = input.isRecentGraduate ?? false;

  const isBachelorPlus =
    lvl === "Bachelor's Degree" ||
    lvl === "Master's Degree (Coursework)" ||
    lvl === "Master's Degree (Research)" ||
    lvl === "PhD/Doctorate" ||
    lvl === "PhD" ||
    lvl === "Bachelor";
  const isDiploma =
    lvl === "Diploma" || lvl === "Certificate";
  const hasNoTertiary =
    !isBachelorPlus && !isDiploma && lvl !== "Other";

  // 1. AU bachelor+ with experience → Post Australian Study
  if (isAU && isBachelorPlus && exp >= 1) {
    return "POST_AU_STUDY";
  }

  // 2. AU diploma/associate + recent graduate → Qualification Only (TG 485)
  if (isAU && isDiploma && isRecent) {
    return "QUALIFICATION_ONLY_TG485";
  }

  // 3. AU bachelor+ (recent graduate path for PY) → Qualification Only (PY)
  if (isAU && isBachelorPlus && isRecent) {
    return "QUALIFICATION_ONLY_PY";
  }

  // 4. No tertiary + 6yr experience → RPL
  if (hasNoTertiary && exp >= 6) {
    return "RPL";
  }

  // 5. Fallback → General Skills Assessment
  return "GENERAL_SKILLS";
}

/**
 * Returns the pathway object for a resolved ACS pathway ID.
 */
export function getACSPathwayById(
  authorityId: string,
  pathwayId: string
): SkillsAssessmentAuthority["pathways"][number] | null {
  const authority = getSkillsAssessmentAuthority(authorityId);
  return authority?.pathways.find((p) => p.pathwayId === pathwayId) ?? null;
}
