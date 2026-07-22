/**
 * Makes the official Skilled Occupation List (src/data/skilled-occupation-list.OLD.json)
 * drive the occupation SEARCH INDEX (src/data/anzsco-list.json) across ALL groups.
 *
 * Non-destructive + translation-preserving:
 *  - Same code already present            → leave as-is.
 *  - Same occupation NAME, different code  → migrate the existing entry's code to
 *    the official (ANZSCO 2022) code, keeping its title_tr/title_zh/duties.
 *  - Not present at all                    → add a new English-title entry.
 *  - Existing entries NOT in the official list are kept (not pruned).
 *
 * Run after parse + merge:
 *   npx tsx scripts/sync-search-index-with-skilled-list.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type SearchEntry = {
  code: string;
  title: string;
  title_tr?: string;
  title_zh?: string;
  skillLevel?: string;
  duties?: string[];
};
type Skilled = { anzsco_code: string; occupation_name: string };

const SEARCH_PATH = path.join(process.cwd(), "src/data/anzsco-list.json");
const SKILLED_PATH = path.join(process.cwd(), "src/data/skilled-occupation-list.OLD.json");

const search = JSON.parse(readFileSync(SEARCH_PATH, "utf8")) as SearchEntry[];
const skilled = (JSON.parse(readFileSync(SKILLED_PATH, "utf8")) as { occupations: Skilled[] }).occupations;

const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const byCode = new Map(search.map((e) => [e.code, e]));
const byName = new Map(search.map((e) => [norm(e.title), e]));

let present = 0;
let migrated = 0;
let added = 0;

for (const occ of skilled) {
  const code = occ.anzsco_code;
  if (byCode.has(code)) {
    present += 1;
    continue;
  }
  const nameMatch = byName.get(norm(occ.occupation_name));
  if (nameMatch && !byCode.has(code)) {
    // Migrate this renamed occupation to its official 2022 code, keeping
    // translations + duties. Guard against creating a duplicate code.
    byCode.delete(nameMatch.code);
    nameMatch.code = code;
    byCode.set(code, nameMatch);
    migrated += 1;
    continue;
  }
  // Genuinely new occupation from the official list.
  const entry: SearchEntry = { code, title: occ.occupation_name, skillLevel: "", duties: [] };
  search.push(entry);
  byCode.set(code, entry);
  byName.set(norm(occ.occupation_name), entry);
  added += 1;
}

// Stable sort by title for reviewable diffs.
search.sort((a, b) => a.title.localeCompare(b.title));

writeFileSync(SEARCH_PATH, JSON.stringify(search, null, 2));

console.log(`Search index now: ${search.length} occupations.`);
console.log(`  already present (code match): ${present}`);
console.log(`  code migrated (renamed, translations kept): ${migrated}`);
console.log(`  newly added from official list: ${added}`);
const missingTranslations = search.filter((e) => !e.title_tr).length;
console.log(`  entries still missing tr translation: ${missingTranslations}`);
