import { inArray } from "drizzle-orm";

import { db } from "@/db";
import { sourceSnapshots, visaStructuredData, visaTypes } from "@/db/schema";

export type RetrievedVisaRecord = {
  subclass: "500" | "482" | "189" | "190" | "491";
  visa_name: string;
  category: string;
  purpose: string | null;
  stay_period: string | null;
  cost: string | null;
  work_rights: string | null;
  key_requirements: string[];
  documents_required: string[];
  application_steps: string[];
  visa_conditions: string[];
  risks: string[];
  english_requirements: unknown;
  financial_requirements: unknown;
  occupation_requirements: unknown;
  points_test_rules: unknown;
  source_url: string | null;
  pdf_snapshot_urls: string[];
};

export type RetrievedVisaContext = RetrievedVisaRecord[];

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function hasWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

function hasPhrase(text: string, phrase: string): boolean {
  return text.includes(phrase.toLowerCase());
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

const SUBCLASS_ORDER: Array<"500" | "482" | "189" | "190" | "491"> = [
  "500",
  "482",
  "189",
  "190",
  "491",
];

function detectSubclasses(message: string): Array<"500" | "482" | "189" | "190" | "491"> {
  const lower = normalize(message);
  const matches = new Set<"500" | "482" | "189" | "190" | "491">();

  const explicit = lower.match(/\b(500|482|189|190|491)\b/g) ?? [];
  for (const value of explicit) {
    if (
      value === "500" ||
      value === "482" ||
      value === "189" ||
      value === "190" ||
      value === "491"
    ) {
      matches.add(value);
    }
  }

  const mentions500 = ["500", "student", "study", "course"].some((token) => hasWord(lower, token));
  if (mentions500) {
    matches.add("500");
  }

  const mentions482 = ["482", "work", "sponsor", "employer"].some((token) => hasWord(lower, token));
  if (mentions482) {
    matches.add("482");
  }

  const mentions189Explicit = hasWord(lower, "189") || hasPhrase(lower, "skilled independent");
  const mentions190Explicit = hasWord(lower, "190") || hasPhrase(lower, "skilled nominated") || hasPhrase(lower, "state nomination");
  const mentions491Explicit =
    hasWord(lower, "491") ||
    hasPhrase(lower, "skilled work regional") ||
    hasPhrase(lower, "designated regional area") ||
    hasPhrase(lower, "regional migration") ||
    hasPhrase(lower, "family sponsor") ||
    hasPhrase(lower, "eligible relative sponsor") ||
    hasPhrase(lower, "eligible relative sponsorship") ||
    hasWord(lower, "regional");
  const mentionsPrGeneric =
    hasWord(lower, "pr") ||
    hasWord(lower, "permanent") ||
    hasWord(lower, "points") ||
    hasWord(lower, "migrate") ||
    hasPhrase(lower, "skilled migration");

  if (mentions189Explicit) {
    matches.add("189");
  }

  if (mentions190Explicit) {
    matches.add("190");
  }

  if (mentions491Explicit) {
    matches.add("491");
  }

  if (mentionsPrGeneric && !mentions189Explicit && !mentions190Explicit) {
    matches.add("189");
    matches.add("190");
    matches.add("491");
  }

  return SUBCLASS_ORDER.filter((subclass) => matches.has(subclass));
}

export async function retrieveVisaContext(input: { message: string }): Promise<RetrievedVisaContext> {
  const subclasses = detectSubclasses(input.message);

  const visas =
    subclasses.length > 0
      ? await db
          .select()
          .from(visaTypes)
          .where(inArray(visaTypes.subclass, subclasses))
      : await db
          .select()
          .from(visaTypes)
          .where(inArray(visaTypes.subclass, SUBCLASS_ORDER));

  if (visas.length === 0) return [];

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
        subclass: visa.subclass as "500" | "482" | "189" | "190" | "491",
        visa_name: visa.visa_name,
        category: visa.category,
        purpose: visa.purpose,
        stay_period: visa.stay_period,
        cost: visa.cost,
        work_rights: visa.work_rights,
        key_requirements: toStringArray(structured?.key_requirements),
        documents_required: toStringArray(structured?.documents_required),
        application_steps: toStringArray(structured?.application_steps),
        visa_conditions: toStringArray(structured?.visa_conditions),
        risks: toStringArray(structured?.risks),
        english_requirements: structured?.english_requirements ?? null,
        financial_requirements: structured?.financial_requirements ?? null,
        occupation_requirements: rawJson?.occupation_requirements ?? null,
        points_test_rules: rawJson?.points_test_rules ?? null,
        source_url: sourceUrls[0] ?? null,
        pdf_snapshot_urls: pdfSnapshotUrls,
      };
    })
    .sort(
      (a, b) =>
        SUBCLASS_ORDER.indexOf(a.subclass) - SUBCLASS_ORDER.indexOf(b.subclass)
    );

  return records;
}
