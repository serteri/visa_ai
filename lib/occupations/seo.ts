import occupationsData from "@/src/data/occupations.json";
import anzscoListData from "@/src/data/anzsco-list.json";

export type OccupationRecord = {
  anzsco_code: string;
  occupation_name: string;
  authority: string;
  visa_lists: string[];
};

/** Trilingual title/duties entry from the full ANZSCO taxonomy -- keyed by
 *  the same 6-digit code as OccupationRecord.anzsco_code, but sourced from
 *  a different, richer dataset (src/data/anzsco-list.json) that the
 *  points/eligibility data (occupations.json) doesn't carry. */
export type AnzscoListEntry = {
  code: string;
  title_en: string;
  title_tr: string;
  title_zh: string;
  duties_en: string[];
  duties_tr: string[];
  duties_zh: string[];
};

const OCCUPATION_ROWS = (occupationsData as { occupations: OccupationRecord[] }).occupations;

const ANZSCO_LIST_ROWS = anzscoListData as AnzscoListEntry[];
const ANZSCO_LIST_BY_CODE = new Map<string, AnzscoListEntry>(
  ANZSCO_LIST_ROWS.map((entry) => [entry.code, entry])
);

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

/** Looks up the trilingual title/duties entry for the same ANZSCO code.
 *  Independent of findOccupationById -- occupations.json (1464 rows) and
 *  anzsco-list.json (1336 rows) aren't 1:1, so a code present in one may be
 *  absent from the other. Callers must handle a null result and fall back
 *  to occupation_name (English-only). */
export function findAnzscoListEntry(id: string): AnzscoListEntry | null {
  const code = parseOccupationCodeFromId(id);
  if (!code) return null;

  return ANZSCO_LIST_BY_CODE.get(code) ?? null;
}

/** Resolves the localized title for a trilingual entry, falling back to
 *  English when the target-locale field is empty (some rows have blank
 *  tr/zh strings rather than being absent from the dataset entirely). */
export function localizedTitle(entry: AnzscoListEntry, locale: string): string {
  const field = locale === "tr" ? entry.title_tr : locale === "zh-Hans" ? entry.title_zh : entry.title_en;
  return field?.trim() || entry.title_en;
}

/** Resolves the localized duty-statement list, falling back to the English
 *  duties array when the target locale has none. */
export function localizedDuties(entry: AnzscoListEntry, locale: string): string[] {
  const field = locale === "tr" ? entry.duties_tr : locale === "zh-Hans" ? entry.duties_zh : entry.duties_en;
  return field?.length ? field : entry.duties_en;
}

export function deriveSubclasses(record: OccupationRecord): string[] {
  const set = new Set<string>();

  for (const listName of record.visa_lists ?? []) {
    const mapped = LIST_TO_SUBCLASSES[listName] ?? [];
    for (const subclass of mapped) set.add(subclass);
  }

  return Array.from(set);
}
