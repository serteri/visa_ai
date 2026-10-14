import type { StateRuleConfig } from "@/lib/state-nomination/state-rules-config";

/**
 * What the admin panel edits for one state / territory, and the cached snapshot the readers use
 * (docs/admin-data-design.md sections A.3 to A.5, D.1). Everything here is plain JSON: it is stored in Postgres and passes through the cache.
 */

export type DataLocale = "en" | "tr" | "zh-Hans";
export const DATA_LOCALES: readonly DataLocale[] = ["en", "tr", "zh-Hans"];

/** A translation of a text. Only a reviewed one is ever shown to customers (D5); an unreviewed one is a draft the admin reads. */
export type TranslationEntry = {
  text: string;
  reviewed: boolean;
  /** "carried_over": the translation customers already saw before the admin panel; "machine_draft": drafted by the model on request; "manual": typed by the admin. */
  origin: "carried_over" | "machine_draft" | "manual";
  draftedAt?: string;
  reviewedBy?: string | null;
  reviewedAt?: string;
};

/** English plus the two translations. English is the source text and is always shown. */
export type LocalizedField = { en: string; tr?: TranslationEntry; "zh-Hans"?: TranslationEntry };

export type ConditionKind = "residence" | "employment" | "study" | "english" | "points" | "fee" | "process" | "other";
export type ResidenceRule = "required" | "not_required" | "not_stated";

/** One published statement of the state, with the explicit flags the code used to infer from sentence prefixes. */
export type StateCondition = {
  id: string;
  kind: ConditionKind;
  /** Subclasses the statement covers; empty = both. */
  subclasses: Array<"190" | "491">;
  stream?: string | null;
  text: LocalizedField;
  /** Only for kind = residence: whether living in the state is required for its onshore streams. */
  residenceRule?: ResidenceRule;
  /** The verbatim sentence in the source and where it is (filled when the condition was approved from a document). */
  quote?: string | null;
  source?: string | null;
};

export type SubclassAvailability = "inherit" | "open" | "closed" | "exception";
export type GstBasis = "stated_by_state" | "computed_10pct" | "no_gst" | "not_stated";

export type SubclassData = {
  subclass: "190" | "491";
  availability: SubclassAvailability;
  allocation: number | null;
  allocationUsed: number | null;
  /** Nomination fee. Both figures are given when the state states them; incl = round(excl x 1.10, 2) unless the state states the incl figure itself. */
  feeExclGst: number | null;
  feeInclGst: number | null;
  gstBasis: GstBasis;
  feeNote: LocalizedField | null;
  effectiveFrom: string | null;
};

export type StateExceptions = {
  text: LocalizedField;
  subclass?: "190" | "491" | null;
  appliesTo?: "onshore" | "offshore" | "all" | null;
  deadline?: string | null;
};

/** The inputs the report's score formula needs (docs section A.5). Seeded from state-nomination-status.json; admin-edited in an advanced section. */
export type ScoringInputs = {
  offshoreAvailability: "open" | "limited" | "closed";
  onshoreAvailability: "open" | "priority" | "closed";
  minimumPoints: number;
  minimumEnglish: "competent" | "proficient" | "superior";
  minimumExperienceYears: number;
  regionalFocus: boolean;
  preferredVisaTypes: Array<"190" | "491">;
  requiresStateResidence: boolean;
  requiresRecentEmployment: boolean;
  /** Penalty input of the score formula (the dataset's value). */
  offshoreQuotaPressure: "low" | "medium" | "high" | "closed";
  /** The rule-level pressure that decides whether a closed state scores at the lowest floor. */
  ruleQuotaPressure: "low" | "medium" | "high" | "closed";
  programWindow: string;
  specialConditions: LocalizedField[];
};

export type StateProgramData = {
  stateCode: string;
  stateName: string;
  programYear: string;
  status: string;
  statusChangedAt: string | null;
  openingDate: string | null;
  closingDate: string | null;
  officialUrl: string | null;
  /** Other official pages the monitor watches. */
  extraUrls: string[];
  exceptions: StateExceptions | null;
  notes: LocalizedField;
  aiSummary: LocalizedField;
  conditions: StateCondition[];
  scoring: ScoringInputs;
  subclasses: SubclassData[];
  /** Set by the server on every save (and by "mark verified"), never typed. */
  lastVerifiedAt: string;
  lastVerifiedBy: string | null;
  /** The documents the data comes from, as text, until uploaded documents exist (Part 4). */
  sourceText: string;
  updatedAt: string | null;
  updatedBy: string | null;
};

/** What the readers get: the old shapes (so the report, chat and residence code are unchanged) built from the admin rows. */
export type StateRuleView = StateRuleConfig & {
  /** The notes with their translations (a reader picks the language with localizedText). */
  notes: LocalizedField;
  conditions: StateCondition[];
  exceptions: StateExceptions | null;
  openingDate: string | null;
  programYear: string;
  officialUrl: string | null;
  subclasses: SubclassData[];
  /** The condition texts in the same order as keyFacts, with their translations. */
  keyFactFields: LocalizedField[];
};

export type StateDatasetRowView = {
  code: string;
  name: string;
  lastVerified: string;
  status: string;
  offshoreAvailability: ScoringInputs["offshoreAvailability"];
  onshoreAvailability: ScoringInputs["onshoreAvailability"];
  minimumPoints: number;
  minimumEnglish: ScoringInputs["minimumEnglish"];
  minimumExperienceYears: number;
  regionalFocus: boolean;
  preferredVisaTypes: Array<"190" | "491">;
  requiresStateResidence: boolean;
  requiresRecentEmployment: boolean;
  offshoreQuotaPressure: ScoringInputs["offshoreQuotaPressure"];
  programWindow: string;
  specialConditions: string[];
  specialConditionFields: LocalizedField[];
};

export type AdminStateData = {
  /** Where the snapshot came from: the database, or the bundled seed (empty table / database unreachable). */
  source: "db" | "seed";
  generatedAt: string;
  programs: Record<string, StateProgramData>;
  rules: Record<string, StateRuleView>;
  dataset: StateDatasetRowView[];
};
