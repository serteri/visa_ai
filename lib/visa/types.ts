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
};
