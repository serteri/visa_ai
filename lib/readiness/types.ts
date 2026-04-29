export type Locale = "en" | "tr";

export type ReadinessInput = {
  locale: Locale;
  mainGoal?: string;
  currentCountry?: string;
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

export type ReadinessReport = {
  executiveSummary: string[];
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
  suggestedNextSteps: string[];
  missingInformation: string[];
  disclaimer: string;
};
