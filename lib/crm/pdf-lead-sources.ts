import { PDF_SLUGS } from "@/lib/email/pdf-delivery";

// UserReport.source values for leads created from PDF-guide downloads
// (app/api/pdf-download/route.ts), keyed by the same slug used for the
// Drizzle pdf_downloads insert and the CRM display category. Kept separate
// from PDF_LEAD_CATEGORY (the human-readable label) since `source` is a
// stable machine value used for pool filtering.
export const PDF_LEAD_SOURCE: Record<string, string> = {
  [PDF_SLUGS.turkish]: "pdf_turkish_guide",
  [PDF_SLUGS.global]: "pdf_global_guide",
  [PDF_SLUGS.occupation]: "pdf_occupation_list",
};

// Turkish Guide leads are Turkey-market only; Global Guide + Occupation List
// leads sit in the shared/global pool any agent can claim from.
export function marketForSlug(slug: string): "TR" | "GLOBAL" {
  return slug === PDF_SLUGS.turkish ? "TR" : "GLOBAL";
}

export const PDF_LEAD_SOURCES = Object.values(PDF_LEAD_SOURCE);
