import type { SkillsAssessmentAuthority } from "./types";
import { aacaAuthority } from "./authorities/aaca";
import { normalizeOccupationCode } from "./types";

/**
 * Registry of all skills assessment authorities. New authorities (ACS,
 * Engineers Australia, VETASSESS, CPA Australia, AHPRA, WES, ICAS) are added
 * here and exposed through `getSkillsAssessmentAuthority()` by occupation code.
 */
const AUTHORITIES: SkillsAssessmentAuthority[] = [aacaAuthority];

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
