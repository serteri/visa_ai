export type Locale = "en" | "tr";

export type ReadinessInput = {
  locale: Locale;
  mainGoal?: string;
  currentCountry?: string;
  passportCountry?: string;
  age?: string;
  occupation?: string;
  englishLevel?: string;
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
  keyRequirements: string[];
  pathwaySpecificRisks: string[];
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

export type ReadinessReport = {
  pathwayComparison: PathwayComparison[];
  keyVisaRequirements: KeyVisaRequirement[];
  whatThisMeans: string[];
  pointsEstimate?: PointsEstimate;
  occupationIndication?: OccupationIndication;
  riskIndicators: RiskIndicator[];
  documentChecklist: DocumentCategory[];
  suggestedNextSteps: string[];
  missingInformation: string[];
  disclaimer: string;
};
