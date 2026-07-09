export type Locale = "en" | "tr" | "zh-Hans";

export type ReadinessInput = {
  locale: Locale;
  /** Defaults to "AU" when omitted, preserving existing behavior. */
  country?: "AU" | "CA";
  mainGoal?: string;
  currentCountry?: string;
  preferredCity?: string;
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
  offshoreExperienceYears?: number;
  onshoreExperienceYears?: number;
  regionalWilling?: boolean;
  educationRelevance?: "relevant" | "non_relevant" | "unknown";
  /** Official NOC 2021 V1.0 unit group code (5 digits), set when user picks from autocomplete. */
  nocCode?: string;
  /** TEER level (0–5) derived from the selected NOC code. */
  nocTeer?: number;
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
  note?: string;
};

export type PointsEstimate = {
  appliesTo: string[];
  estimatedPoints?: number;
  breakdown: PointsBreakdownItem[];
  note: string;
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
  friction: "low" | "medium" | "high";
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
};

export type PathwayFriction = {
  pathway: string;
  frictionType: string;
  explanation: string;
  /** Hard Gate (1 July 2026): true when this pathway was disqualified by a mandatory rule threshold (salary/age). Rendered as a bold red "CRITICAL COMPLIANCE ALERT" instead of a routine friction note. */
  isHardIneligible?: boolean;
};

export type RankedPathwayRecommendation =
  | "🌟 Highly Recommended Pathway"
  | "⚖️ Alternative Option"
  | "⚠️ High Risk / Low Probability"
  | "❌ Ineligible (Compliance Violation)"
  | "🔍 Preliminary Signal Only";

/** Shown instead of a fabricated %/points figure when assessmentState.canShowNumericRanking is false. */
export type QualitativeFitTier = "Potential fit" | "Unclear fit" | "Unlikely fit";

export type RankedPathway = {
  subclass: "189" | "190" | "491" | "482" | "485" | "CEC" | "FSW" | "FSTP" | "PNP" | "AIP" | "FAMILY_SPONSORSHIP";
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
  recommendationTag: RankedPathwayRecommendation;
  /** Hard Gate (1 July 2026): true when a mandatory rule threshold (salary/age) was violated. Forces this entry to the top of the Visa Viability Ranking, rendered in red. */
  isHardIneligible?: boolean;
  /** Localized "Ineligible: ..." warning text, shown under the entry when isHardIneligible is true. */
  ineligibleReason?: string;
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

export type StateNominationCode = "NSW" | "VIC" | "WA" | "SA" | "QLD" | "NT" | "TAS" | "ACT";

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
};

export type PremiumInvitationTrendEstimate = {
  subclass: "189" | "190" | "491" | "CEC" | "FSW" | "FSTP" | "PNP";
  estimatedPoints: number;
  estimatedWait: string;
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
};
