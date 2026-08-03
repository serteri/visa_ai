/**
 * Skills Assessment Authority schema — reusable across all Australian and
 * Canadian assessing authorities (AACA, ACS, Engineers Australia, VETASSESS,
 * CPA Australia, AHPRA, WES, ICAS, etc.).
 *
 * Each authority lives in its own file under `authorities/` (e.g. `aaca.ts`,
 * `acs.ts`) and exports a single `SkillsAssessmentAuthority` object.
 *
 * The Financial Roadmap engine consumes this via `getSkillsAssessmentAuthority()`
 * to render occupation-specific fee / pathway / document detail instead of a
 * generic one-liner.
 */

export type SupportedCountry = "AU" | "CA";

export interface AuthorityOccupation {
  /** Australian occupation code (e.g. ANZSCO or new OSCA codes). */
  anzscoCode?: string;
  /** OSCA code introduced as ANZSCO's replacement; both kept for forward compat. */
  oscaCode?: string;
  /** Canadian NOC code — used for CA assessing authorities (WES, ICAS). */
  nocCode?: string;
  /** Display title, e.g. "Architect". */
  title: string;
}

export interface AuthorityFee {
  /** Free-form label: "OQA — New Applicants", "Renewal of Assessment", etc. */
  label: string;
  /** Fee in AUD when the authority is Australian. */
  amountAUD?: number;
  /** Fee in CAD when the authority is Canadian. */
  amountCAD?: number;
  /** Footnote explaining variations (e.g. "Card surcharge applies"). */
  note?: string;
}

export interface ProcessingTime {
  /** Standard processing time in weeks for a complete application. */
  standard: number;
  /** Optional "if incomplete" or "expedited" alternative. */
  ifIncomplete?: number;
}

export interface CompetencyAssessment {
  /** Minimum number of portfolio projects the applicant must submit. */
  portfolioProjectsMin: number;
  /** Maximum number allowed (if there is a cap). */
  portfolioProjectsMax: number;
  /** Duration of the competency interview in minutes. */
  interviewDurationMinutes: number;
  /** Optional list of topic areas covered by the competency assessment. */
  topicAreas?: string[];
}

export interface SkillsAssessmentPathway {
  /** Stable identifier for this pathway, e.g. "OQA", "EPA", "UK_ARB_MRA". */
  pathwayId: string;
  /** Human-readable name, e.g. "Overseas Qualifications Assessment (OQA)". */
  name: string;
  /**
   * Which source-country qualifications are eligible for this pathway
   * (e.g. ["AU", "NZ", "HK", "SG"]). Omit or leave empty for "all origins".
   */
  eligibleFor?: string[];
  /** True if the applicant must complete a prior assessment (e.g. EPA) before this one. */
  requiresPriorAssessment?: boolean;
  /** Minimum paid work experience in months, if applicable. */
  minWorkExperienceMonths?: number;
  /** Minimum paid work experience in years, if applicable. */
  minWorkExperienceYears?: number;
  /** Free-form course duration requirement string, e.g. "5-year full-time equivalent". */
  qualificationDurationRequirement?: string;
  fees: AuthorityFee[];
  processingTimeWeeks?: ProcessingTime;
  documentRequirements: string[];
  competencyAssessment?: CompetencyAssessment;
  /** Additional context-specific notes (policy changes, caveats). */
  notes?: string[];
}

export interface EnglishRequirement {
  /** Test name: "IELTS Academic", "PTE", "TOEFL iBT", "OET", etc. */
  test: string;
  /** Minimum score (raw string to support mixed formats like "Overall band 6.5"). */
  minimumScore: string;
  /** Optional context note. */
  note?: string;
}

export interface SkillsAssessmentAuthority {
  authorityId: string;
  authorityName: string;
  country: SupportedCountry;
  occupations: AuthorityOccupation[];
  /** ISO date string of when the data was last verified against the source. */
  lastVerified: string;
  /** Citation / source document name (e.g. "AACA OQA Applicants Guide, October 2025"). */
  sourceDocument: string;
  pathways: SkillsAssessmentPathway[];
  englishRequirements?: EnglishRequirement[];
  /** How long the issued assessment remains valid for migration purposes. */
  validityPeriod?: {
    years: number;
    note?: string;
  };
  /** Anti-fraud policy statement (e.g. consequences of submitting fraudulent documents). */
  fraudPolicy?: string;
  /** Notes for post-assessment requirements (e.g. registration exams after the assessment). */
  postAssessmentPathway?: {
    name: string;
    note: string;
  };
}

/**
 * Normalizes an occupation code (ANZSCO/OSCA for AU, NOC for CA) by stripping
 * any non-digit prefix and zero-padding to 6 digits. Returns null if not a valid
 * 6-digit code.
 */
export function normalizeOccupationCode(raw?: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 4) return null;
  return digits.slice(-6).padStart(6, "0");
}
