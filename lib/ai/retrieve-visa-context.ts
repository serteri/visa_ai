import { inArray } from "drizzle-orm";

import { db } from "@/db";
import { sourceSnapshots, visaStructuredData, visaTypes } from "@/db/schema";

export type RetrievedVisaRecord = {
  subclass: "500" | "482" | "189" | "190";
  visaName: string;
  purpose: string | null;
  stayPeriod: string | null;
  cost: string | null;
  workRights: string | null;
  keyRequirements: string[];
  documentsRequired: string[];
  risks: string[];
  englishRequirementsSummary: string | null;
  pointsTestRules: unknown;
  occupationRequirements: unknown;
  sourceUrls: string[];
  pdfSnapshotUrls: string[];
};

export type RetrievedVisaContext = {
  subclasses: Array<"500" | "482" | "189" | "190">;
  records: RetrievedVisaRecord[];
};

const SUBCLASS_ORDER: Array<"500" | "482" | "189" | "190"> = ["500", "482", "189", "190"];

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function detectSubclasses(message: string): Array<"500" | "482" | "189" | "190"> {
  const lower = normalize(message);
  const matches = new Set<"500" | "482" | "189" | "190">();

  const explicit = lower.match(/\b(500|482|189|190)\b/g) ?? [];
  for (const value of explicit) {
    if (value === "500" || value === "482" || value === "189" || value === "190") {
      matches.add(value);
    }
  }

  if (
    ["study", "student", "course", "university", "college", "school"].some((token) =>
      lower.includes(token)
    )
  ) {
    matches.add("500");
  }

  if (["work", "sponsor", "sponsored", "employer", "job offer"].some((token) => lower.includes(token))) {
    matches.add("482");
  }

  if (["pr", "permanent", "skilled", "points", "migration", "migrate"].some((token) => lower.includes(token))) {
    matches.add("189");
    matches.add("190");
  }

  return SUBCLASS_ORDER.filter((subclass) => matches.has(subclass));
}

function summarizeEnglishRequirements(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const chunks: string[] = [];

  if (typeof data.summary === "string") {
    chunks.push(data.summary);
  }

  if (Array.isArray(data.notes) && data.notes.length > 0) {
    chunks.push(`Notes: ${data.notes.slice(0, 2).join(" ")}`);
  }

  if (Array.isArray(data.passport_exemptions) && data.passport_exemptions.length > 0) {
    chunks.push(`Passport exemptions listed: ${data.passport_exemptions.join(", ")}`);
  }

  const dateBuckets = Object.keys(data).filter((key) => key.startsWith("tests_taken") || key.startsWith("test_taken"));
  if (dateBuckets.length > 0) {
    chunks.push(`Test score tables are available for: ${dateBuckets.join(", ")}.`);
  }

  if (chunks.length === 0) {
    chunks.push(`English requirements data keys: ${Object.keys(data).join(", ")}`);
  }

  return chunks.join(" ");
}

export async function retrieveVisaContext(input: { message: string }): Promise<RetrievedVisaContext> {
  const subclasses = detectSubclasses(input.message);

  if (subclasses.length === 0) {
    return { subclasses, records: [] };
  }

  const visas = await db
    .select()
    .from(visaTypes)
    .where(inArray(visaTypes.subclass, subclasses));

  if (visas.length === 0) {
    return { subclasses, records: [] };
  }

  const visaIds = visas.map((visa) => visa.id);

  const structuredRows = await db
    .select()
    .from(visaStructuredData)
    .where(inArray(visaStructuredData.visa_type_id, visaIds));

  const snapshotRows = await db
    .select({
      visa_type_id: sourceSnapshots.visa_type_id,
      source_url: sourceSnapshots.source_url,
      pdf_snapshot_url: sourceSnapshots.pdf_snapshot_url,
    })
    .from(sourceSnapshots)
    .where(inArray(sourceSnapshots.visa_type_id, visaIds));

  const structuredMap = new Map(structuredRows.map((row) => [row.visa_type_id, row]));
  const snapshotsMap = new Map<string, Array<{ source_url: string; pdf_snapshot_url: string | null }>>();

  for (const snapshot of snapshotRows) {
    const existing = snapshotsMap.get(snapshot.visa_type_id) ?? [];
    existing.push({
      source_url: snapshot.source_url,
      pdf_snapshot_url: snapshot.pdf_snapshot_url,
    });
    snapshotsMap.set(snapshot.visa_type_id, existing);
  }

  const records: RetrievedVisaRecord[] = visas
    .map((visa) => {
      const structured = structuredMap.get(visa.id);
      const snapshots = snapshotsMap.get(visa.id) ?? [];
      const rawJson =
        structured?.raw_json && typeof structured.raw_json === "object"
          ? (structured.raw_json as Record<string, unknown>)
          : null;

      const sourceUrls = unique(
        [visa.source_url, ...snapshots.map((snapshot) => snapshot.source_url)]
          .filter((value): value is string => typeof value === "string" && value.length > 0)
      );

      const pdfSnapshotUrls = unique(
        snapshots
          .map((snapshot) => snapshot.pdf_snapshot_url)
          .filter((value): value is string => typeof value === "string" && value.length > 0)
      );

      return {
        subclass: visa.subclass as "500" | "482" | "189" | "190",
        visaName: visa.visa_name,
        purpose: visa.purpose,
        stayPeriod: visa.stay_period,
        cost: visa.cost,
        workRights: visa.work_rights,
        keyRequirements: toStringArray(structured?.key_requirements),
        documentsRequired: toStringArray(structured?.documents_required),
        risks: toStringArray(structured?.risks),
        englishRequirementsSummary: summarizeEnglishRequirements(structured?.english_requirements),
        pointsTestRules: rawJson?.points_test_rules,
        occupationRequirements: rawJson?.occupation_requirements,
        sourceUrls,
        pdfSnapshotUrls,
      };
    })
    .sort(
      (a, b) =>
        SUBCLASS_ORDER.indexOf(a.subclass) - SUBCLASS_ORDER.indexOf(b.subclass)
    );

  return { subclasses, records };
}
