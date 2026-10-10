// Pure constants, safe to import from a client component (lib/crm/leads.ts pulls in server-only modules and must never be imported by one).
export const DOC_STATUSES = ["New", "Contacted", "Documents Pending", "Approved", "Rejected"] as const;
export type DocStatus = (typeof DOC_STATUSES)[number];
