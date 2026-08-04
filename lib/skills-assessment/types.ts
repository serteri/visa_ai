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
  /** Optional context note (e.g. "Fast Track applies only to..."). */
  note?: string;
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
  /** Minimum academic level required, e.g. "AQF Level 6 (Advanced Diploma / Associate Degree) minimum". */
  minAcademicLevel?: string;
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

/**
 * For authorities with multiple independent assessment services
 * (e.g. VETASSESS Professional + Trade streams).
 */
export interface SkillsAssessmentService {
  serviceId: string;
  serviceName: string;
  appliesTo: string;
  pathways: SkillsAssessmentPathway[];
  /** Service-level fees (may differ from pathway fees; e.g. onshore/offshore). */
  fees?: AuthorityFee[];
  notes?: string[];
  /** Programs available under this service (e.g. TSS, OSAP for trade). */
  programs?: Array<{ name: string; purpose: string }>;
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
  /** General authority-level notes (policy, membership, DAMA support, etc.). */
  notes?: string[];
  /**
   * For authorities with multiple independent assessment services (e.g. VETASSESS
   * has both a Professional stream and a Trade stream), each service is modeled
   * as a separate `SkillsAssessmentService`. When `services` is present, the
   * top-level `pathways` should be left empty — callers iterate services instead.
   */
  services?: SkillsAssessmentService[];
  englishRequirements?: EnglishRequirement[];
  /** Exemptions from the English language requirement (e.g. Australian degree, native speaker countries). */
  englishExemptions?: string[];
  /** How long the English test result remains valid for the assessment. */
  englishTestValidity?: string;
  /** Occupational categories (e.g. EA's Professional Engineer / Technologist / Associate / Manager). */
  occupationalCategories?: Array<{
    name: string;
    qualification: string;
    skillFocus: string;
    notes?: string[];
  }>;
  /** Additional assessment services beyond the main pathways (e.g. PhD assessment, employment assessment). */
  additionalAssessmentServices?: Array<{
    name: string;
    additionalDocuments?: string[];
    mandatoryFor?: string[];
    employeeDocuments?: {
      primary: string[];
      secondary: string[];
    };
    selfEmployedDocuments?: string[];
    when?: string;
    documentRequirements?: string[];
  }>;
  /** Evidence types that are explicitly excluded from the assessment. */
  excludedEvidence?: string[];
  /** Occupation-specific competency/subject mapping (e.g. CPA's mandatory competencies per ANZSCO code). */
  occupationCompetencyMapping?: {
    note?: string;
    sharedCompetencies?: string[];
    byOccupation?: Record<string, string[]>;
  };
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
