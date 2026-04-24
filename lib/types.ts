export type SupportedLanguage =
  | "English"
  | "Turkish"
  | "Hindi"
  | "Punjabi"
  | "Mandarin"
  | "Arabic"
  | "Spanish"
  | "Vietnamese"
  | "Nepali";

export interface VisaType {
  id: string;
  subclass: string;
  visa_name: string;
  category:
    | "Student"
    | "Skilled"
    | "Employer Sponsored"
    | "Partner"
    | "Visitor"
    | "Regional";
  overview: string;
  requirements: string[];
  work_rights: string;
  stay_period: string;
  cost: string;
  source_url: string;
  last_checked: string;
  pdf_snapshot_url: string;
  reviewed_status: "pending" | "reviewed" | "outdated";
}

export interface VisaRequirement {
  id: string;
  visa_type_id: string;
  requirement_label: string;
  requirement_details: string;
  source_url: string;
  last_checked: string;
}

export interface EnglishRequirement {
  id: string;
  visa_type_id: string;
  accepted_tests: string[];
  minimum_score_notes: string;
  exemptions?: string[];
  source_url: string;
  last_checked: string;
}

export interface FinancialRequirement {
  id: string;
  visa_type_id: string;
  estimated_cost_aud: number;
  evidence_type: string;
  notes?: string;
  source_url: string;
  last_checked: string;
}

export interface SourceSnapshot {
  id: string;
  visa_type_id?: string;
  source_url: string;
  pdf_snapshot_url: string;
  captured_at: string;
  checksum?: string;
}

export interface User {
  id: string;
  full_name?: string;
  email?: string;
  preferred_language: SupportedLanguage;
  created_at: string;
  updated_at: string;
}

export interface Assessment {
  id: string;
  user_id?: string;
  status: "draft" | "completed";
  goal: string;
  summary_text?: string;
  created_at: string;
  updated_at: string;
}

export interface AssessmentAnswer {
  id: string;
  assessment_id: string;
  step_key: string;
  field_key: string;
  value: string;
  created_at: string;
}

export interface Agent {
  id: string;
  full_name: string;
  registration_number: string;
  company_name?: string;
  languages: SupportedLanguage[];
  contact_email: string;
  location?: string;
  active: boolean;
  created_at: string;
}

export interface AgentReferral {
  id: string;
  assessment_id: string;
  user_id?: string;
  agent_id?: string;
  status: "requested" | "assigned" | "completed";
  notes?: string;
  created_at: string;
}

export interface Language {
  code: string;
  label: SupportedLanguage;
  active: boolean;
}

export interface PathwaySuggestion {
  title: string;
  rationale: string;
  caution: string;
}
