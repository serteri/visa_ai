/**
 * Corrects src/data/occupations.json using the authoritative parsed Skilled
 * Occupation List (src/data/skilled-occupation-list.json). For every occupation
 * present in the official list we overwrite `visa_lists` + `authority` (the .md
 * is the source of truth) and attach `visa_subclasses`. Occupations NOT in the
 * official list are left untouched (conservative — we don't wipe rows the .md
 * simply doesn't cover). Run after parse-skilled-occupation-list.ts:
 *   npx tsx scripts/merge-skilled-list-into-occupations.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type Occ = {
  anzsco_code: string;
  occupation_name: string;
  authority?: string;
  visa_lists?: string[];
  visa_subclasses?: string[];
  critical_warning?: string;
  [k: string]: unknown;
};

type Skilled = {
  anzsco_code: string;
  occupation_name: string;
  lists: string[];
  visa_subclasses: string[];
  authority: string;
};

const OCC_PATH = path.join(process.cwd(), "src/data/occupations.json");
const SKILLED_PATH = path.join(process.cwd(), "src/data/skilled-occupation-list.json");

const occFile = JSON.parse(readFileSync(OCC_PATH, "utf8")) as { occupations: Occ[] };
const skilledFile = JSON.parse(readFileSync(SKILLED_PATH, "utf8")) as { occupations: Skilled[] };

const byCode = new Map(occFile.occupations.map((o) => [o.anzsco_code, o]));

let updated = 0;
let added = 0;
const GENERIC_NOT_MAPPED =
  "This occupation is present in the ANZSCO classification but is not currently mapped to skilled visa lists in this dataset.";

for (const s of skilledFile.occupations) {
  const existing = byCode.get(s.anzsco_code);
  if (existing) {
    existing.visa_lists = s.lists;
    existing.visa_subclasses = s.visa_subclasses;
    if (s.authority) existing.authority = s.authority;
    // Clear the stale "not mapped" warning now that the row is correctly mapped.
    if (existing.critical_warning === GENERIC_NOT_MAPPED && s.lists.length > 0) {
      existing.critical_warning = "";
    }
    updated += 1;
  } else {
    occFile.occupations.push({
      anzsco_code: s.anzsco_code,
      occupation_name: s.occupation_name,
      authority: s.authority || "Unknown",
      visa_lists: s.lists,
      visa_subclasses: s.visa_subclasses,
    });
    added += 1;
  }
}

// Stable ordering by name for reviewable diffs.
occFile.occupations.sort((a, b) => a.occupation_name.localeCompare(b.occupation_name));

writeFileSync(OCC_PATH, JSON.stringify(occFile, null, 2));

const onList = occFile.occupations.filter((o) =>
  (o.visa_lists ?? []).some((l) => ["MLTSSL", "STSOL", "ROL", "CSOL"].includes(l))
).length;

console.log(`occupations.json now has ${occFile.occupations.length} rows.`);
console.log(`Updated ${updated} existing, added ${added} new from the official list.`);
console.log(`On at least one skilled list (MLTSSL/STSOL/ROL/CSOL): ${onList}`);
const em = byCode.get("133211");
console.log("133211 now:", JSON.stringify({ authority: em?.authority, visa_lists: em?.visa_lists, visa_subclasses: em?.visa_subclasses }));
