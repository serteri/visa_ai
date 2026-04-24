export type MatchInput = {
  goal: string;
  hasSponsor: boolean;
  inAustralia: boolean;
  englishScore?: number;
};

export type MatchedVisa = {
  subclass: string;
  visa_name: string;
  purpose: string | null;
  match_reason: string;
  confidence: "high" | "medium" | "low";
  source_url: string | null;
  pdf_snapshot_url: string | null;
  /** true when this visa exists as a full record in the database */
  is_database_record: boolean;
};
