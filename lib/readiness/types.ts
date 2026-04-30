export type Locale = "en" | "tr" | "zh-Hans";

export type ReadinessInput = {
  locale: Locale;
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
  sponsorOrFamily?: string;
  preferredPathway?: string;
  biggestConcern?: string;
  qualificationLevel?: "PhD" | "Bachelor" | "Diploma" | "Certificate" | "Other";
  offshoreExperienceYears?: number;
  onshoreExperienceYears?: number;
  regionalWilling?: boolean;
  educationRelevance?: "relevant" | "non_relevant" | "unknown";
};

export type PathwayRelevance =
  | "possible"
  | "needs_more_information"
  | "not_enough_information";

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
  subclass: "189" | "190" | "491";
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
  familyProfile: "Single" | "Couple" | "Family of 4";
  currency: "AUD";
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

export type PremiumSections = {
  historicalInvitationTrends: PremiumInvitationTrendSection;
  livingCostProjection: PremiumLivingCostSection;
  strategicGanttChart: PremiumGanttSection;
};

export type ReadinessReport = {
  executiveSummary: string[];
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
};
