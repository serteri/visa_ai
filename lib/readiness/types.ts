export type Locale = "en" | "tr" | "zh-Hans";

export type ReadinessInput = {
  locale: Locale;
  /** Defaults to "AU" when omitted, preserving existing behavior. */
  country?: "AU" | "CA";
  mainGoal?: string;
  currentCountry?: string;
  preferredCity?: string;
  /** Canada only: explicit province target for PNP eligibility (lib/readiness/pnp-provinces.ts). When omitted, resolveTargetProvince() falls back to keyword inference from mainGoal/preferredCity/preferredPathway. */
  targetProvince?: "ON" | "BC" | "AB";
  passportCountry?: string;
  age?: string;
  occupation?: string;
  englishLevel?: string;
  englishTestTaken?: string;
  occupationConfirmed?: string;
  estimatedBudgetRange?: string;
  timeline?: string;
  hasGraduateVisaPathwayIntent?: boolean;
  sponsorOrFamily?: string;
  annualSalaryAud?: number;
  preferredPathway?: string;
  biggestConcern?: string;
  qualificationLevel?:
    | "High School"
    | "Bachelor's Degree"
    | "Master's Degree (Coursework)"
    | "Master's Degree (Research)"
    | "PhD/Doctorate"
    | "PhD"
    | "Bachelor"
    | "Diploma"
    | "Certificate"
    | "Other";
  qualificationAwardedInAustralia?: boolean;
  qualificationRegionalAustralia?: boolean;
  specialistEducationStemResponse?: "yes" | "no" | "not_sure";
  offshoreExperienceYears?: number;
  onshoreExperienceYears?: number;
  regionalWilling?: boolean;
  educationRelevance?: "relevant" | "non_relevant" | "unknown";
  /**
   * Subclass 186 Temporary Residence Transition (TRT) stream input: total
   * years of employment in the nominated occupation while the employer held
   * approved-sponsor status, aggregated across employers if more than one
   * (NOT "years with the same employer" — DHA removed that requirement in
   * Dec 2024; the 29 Nov 2025 amendment only requires each counted period to
   * have been under an approved sponsor, not a single continuous employer).
   */
  yearsInSponsoredPosition?: number;
  /** Which subclass 186 stream the user is targeting. Left undefined to evaluate both. */
  nominationStream?: "direct_entry" | "trt";
  /** Official NOC 2021 V1.0 unit group code (5 digits), set when user picks from autocomplete. */
  nocCode?: string;
  /** TEER level (0–5) derived from the selected NOC code. */
  nocTeer?: number;
  /**
   * Subclass 500 (Student) course context. Informational (report display +
   * evidence-readiness status) and a direct, structured 500-detection
   * signal — any of the four being set is treated the same way
   * hasGraduateVisaPathwayIntent is a direct signal for 485, rather than
   * relying only on loose free-text keyword matching. Deliberately NOT
   * used for course-to-occupation matching -- the existing `occupation`
   * field is reused for that instead of a second, hard-to-match text field.
   */
  courseName?: string;
  courseCricosCode?: string;
  courseCompletionStatus?: "studying" | "completed";
  /**
   * "YYYY-MM" (native <input type="month"> format), deliberately not a
   * finer-grained or coarser format so a future months-since-completion
   * calculation -- e.g. against the 485 "held a student visa in the last
   * 6 months" evidence window -- can be added without a data migration.
   */
  courseCompletionDate?: string;
};

export type PathwayRelevance =
  | "possible"
  | "needs_more_information"
  | "not_enough_information"
  | "ineligible";

export type ConfidenceLevel = "low" | "medium" | "high";

export type PathwayComparison = {
  subclass: string;
  visaName: string;
  reason: string;
  relevance: PathwayRelevance;
  confidenceLevel: ConfidenceLevel;
  confidenceExplanation: string;
  difficulty: ComparisonDifficulty;
  requirementType: string;
  userRelativePosition: string;
  keyRequirements: string[];
  pathwaySpecificRisks: string[];
  /**
   * Subclass-specific part of a low-points ineligibility reason (the points
   * comparison), split out from the profile-level shared notes so the Visa
   * Viability Ranking can render this per row. Only set for 189/190/491 when
   * ineligible on points; `reason` still holds the full concatenated form.
   */
  ineligiblePointsLine?: string;
  /**
   * Profile-level notes (English "Mathematical Projection", employment caveat)
   * shared identically across 189/190/491 — rendered once beneath the ranking
   * rows rather than repeated per subclass. Only set alongside ineligiblePointsLine.
   */
  ineligibleSharedNotes?: string[];
};

export type ComparisonDifficulty = "low" | "medium" | "high";

export type IndicatorLevel = "low" | "medium" | "high";

export type InformationCoverageLevel = "initial" | "partial" | "comprehensive";

export type ReportIndicators = {
  dataCompletenessScore: number;
  dataCompletenessLabel: string;
  documentReadinessIndicator: IndicatorLevel;
  informationCoverageLevel: InformationCoverageLevel;
  explanation: string;
};

export type DataCompleteness = {
  percentage: number;
  missingFields: string[];
};

export type KeyVisaRequirement = {
  pathway: string;
  items: string[];
};

export type PointsBreakdownItem = {
  label: string;
  points: number;
  /** Maximum points available in this category (e.g. Age's max is 30), for the "Maximum" column of the points breakdown table. Undefined for categories without a fixed table maximum. */
  max?: number;
  note?: string;
};

export type PointsEstimate = {
  appliesTo: string[];
  estimatedPoints?: number;
  breakdown: PointsBreakdownItem[];
  note: string;
  /** One-line note about occupation/skills-assessment status, shown under the breakdown table -- occupation itself does not carry points-table score, so it's kept out of the scored breakdown array but still needs surfacing. */
  occupationNote?: string;
};

export type OccupationMatch = {
  title: string;
  relevantVisas: string[];
};

export type OccupationIndication = {
  occupation?: string;
  matches: OccupationMatch[];
  note: string;
};

export type RiskLevel = "low" | "medium" | "high";

export type RiskIndicator = {
  level: RiskLevel;
  title: string;
  explanation: string;
};

export type DocumentCategory = {
  category: string;
  items: string[];
};

export type PathwayStrengthComparison = {
  subclass: string;
  visaName: string;
  strength: "limited" | "moderate" | "strong";
  friction: "low" | "medium" | "high" | "extreme";
  evidenceLoad: "low" | "medium" | "high";
  typicalPath: string;
  explanation: string;
  relativePosition: "stronger_signal" | "moderate_signal" | "limited_signal";
  signalReasons: string[];
  limitingFactors: string[];
  evidenceStatus: Array<{
    label: string;
    status: "provided" | "missing" | "unclear" | "typically_required";
  }>;
  /** Hard Gate (1 July 2026): true when this pathway was disqualified by a mandatory rule threshold (salary/age). */
  isHardIneligible?: boolean;
  /** True when the ONLY reason this points-tested pathway is ineligible is a below-threshold score, not a rule violation. Renders with a neutral "Below Points Threshold" label instead of "CRITICAL COMPLIANCE ALERT". */
  isPointsThresholdOnly?: boolean;
  /** Localized "Ineligible: ..." text, shown in bold red as the first item of this pathway's strength breakdown. */
  ineligibleReason?: string;
};

export type EvidenceReadinessItem = {
  category: string;
  status: "provided" | "missing" | "unclear" | "typically_required";
  explanation: string;
};

export type PointsBoosterScenario = {
  label: string;
  estimatedChange: number;
  resultingEstimate?: number;
  explanation: string;
  /** True for the single combined scenario that sums the top individual scenarios' point changes -- a real cumulative calculation, not a display artifact. */
  isCombined?: boolean;
};

export type PointsBoosterSimulator = {
  currentEstimate?: number;
  scenarios: PointsBoosterScenario[];
  note: string;
};

export type FinancialRoadmapItem = {
  category: string;
  estimateType: "official_fee" | "third_party_estimate" | "variable";
  amountLabel: string;
  explanation: string;
};

export type ProgressionPathway = {
  from: string;
  to: string;
  label: string;
  explanation: string;
  isAlternative?: boolean;
};

export type PathwayFriction = {
  pathway: string;
  frictionType: string;
  explanation: string;
  /** Hard Gate (1 July 2026): true when this pathway was disqualified by a mandatory rule threshold (salary/age). Rendered as a bold red "CRITICAL COMPLIANCE ALERT" instead of a routine friction note. */
  isHardIneligible?: boolean;
  /** True when the ONLY reason this points-tested pathway is ineligible is a below-threshold score, not a rule violation. Renders with the neutral "Below Points Threshold" label/color instead of "CRITICAL COMPLIANCE ALERT". */
  isPointsThresholdOnly?: boolean;
};

export type RankedPathwayRecommendation =
  | "🌟 Highly Recommended Pathway"
  | "⚖️ Alternative Option"
  | "⚠️ High Risk / Low Probability"
  | "❌ Ineligible (Compliance Violation)"
  | "📉 Below Points Threshold"
  | "🔍 Preliminary Signal Only";

/** Shown instead of a fabricated %/points figure when assessmentState.canShowNumericRanking is false. */
export type QualitativeFitTier = "Potential fit" | "Unclear fit" | "Unlikely fit";

export type RankedPathway = {
  subclass: "189" | "190" | "491" | "482" | "485" | "500" | "186" | "CEC" | "FSW" | "FSTP" | "PNP" | "AIP" | "FAMILY_SPONSORSHIP";
  visaLabel: string;
  /** Only present when assessmentState.canShowNumericRanking is true — a real deterministic figure, never a placeholder. */
  matchPercentage?: number;
  /** Only present when assessmentState.canShowNumericRanking is true. */
  pointsSignal?: number;
  /** Populated instead of matchPercentage/pointsSignal when data is insufficient for a real points calculation. */
  qualitativeTier?: QualitativeFitTier;
  /** True when matchPercentage/pointsSignal were withheld because dataCompletenessLevel is "partial" or "minimal". */
  isPreliminaryOnly?: boolean;
  /** "Preliminary signal only — points cannot be calculated until [missing fields] are provided." Set when isPreliminaryOnly is true. */
  preliminaryNote?: string;
  /**
   * True for pathways that are structurally gate/eligibility-based (500,
   * 482) rather than points-competitive (189/190/491) — they will NEVER
   * produce a matchPercentage, regardless of how much profile data is
   * provided, unlike isPreliminaryOnly-only entries which are missing a
   * number only temporarily. Lets the renderer show accurate copy ("Gate-
   * Based Pathway") instead of implying more data will yield a percentage.
   */
  isGateBased?: boolean;
  recommendationTag: RankedPathwayRecommendation;
  /** Hard Gate (1 July 2026): true when a mandatory rule threshold (salary/age) was violated. Forces this entry to the top of the Visa Viability Ranking, rendered in red. */
  isHardIneligible?: boolean;
  /** True when the ONLY reason this points-tested pathway (189/190/491) is ineligible is a below-threshold score -- not an age/salary/CSIT rule violation. Rendered in amber with a neutral "Below Points Threshold" label instead of the red "Compliance Violation" styling, since no rule was actually broken. */
  isPointsThresholdOnly?: boolean;
  /** Localized "Ineligible: ..." warning text, shown under the entry when isHardIneligible is true. For low-points subclasses this is the per-subclass points line only; the shared notes below carry the profile-level recommendations. */
  ineligibleReason?: string;
  /** Profile-level notes (English projection, employment caveat) shared across 189/190/491 — rendered once beneath the ranking rows, not per row. */
  ineligibleSharedNotes?: string[];
};

export type DataCompletenessLevel = "sufficient" | "partial" | "minimal";

/**
 * - "eligible": at least one occupation-dataset match exists and at least
 *   one of its relevantVisas overlaps the GSM subclasses (189/190/491).
 * - "ineligible": at least one occupation-dataset match exists, but none of
 *   the matches' relevantVisas overlap 189/190/491 (a real match was found
 *   and confirmed not relevant to skilled independent/nominated/regional).
 * - "unverified": no occupation-dataset match at all. This does NOT mean
 *   the occupation is invalid — only that the stored dataset didn't
 *   recognize it.
 */
export type OccupationEligibility = "eligible" | "ineligible" | "unverified";

/**
 * Single source of truth for assessment confidence, computed ONCE per report
 * generation in the base engine. Every downstream section (Executive
 * Summary, Visa Viability Ranking, Pathway Comparison, Evidence Snapshot)
 * must read from this object instead of independently re-deriving whether
 * enough data exists to show a specific number.
 */
export type AssessmentState = {
  employmentDataProvided: boolean;
  employmentDataConfirmed: boolean;
  fieldsPresent: {
    age: boolean;
    englishLevel: boolean;
    englishTestEvidence: boolean;
    occupation: boolean;
    skillsAssessment: boolean;
    workExperienceYears: boolean;
    partnerStatus: boolean;
    stateNomination: boolean;
    healthCharacterDocs: boolean;
  };
  /** Localized labels for fields in fieldsPresent that are currently false. */
  missingFieldLabels: string[];
  dataCompletenessLevel: DataCompletenessLevel;
  /** Localized "Subclass X: reason" strings for pathways with relevance === "ineligible" (binding regulatory disqualifiers). */
  hardGateFlags: string[];
  /** The real deterministic points estimate from buildPointsEstimate, or undefined if age/English were not provided. */
  estimatedPoints?: number;
  /** See OccupationEligibility. "unverified" when no occupation was provided at all. */
  occupationEligibility: OccupationEligibility;
  /** Localized explanation for occupationEligibility, shown in place of a numeric ranking when it is "ineligible" or "unverified". */
  occupationEligibilityReason: string;
  /** True only when dataCompletenessLevel is "sufficient", estimatedPoints is a real calculated value, AND occupationEligibility is "eligible". Gates all numeric %/points display across the report. */
  canShowNumericRanking: boolean;
};

export type StateNominationStatus =
  | "Open for Offshore"
  | "High Demand"
  | "Closed"
  | "Onshore Only";

export type StateMatchLevel = "high" | "medium" | "low";

/** AU state/territory codes, plus Canada PNP province codes (lib/readiness/pnp-provinces.ts) — the tracker/renderer pipeline is shared, since both are "region-by-region nomination status" data, but the underlying eligibility logic per country is entirely separate. */
export type StateNominationCode = "NSW" | "VIC" | "WA" | "SA" | "QLD" | "NT" | "TAS" | "ACT" | "ON" | "BC" | "AB" | "QC";

export type StateNominationState = {
  code: StateNominationCode;
  name: string;
  status: StateNominationStatus;
  matchLevel: StateMatchLevel;
  score: number;
  summary: string;
  requirements: string[];
};

export type StateNominationTracker = {
  states: StateNominationState[];
  topRecommendedStates: StateNominationState[];
  note: string;
  /** True when the underlying 190/491 pathway is ineligible or numeric ranking cannot be shown (assessmentState.canShowNumericRanking is false). Gates all per-state match %/score display — states/topRecommendedStates are empty when true. */
  eligibilityBlocked: boolean;
  /** Localized qualitative note shown in place of state-by-state numbers when eligibilityBlocked is true. */
  blockedReason?: string;
};

export type ChecklistPriority = "urgent" | "important" | "recommended" | "blocked";

export type ChecklistItem = {
  id: string;
  priority: ChecklistPriority;
  title: string;
  detail: string;
};

export type LodgementReadyChecklist = {
  items: ChecklistItem[];
  note: string;
};

export type AssistantReportData = {
  /** Defaults to "AU" when omitted, preserving existing behavior. */
  country?: "AU" | "CA";
  user: {
    name?: string;
    email?: string;
    currentCountry?: string;
    age?: string;
    occupation?: string;
  };
  targetVisa?: string;
  pointsEstimate?: number;
  primaryLimitingFactor: PrimaryLimitingFactor;
  rankedPathways?: RankedPathway[];
  stateNominationTracker?: StateNominationTracker;
  lodgementReadyChecklist?: LodgementReadyChecklist;
  pathwayComparison: PathwayComparison[];
  executiveSummary: string[];
  suggestedNextSteps: string[];
  riskIndicators: RiskIndicator[];
};

export type SignalSnapshot = {
  strongest: string;
  secondary: string[];
  confidenceLabel: "limited" | "moderate" | "stronger";
  confidenceExplanation: string;
};

export type PrimaryLimitingFactor = {
  label: string;
  explanation: string;
};

export type PositionChanger = {
  label: string;
  explanation: string;
};

export type FrictionScore = "LOW" | "MEDIUM" | "HIGH" | "EXTREME";

export type FrictionAnalysisItem = {
  pathway: string;
  frictionScore: FrictionScore;
  realityCheck: string;
  successSignals: string[];
  /** Occupation-level warning (e.g. an assessing-authority caveat) that is identical across every points-tested subclass (189/190/491) for the same occupation -- kept separate from realityCheck so the renderer can show it once instead of once per subclass row. */
  occupationWarning?: string;
};

export type PremiumInvitationTrendEstimate = {
  subclass: "189" | "190" | "491" | "CEC" | "FSW" | "FSTP" | "PNP";
  estimatedPoints: number;
  estimatedWait: string;
  /** True when this subclass is currently ineligible/unverified for the profile — the estimate is reference data only, not a personal trajectory. */
  isReferenceOnly?: boolean;
  /** Localized "Reference data only — ..." explanation, set when isReferenceOnly is true. */
  referenceOnlyNote?: string;
};

export type PremiumInvitationTrendSection = {
  matchedOccupationGroup: string;
  anzscoCode: string;
  estimates: PremiumInvitationTrendEstimate[];
  note: string;
};

export type PremiumLivingCostSection = {
  city: string;
  familyProfile: string;
  currency: "AUD" | "CAD";
  monthly: {
    rent: number;
    groceries: number;
    transport: number;
    total: number;
  };
  note: string;
};

export type PremiumGanttStep = {
  step: number;
  title: string;
  window: string;
  description: string;
  /** True when this step (typically EOI/lodgement) is currently blocked by an ineligible or unverified pathway. */
  isBlocked?: boolean;
};

export type PremiumGanttSection = {
  timelineBand: string;
  steps: PremiumGanttStep[];
};

export type PremiumScenarioBasedInsights = {
  pathwayStrengthComparison: PathwayStrengthComparison[];
  evidenceReadiness: EvidenceReadinessItem[];
  pointsBoosterSimulator?: PointsBoosterSimulator;
  financialRoadmap: FinancialRoadmapItem[];
  progressionPathways: ProgressionPathway[];
  pathwayFriction: PathwayFriction[];
  frictionAnalysis: FrictionAnalysisItem[];
  documentChecklist: DocumentCategory[];
  suggestedNextSteps: string[];
};

export type PremiumSections = {
  historicalInvitationTrends: PremiumInvitationTrendSection;
  livingCostProjection: PremiumLivingCostSection;
  strategicGanttChart: PremiumGanttSection;
  scenarioBasedInsights: PremiumScenarioBasedInsights;
};

export type ReadinessReport = {
  /** Defaults to "AU" when omitted, preserving existing behavior. */
  country?: "AU" | "CA";
  executiveSummary: string[];
  detectedSubclasses?: string[];
  rankedPathways?: RankedPathway[];
  stateNominationTracker?: StateNominationTracker;
  lodgementReadyChecklist?: LodgementReadyChecklist;
  signalSnapshot: SignalSnapshot;
  primaryLimitingFactor: PrimaryLimitingFactor;
  positionChangers: PositionChanger[];
  pathwayComparison: PathwayComparison[];
  pathwayStrengthComparison: PathwayStrengthComparison[];
  evidenceReadiness: EvidenceReadinessItem[];
  pointsBoosterSimulator?: PointsBoosterSimulator;
  financialRoadmap: FinancialRoadmapItem[];
  progressionPathways: ProgressionPathway[];
  pathwayFriction: PathwayFriction[];
  confidenceExplanation: string;
  /** Single source of truth for assessment confidence; see AssessmentState. */
  assessmentState: AssessmentState;
  reportIndicators: ReportIndicators;
  primaryGap: string;
  dataCompleteness: DataCompleteness;
  keyVisaRequirements: KeyVisaRequirement[];
  factorsAffectingPathways: string[];
  pointsEstimate?: PointsEstimate;
  occupationIndication?: OccupationIndication;
  riskIndicators: RiskIndicator[];
  documentChecklist: DocumentCategory[];
  premiumSections: PremiumSections;
  frictionAnalysis: FrictionAnalysisItem[];
  suggestedNextSteps: string[];
  missingInformation: string[];
  disclaimer: string;
  /** Prepended to financial roadmap, points booster, and checklist sections when key input fields were absent. */
  sparseDataDisclaimer?: string;
  /**
   * HIGH = all 4 critical fields (NOC, language, age, education) are present.
   * LOW  = one or more critical fields are missing.
   * Used by the PDF to render a dynamic confidence label and drive "Action Required" blocking.
   */
  confidenceScore?: "HIGH" | "LOW";
  /**
   * Section identifiers that cannot be personalized due to missing critical data.
   * The PDF renders an "Action Required" box in place of each listed section.
   * Known values: "pointsBoosterSimulator" | "pathwayComparison"
   */
  dataRequiredSections?: string[];
  /** Family-of-3 living cost alongside single-adult for CA reports. */
  livingCostFamily?: {
    city: string;
    currency: "AUD" | "CAD";
    monthly: { rent: number; groceries: number; transport: number; total: number };
  };
  partnerSponsorshipAssessment?: {
    relationshipSignalStrength: "Low" | "Medium" | "High";
    sponsorEligibilitySignal: "Eligible" | "Conditional" | "Blocked";
    hardGateFlags: string[];
    evidenceGaps: string[];
    recommendedNextSteps: string[];
  };
};
