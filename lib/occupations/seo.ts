import occupationsData from "@/src/data/occupations.json";

export type OccupationRecord = {
  anzsco_code: string;
  occupation_name: string;
  authority: string;
  visa_lists: string[];
};

const OCCUPATION_ROWS = (occupationsData as { occupations: OccupationRecord[] }).occupations;

const LIST_TO_SUBCLASSES: Record<string, string[]> = {
  MLTSSL: ["189", "190", "491"],
  STSOL: ["190", "491", "482"],
  ROL: ["491"],
  RSOL: ["491"],
};

export function slugifyOccupationName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function buildOccupationSlug(record: OccupationRecord): string {
  return `${record.anzsco_code}-${slugifyOccupationName(record.occupation_name)}`;
}

export function parseOccupationCodeFromId(id: string): string | null {
  const match = id.match(/^(\d{6})/);
  return match?.[1] ?? null;
}

export function getUniqueOccupations(): OccupationRecord[] {
  const seen = new Set<string>();
  const unique: OccupationRecord[] = [];

  for (const item of OCCUPATION_ROWS) {
    if (!item?.anzsco_code || seen.has(item.anzsco_code)) continue;
    // Only include occupations eligible for skilled migration — non-eligible
    // (isEligibleForMigration: false) entries must NOT appear in the sitemap
    // to avoid Google Search Console "Soft 404" and "Not found" errors.
    if ((item as any).isEligibleForMigration === false) continue;
    seen.add(item.anzsco_code);
    unique.push(item);
  }

  return unique;
}

export function findOccupationById(id: string): OccupationRecord | null {
  const code = parseOccupationCodeFromId(id);
  if (!code) return null;

  return getUniqueOccupations().find((item) => item.anzsco_code === code) ?? null;
}

export function deriveSubclasses(record: OccupationRecord): string[] {
  const set = new Set<string>();

  for (const listName of record.visa_lists ?? []) {
    const mapped = LIST_TO_SUBCLASSES[listName] ?? [];
    for (const subclass of mapped) set.add(subclass);
  }

  return Array.from(set);
}
