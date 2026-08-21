import type { VisaStage } from "./visa-stages";

/**
 * Document types the Document Vault (StageDocumentsCard) can request,
 * stored verbatim as VisaDocument.documentType (prisma/schema.prisma) --
 * a plain string column, not a DB enum.
 */
export const VISA_DOCUMENT_TYPES = [
  "PASSPORT",
  "IDENTITY_DOCUMENT",
  "ENGLISH_TEST_RESULT",
  "SKILLS_ASSESSMENT",
  "RESUME_CV",
  "EMPLOYMENT_REFERENCE",
  "MEDICAL_EXAM",
  "POLICE_CLEARANCE",
  "FORM_80",
] as const;

export type VisaDocumentType = (typeof VISA_DOCUMENT_TYPES)[number];

export function isVisaDocumentType(value: string): value is VisaDocumentType {
  return (VISA_DOCUMENT_TYPES as readonly string[]).includes(value);
}

/** i18n key (public/locales/{locale}.json) for a document type's display label. */
export const VISA_DOCUMENT_TYPE_LABEL_KEY: Record<VisaDocumentType, string> = {
  PASSPORT: "portal.doc.passport",
  IDENTITY_DOCUMENT: "portal.doc.identityDocument",
  ENGLISH_TEST_RESULT: "portal.doc.englishTestResult",
  SKILLS_ASSESSMENT: "portal.doc.skillsAssessment",
  RESUME_CV: "portal.doc.resumeCv",
  EMPLOYMENT_REFERENCE: "portal.doc.employmentReference",
  MEDICAL_EXAM: "portal.doc.medicalExam",
  POLICE_CLEARANCE: "portal.doc.policeClearance",
  FORM_80: "portal.doc.form80",
};

/**
 * Which document types are expected at each journey stage -- drives
 * StageDocumentsCard's "here's what to upload right now" list. A document
 * type can appear at more than one stage (e.g. PASSPORT is useful evidence
 * throughout); this only controls what's *suggested*, not a hard
 * requirement gate.
 */
export const DOCUMENTS_BY_STAGE: Record<VisaStage, VisaDocumentType[]> = {
  PREPARATION: ["PASSPORT", "IDENTITY_DOCUMENT", "RESUME_CV"],
  ENGLISH_TEST: ["ENGLISH_TEST_RESULT"],
  SKILLS_ASSESSMENT: ["SKILLS_ASSESSMENT", "EMPLOYMENT_REFERENCE"],
  EOI_NOMINATION: ["RESUME_CV", "EMPLOYMENT_REFERENCE"],
  VISA_LODGE: ["MEDICAL_EXAM", "POLICE_CLEARANCE", "FORM_80"],
};

/** Document review statuses -- VisaDocument.status. */
export const VISA_DOCUMENT_STATUSES = ["PENDING", "AI_VERIFIED", "REJECTED", "MANUAL_REVIEW"] as const;
export type VisaDocumentStatus = (typeof VISA_DOCUMENT_STATUSES)[number];

export const VISA_DOCUMENT_STATUS_LABEL_KEY: Record<VisaDocumentStatus, string> = {
  PENDING: "portal.docStatus.pending",
  AI_VERIFIED: "portal.docStatus.aiVerified",
  REJECTED: "portal.docStatus.rejected",
  MANUAL_REVIEW: "portal.docStatus.manualReview",
};
