import type { PathwaySuggestion, VisaType } from "@/lib/types";

export const supportedLanguages = [
  "English",
  "Turkish",
  "Hindi",
  "Punjabi",
  "Mandarin",
  "Arabic",
  "Spanish",
  "Vietnamese",
  "Nepali",
] as const;

export const mockVisaTypes: VisaType[] = [
  {
    id: "visa-student-500",
    subclass: "500",
    visa_name: "Student Visa",
    category: "Student",
    overview: "For eligible applicants undertaking approved study in Australia.",
    requirements: [
      "Confirmation of enrolment",
      "Evidence of funds",
      "English evidence where required",
    ],
    work_rights: "Limited work rights may apply based on visa conditions.",
    stay_period: "Up to 5 years depending on course.",
    cost: "From AUD 1,600+",
    source_url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
    last_checked: "2026-04-24",
    pdf_snapshot_url: "/snapshots/student-500.pdf",
    reviewed_status: "pending",
  },
  {
    id: "visa-skilled-189",
    subclass: "189",
    visa_name: "Skilled Independent Visa",
    category: "Skilled",
    overview: "Points-tested permanent pathway for invited skilled workers.",
    requirements: [
      "Skills assessment",
      "Expression of Interest",
      "Invitation round outcome",
    ],
    work_rights: "Full work rights upon grant.",
    stay_period: "Permanent",
    cost: "From AUD 4,765+",
    source_url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-independent-189",
    last_checked: "2026-04-24",
    pdf_snapshot_url: "/snapshots/skilled-189.pdf",
    reviewed_status: "pending",
  },
  {
    id: "visa-employer-482",
    subclass: "482",
    visa_name: "Skills in Demand Visa",
    category: "Employer Sponsored",
    overview: "Temporary employer-sponsored pathway tied to approved sponsorship.",
    requirements: [
      "Approved sponsor",
      "Relevant occupation",
      "Skills and English evidence",
    ],
    work_rights: "Work for sponsoring employer under visa conditions.",
    stay_period: "Varies by stream.",
    cost: "From AUD 1,455+",
    source_url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skills-in-demand-482",
    last_checked: "2026-04-24",
    pdf_snapshot_url: "/snapshots/sid-482.pdf",
    reviewed_status: "pending",
  },
];

export const mockPathwaySuggestions: PathwaySuggestion[] = [
  {
    title: "Student pathway (subclass 500) may be relevant",
    rationale:
      "Based on your study-focused responses, this pathway could be worth reviewing with a registered migration agent.",
    caution:
      "Course enrolment, financial evidence, and visa conditions should be validated against current official criteria.",
  },
  {
    title: "Employer-sponsored options may be worth discussing",
    rationale:
      "Because you indicated work plans and sponsor potential, employer-sponsored pathways could be worth discussing with a registered migration agent.",
    caution:
      "Sponsor status, occupation alignment, and stream-specific requirements can materially change your options.",
  },
];

export const mockMissingInformation = [
  "English test details and exact score report",
  "Occupation assessment status",
  "Document readiness checklist",
];

export const mockRiskFlags = [
  "Timelines may be impacted if documents are incomplete",
  "English evidence may affect pathway competitiveness",
  "Visa policy updates can change pathway relevance",
];
