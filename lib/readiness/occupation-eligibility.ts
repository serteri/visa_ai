import occupationsData from "@/src/data/occupations.json";
import anzscoListData from "@/src/data/anzsco-list.json";
import skilledOccupationListData from "@/public/skilled-occupation-list.json";

export type SkilledSubclass = "189" | "190" | "491";

type OccupationRecord = {
  anzsco_code: string;
  occupation_name: string;
  authority: string;
  visa_lists?: string[];
};

type SkilledOccupationListRow = {
  anzsco_code: string;
  list: string[];
};

type LocalizedAnzscoRecord = {
  code: string;
  title: string;
  title_tr?: string;
  title_zh?: string;
};

const AMBIGUOUS_GENERIC_TERMS = new Set([
  "doktor",
  "doctor",
  "physician",
  "hekim",
  "medical doctor",
  "医生",
  "醫生",
]);

const OCCUPATION_ROWS = (occupationsData as { occupations: OccupationRecord[] }).occupations;
const LOCALIZED_ROWS = (anzscoListData as any[]).map(row => ({
  code: row.code,
  title: row.title_en || row.title || "",
  title_tr: row.title_tr,
  title_zh: row.title_zh,
})) as LocalizedAnzscoRecord[];

function normalize(value?: string): string {
  return (value ?? "").trim().toLowerCase();
}

function normalizeForLookup(value?: string): string {
  return normalize(value)
    .replace(/[ıİ]/g, "i")
    .replace(/[şŞ]/g, "s")
    .replace(/[ğĞ]/g, "g")
    .replace(/[çÇ]/g, "c")
    .replace(/[öÖ]/g, "o")
    .replace(/[üÜ]/g, "u")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function parseAnzscoCode(occupation?: string): string | undefined {
  if (!occupation) return undefined;
  return occupation.match(/(\d{6})/)?.[1];
}

function isAmbiguousGenericTerm(value?: string): boolean {
  const raw = normalize(value);
  const folded = normalizeForLookup(value);
  return AMBIGUOUS_GENERIC_TERMS.has(raw) || AMBIGUOUS_GENERIC_TERMS.has(folded);
}

const OCCUPATIONS_BY_CODE = new Map(OCCUPATION_ROWS.map((row) => [row.anzsco_code, row]));

// Skilled Occupation List: the primary source of truth for "is this
// occupation scoreable under 189/190/491 (or otherwise on a skilled list at
// all)". Kept separate from occupations.json, which is the broader
// full-ANZSCO dataset (skilled and non-skilled occupations both) used for
// search/autocomplete and for non-list fields (authority, qualification,
// etc). A code can appear on multiple rows here (distinct title variants
// sharing one ANZSCO code), so list membership is the union across all rows
// for that code.
//
// public/skilled-occupation-list.json (671 codes) does not cover every
// occupation occupations.json knows about -- e.g. it has no row at all for
// "Software Engineer" (261313), a real MLTSSL/CSOL occupation, despite being
// the more detailed/current source where it does have a row. So this falls
// back to occupations.json's own visa_lists (itself corrected against this
// same skilled-occupation-list.json earlier) for any code missing here,
// rather than treating "absent from this file" as "confirmed not skilled".
const SKILLED_LISTS_BY_CODE = new Map<string, Set<string>>();
for (const row of skilledOccupationListData as SkilledOccupationListRow[]) {
  const existing = SKILLED_LISTS_BY_CODE.get(row.anzsco_code) ?? new Set<string>();
  for (const list of row.list ?? []) existing.add(list);
  SKILLED_LISTS_BY_CODE.set(row.anzsco_code, existing);
}

/**
 * Returns the Skilled Occupation List membership (MLTSSL/STSOL/ROL/CSOL) for
 * a resolved ANZSCO code, or an empty array if the code isn't on any skilled
 * list. Prefers public/skilled-occupation-list.json; falls back to
 * occupations.json's own visa_lists when the code has no row there at all.
 */
export function getSkilledListMembership(anzscoCode?: string): string[] {
  if (!anzscoCode) return [];
  const fromSkilledList = SKILLED_LISTS_BY_CODE.get(anzscoCode);
  if (fromSkilledList) return Array.from(fromSkilledList);

  const occupationRecord = OCCUPATIONS_BY_CODE.get(anzscoCode);
  return occupationRecord?.visa_lists ?? [];
}

/**
 * Whether a raw occupation value (code or name) resolves to an occupation on
 * any skilled list. Returns false both when the occupation resolves but
 * carries no skilled-list membership, and when it doesn't resolve at all.
 */
export function isOnSkilledOccupationList(occupation?: string): boolean {
  const record = findOccupationRecord(occupation);
  if (!record) return false;
  return getSkilledListMembership(record.anzsco_code).length > 0;
}

const LOCALIZED_ALIASES = new Map<string, string>();

for (const row of LOCALIZED_ROWS) {
  if (!OCCUPATIONS_BY_CODE.has(row.code)) continue;

  const aliases = [row.title, row.title_tr, row.title_zh, `${row.title} (${row.code})`, `${row.title_tr ?? ""} (${row.code})`];
  for (const alias of aliases) {
    const raw = normalize(alias);
    const folded = normalizeForLookup(alias);
    if (raw) LOCALIZED_ALIASES.set(raw, row.code);
    if (folded) LOCALIZED_ALIASES.set(folded, row.code);
  }
}

const NORMALIZED_OCCUPATION_NAMES = OCCUPATION_ROWS.map((row) => ({
  row,
  plain: normalize(row.occupation_name),
  folded: normalizeForLookup(row.occupation_name),
}));

function findOccupationByCanonicalOrLocalizedAlias(occupation?: string): OccupationRecord | undefined {
  const raw = normalize(occupation);
  const folded = normalizeForLookup(occupation);

  // Generic role words like "doctor" are ambiguous between multiple ANZSCO entries.
  // We intentionally avoid guessing a single code.
  if (isAmbiguousGenericTerm(occupation)) {
    return undefined;
  }

  const aliasCode = LOCALIZED_ALIASES.get(raw) ?? LOCALIZED_ALIASES.get(folded);
  if (aliasCode) {
    return OCCUPATIONS_BY_CODE.get(aliasCode);
  }

  const exact = NORMALIZED_OCCUPATION_NAMES.find((entry) => entry.plain === raw || entry.folded === folded);
  if (exact) return exact.row;

  const partial = NORMALIZED_OCCUPATION_NAMES.find(
    (entry) => entry.plain.includes(raw) || raw.includes(entry.plain) || entry.folded.includes(folded) || folded.includes(entry.folded)
  );
  return partial?.row;
}

export function findOccupationRecord(occupation?: string): OccupationRecord | undefined {
  const code = parseAnzscoCode(occupation);
  if (code) {
    const byCode = OCCUPATIONS_BY_CODE.get(code);
    if (byCode) return byCode;
  }

  return findOccupationByCanonicalOrLocalizedAlias(occupation);
}

export function isAmbiguousOccupationAlias(occupation?: string): boolean {
  return isAmbiguousGenericTerm(occupation);
}

export function canonicalizeOccupationInput(occupation?: string): string {
  const trimmed = (occupation ?? "").trim();
  if (!trimmed) return "";

  const record = findOccupationRecord(trimmed);
  if (!record) return trimmed;

  return `${record.occupation_name} (${record.anzsco_code})`;
}

const LOCALIZED_BY_CODE = new Map(LOCALIZED_ROWS.map((row) => [row.code, row]));

/**
 * Resolves a raw occupation value (which may now be a bare ANZSCO code, e.g.
 * "233512", since the intake form submits codes for AU) to a human-readable,
 * locale-appropriate display name.
 *
 * anzsco-list.json (the AU search/autocomplete index) is now derived
 * directly from occupations.json (deduplicated, same ANZSCO codes), so a
 * code submitted from that autocomplete always has a matching
 * occupations.json record. The LOCALIZED_BY_CODE fallback below only
 * matters for genuinely unmatched/free-text input.
 */
export function resolveOccupationDisplayName(occupation?: string, locale?: "en" | "tr" | "zh-Hans"): string {
  const raw = (occupation ?? "").trim();
  if (!raw) return raw;

  const record = findOccupationRecord(raw);
  if (!record) {
    const code = parseAnzscoCode(raw);
    const searchIndexEntry = code ? LOCALIZED_BY_CODE.get(code) : undefined;
    if (searchIndexEntry) {
      if (locale === "tr" && searchIndexEntry.title_tr) return searchIndexEntry.title_tr;
      if (locale === "zh-Hans" && searchIndexEntry.title_zh) return searchIndexEntry.title_zh;
      return searchIndexEntry.title;
    }
    return raw;
  }

  const localized = LOCALIZED_BY_CODE.get(record.anzsco_code);
  if (localized) {
    if (locale === "tr" && localized.title_tr) return localized.title_tr;
    if (locale === "zh-Hans" && localized.title_zh) return localized.title_zh;
    return localized.title;
  }

  return record.occupation_name;
}

export function getEligibleSkilledSubclasses(occupation?: string): SkilledSubclass[] {
  const record = findOccupationRecord(occupation);
  if (!record) return [];

  const listMemberships = new Set(getSkilledListMembership(record.anzsco_code));
  const subclasses: SkilledSubclass[] = [];

  if (listMemberships.has("MLTSSL")) {
    subclasses.push("189", "190", "491");
  } else {
    if (listMemberships.has("STSOL")) {
      subclasses.push("190", "491");
    }
    if (listMemberships.has("ROL")) {
      subclasses.push("491");
    }
  }

  return Array.from(new Set(subclasses));
}
