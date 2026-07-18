/**
 * skillLevel validation/derivation for the newly-added occupations.
 *
 * In ANZSCO, skill level is assigned at the UNIT GROUP (first 4 digits) level —
 * every occupation in a unit group shares its skill level. So instead of
 * guessing, we derive each new occupation's skillLevel from the pre-existing
 * (already-verified) entries that share its unit group.
 *
 *  - Reference = the original 706 entries (title_tr present, duties_tr absent).
 *  - Only unit groups with ONE consistent skill level are trusted.
 *  - New occupations (the 303) get the derived level; where the unit group has
 *    no trusted reference, skillLevel is left EMPTY rather than fabricated —
 *    flagged for the future ABS ANZSCO 2022 backfill phase.
 *  - This also overwrites the AI-guessed skillLevels from batch 1.
 *
 * Run: npx tsx scripts/i18n/derive-skill-levels.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type Entry = {
  code: string;
  title: string;
  title_tr?: string;
  skillLevel?: string;
  duties_tr?: string[];
};

const LIST_PATH = path.join(process.cwd(), "src/data/anzsco-list.json");
const list = JSON.parse(readFileSync(LIST_PATH, "utf8")) as Entry[];

// A "new" occupation = one added from the official list. It either still lacks a
// tr title, or (if already translated in a batch) carries duties_tr — neither is
// true of the original 706.
const isNew = (e: Entry) => Boolean(e.duties_tr) || !e.title_tr;

// Trusted reference: original entries only.
const refByUnit = new Map<string, Set<string>>();
for (const e of list) {
  if (isNew(e)) continue;
  if (!e.skillLevel?.trim()) continue;
  const unit = e.code.slice(0, 4);
  if (!refByUnit.has(unit)) refByUnit.set(unit, new Set());
  refByUnit.get(unit)!.add(e.skillLevel);
}
const trustedUnit = new Map<string, string>();
for (const [unit, levels] of refByUnit) {
  if (levels.size === 1) trustedUnit.set(unit, [...levels][0]);
}

let derived = 0;
let cleared = 0;
let alreadyBlank = 0;
for (const e of list) {
  if (!isNew(e)) continue;
  const unit = e.code.slice(0, 4);
  const level = trustedUnit.get(unit);
  if (level) {
    e.skillLevel = level;
    derived += 1;
  } else {
    if (e.skillLevel) cleared += 1;
    else alreadyBlank += 1;
    e.skillLevel = ""; // do not fabricate
  }
}

writeFileSync(LIST_PATH, JSON.stringify(list, null, 2));

console.log(`Trusted unit groups: ${trustedUnit.size}`);
console.log(`New occupations: derived ${derived}, left blank (no trusted ref) ${cleared + alreadyBlank}`);
console.log(`  (of which had a guessed level now cleared: ${cleared})`);
