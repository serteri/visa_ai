import occupationsData from "@/src/data/occupations.json";
import anzscoListData from "@/src/data/anzsco-list.json";

export type SkilledSubclass = "189" | "190" | "491";

type OccupationRecord = {
  anzsco_code: string;
  occupation_name: string;
  authority: string;
  visa_lists?: string[];
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
 * anzsco-list.json (the AU search/autocomplete index -- see
 * build-ultimate-anzsco.py) is keyed by OSCA identifiers, not real ANZSCO
 * codes, and the two numbering schemes are not interchangeable; a code
 * submitted from that autocomplete routinely has no entry in
 * occupations.json (the authoritative, real-ANZSCO-coded dataset used for
 * skilled-list eligibility). When that happens this still shows the
 * anzsco-list.json title for that code, if one exists, rather than the bare
 * numeric code -- purely cosmetic, since the eligibility check itself
 * still correctly finds nothing for an unmatched code. Only genuinely
 * unmatched/free-text input falls through to the raw string.
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

  const listMemberships = new Set(record.visa_lists ?? []);
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
