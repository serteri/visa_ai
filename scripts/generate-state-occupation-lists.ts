/**
 * Regenerates src/data/state-occupation-lists/*.json from the raw state occupation-list documents in
 * data/knowledge/State Immigrations/<state>/ (see the Phase 1 inventory task). Run manually whenever a
 * state's source document is replaced -- data/knowledge is gitignored, so this script (and the JSON files
 * it writes) is the only way the occupation-match feature sees this data at all; CI never has
 * data/knowledge and never runs this script.
 *
 * Only the 4 states with real per-occupation, ANZSCO-coded data get a match-ready file here: ACT, NT, QLD,
 * WA. NSW only has 4-digit unit-group codes (not full occupations) -- its file is unit-group-only and
 * deliberately NOT wired into matchOccupationToState (see lib/state-nomination/occupation-match.ts). SA has
 * no occupation-list document at all in data/knowledge (Phase 1 finding) -- no file is generated for it.
 *
 * Usage: npx tsx scripts/generate-state-occupation-lists.ts
 */
import { writeFileSync } from "node:fs";
import * as XLSX from "xlsx";

const TODAY = new Date().toISOString().slice(0, 10);
const OUT_DIR = "src/data/state-occupation-lists";

function readRows(path: string): unknown[][] {
  const wb = XLSX.readFile(path);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
  // Trim trailing padding rows some exports reserve (e.g. QLD's sheets are ref'd A1:E1000 but real data
  // ends well before row 1000) -- keep only rows that have at least one non-empty cell.
  let lastNonEmpty = -1;
  rows.forEach((r, i) => {
    if (r && r.some((c) => c !== undefined && c !== null && c !== "")) lastNonEmpty = i;
  });
  return rows.slice(0, lastNonEmpty + 1);
}

function anzscoCode(raw: unknown): string {
  return String(raw).trim().padStart(6, "0");
}

function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

type OccRow = {
  anzscoCode: string;
  occupationTitle: string;
  subclass190: boolean;
  subclass491: boolean;
  notes?: string;
  act491DefaultInferred?: true;
};

// ── ACT ──────────────────────────────────────────────────────────────────────────────────────────────
// Columns: ANZSCO Unit Group, Unit Group Code, ANZSCO Code, NOMINATED OCCUPATION. 20 rows carry a literal
// "(491 Only)" suffix in the occupation title -- those are subclass491-only. The other 259 rows are
// unmarked; per the Phase 2a review of ACT Migration.pdf, the document never directly states whether an
// unmarked occupation applies to both subclasses or 190 only -- it only describes the SAME list being
// "ranked by visa subclass" across all four ACT pathway variants (Resident/Overseas x 190/491), with 491
// selected first. act491DefaultInferred:true marks that the subclass190/491 = true/true given to these 259
// rows is that inference, not a directly stated fact. (The task named this field "act490DefaultInferred" --
// corrected to "act491DefaultInferred" here since subclass 490 does not exist; the intent is unambiguous
// from the Phase 2a brief it referenced.)
function buildAct(): OccRow[] {
  const rows = readRows("data/knowledge/State Immigrations/ACT/ACT Nominated Migration Program Occupation List.xlsx");
  const out: OccRow[] = [];
  for (const r of rows.slice(1)) {
    const code = r[2];
    const rawTitle = String(r[3] ?? "").trim();
    if (!code || !rawTitle) continue;
    const only491 = /\(491 only\)/i.test(rawTitle);
    const title = titleCase(rawTitle.replace(/\s*\(491 only\)\s*/i, "").trim());
    out.push(
      only491
        ? { anzscoCode: anzscoCode(code), occupationTitle: title, subclass190: false, subclass491: true }
        : { anzscoCode: anzscoCode(code), occupationTitle: title, subclass190: true, subclass491: true, act491DefaultInferred: true }
    );
  }
  return out;
}

// ── NT ───────────────────────────────────────────────────────────────────────────────────────────────
// Columns: ANZSCO, Occupation, Comments. Titled "NT Offshore Migration Occupation List" -- per the state-
// nomination audit, offshore applicants are only considered for subclass 491, and no separate NT onshore/
// 190 occupation list document exists in data/knowledge. Every row is therefore subclass491 true, subclass190
// false; the Comments column (a licensing/evidence note on some rows) is carried into `notes`.
function buildNt(): OccRow[] {
  const rows = readRows("data/knowledge/State Immigrations/NT/NT Offshore Migration Occupation List.xlsx");
  const out: OccRow[] = [];
  for (const r of rows.slice(1)) {
    const code = r[0];
    const title = String(r[1] ?? "").trim();
    if (!code || !title) continue;
    const comment = String(r[2] ?? "").trim();
    out.push({
      anzscoCode: anzscoCode(code),
      occupationTitle: title,
      subclass190: false,
      subclass491: true,
      ...(comment ? { notes: comment } : {}),
    });
  }
  return out;
}

// ── QLD ──────────────────────────────────────────────────────────────────────────────────────────────
// Two source files (offshore / onshore skilled occupation lists), same core columns: ANZSCO Code,
// Occupation, "Skilled Work Regional visa (subclass 491)" Yes/blank, "Skilled Nominated visa (subclass 190)"
// Yes/blank, plus a 5th column whose meaning differs per file (offshore: "Additional information"; onshore:
// "Building and Construction pathway"). Merged here by ANZSCO code: subclass190/491 is the union of the two
// files' Yes flags (an occupation only on one list is still real -- Queensland just doesn't offer it via
// the other stream), and `notes` records which list(s) it came from plus any 5th-column text.
function buildQld(): OccRow[] {
  const offshore = readRows("data/knowledge/State Immigrations/Queensland/Queensland offshore skilled occupation list.xlsx");
  const onshore = readRows("data/knowledge/State Immigrations/Queensland/Queensland onshore skilled occupation list.xlsx");
  const merged = new Map<string, OccRow & { sources: Set<string> }>();

  function ingest(rows: unknown[][], sourceLabel: string, extraColLabel: string) {
    for (const r of rows.slice(1)) {
      const code = r[0];
      const title = String(r[1] ?? "").trim();
      if (!code || !title) continue;
      const key = anzscoCode(code);
      const s491 = String(r[2] ?? "").trim().toLowerCase() === "yes";
      const s190 = String(r[3] ?? "").trim().toLowerCase() === "yes";
      const extra = String(r[4] ?? "").trim();
      const existing = merged.get(key);
      if (existing) {
        existing.subclass190 = existing.subclass190 || s190;
        existing.subclass491 = existing.subclass491 || s491;
        existing.sources.add(sourceLabel);
        if (extra) existing.notes = existing.notes ? `${existing.notes}; ${extraColLabel}: ${extra}` : `${extraColLabel}: ${extra}`;
      } else {
        merged.set(key, {
          anzscoCode: key,
          occupationTitle: title,
          subclass190: s190,
          subclass491: s491,
          sources: new Set([sourceLabel]),
          ...(extra ? { notes: `${extraColLabel}: ${extra}` } : {}),
        });
      }
    }
  }
  ingest(offshore, "offshore", "Additional information");
  ingest(onshore, "onshore", "Building and Construction pathway");

  return [...merged.values()].map(({ sources, notes, ...rest }) => {
    const sourceNote = `On Queensland's ${[...sources].sort().join(" and ")} skilled occupation list${sources.size > 1 ? "s" : ""}.`;
    return { ...rest, notes: notes ? `${sourceNote} ${notes}` : sourceNote };
  });
}

// ── WA ───────────────────────────────────────────────────────────────────────────────────────────────
// occupation-search.csv, columns: Occupation, Industry Sector, ANZSCO, Stream, Minimum Points, Priority
// Occupation, Regional WA only, Status, v190, v491. Every one of the 329 rows has Priority Occupation=Yes
// and Status=Available -- this file is a PRIORITY-OCCUPATIONS SEARCH EXPORT, not confirmed to be WA's
// complete WASMOL Schedule 1/2 + GOL occupation lists (those may include non-priority occupations this
// export doesn't cover). Grouped here by ANZSCO code (an occupation can appear once per stream it's
// eligible under); subclass190/491 = union of v190/v491 across all its stream rows.
function buildWa(): OccRow[] {
  const rows = readRows("data/knowledge/State Immigrations/Western Australia/occupation-search.csv");
  const header = rows[0] as string[];
  const idx = (name: string) => header.indexOf(name);
  const cAnzsco = idx("ANZSCO"), cStream = idx("Stream"), cPoints = idx("Minimum Points");
  const cRegional = idx("Regional WA only"), cV190 = idx("v190"), cV491 = idx("v491");

  const merged = new Map<string, { title: string; streams: Set<string>; points: Set<number>; regional: boolean; s190: boolean; s491: boolean }>();
  for (const r of rows.slice(1)) {
    const code = r[cAnzsco];
    const title = String(r[0] ?? "").trim();
    if (!code || !title) continue;
    const key = anzscoCode(code);
    const stream = String(r[cStream] ?? "").trim();
    const points = Number(r[cPoints]);
    const regional = String(r[cRegional] ?? "").trim().toLowerCase() === "yes";
    const s190 = String(r[cV190] ?? "").trim().toLowerCase() === "yes";
    const s491 = String(r[cV491] ?? "").trim().toLowerCase() === "yes";
    const existing = merged.get(key);
    if (existing) {
      existing.streams.add(stream);
      if (Number.isFinite(points)) existing.points.add(points);
      existing.regional = existing.regional || regional;
      existing.s190 = existing.s190 || s190;
      existing.s491 = existing.s491 || s491;
    } else {
      merged.set(key, { title, streams: new Set([stream]), points: Number.isFinite(points) ? new Set([points]) : new Set(), regional, s190, s491 });
    }
  }

  return [...merged.entries()].map(([code, v]) => ({
    anzscoCode: code,
    occupationTitle: v.title,
    subclass190: v.s190,
    subclass491: v.s491,
    notes: `WA priority occupation (${[...v.streams].sort().join(", ")}); minimum points ${[...v.points].join("/") || "not stated"}${v.regional ? "; Regional WA only" : ""}. Source list only covers priority occupations, not WA's full WASMOL/GOL lists.`,
  }));
}

// ── NSW: unit-group codes only (not wired into matching) ───────────────────────────────────────────────
function buildNswUnitGroups(): Array<{ unitGroupCode: string; unitGroupName: string; subclass190: boolean; subclass491: boolean }> {
  const list190 = readRows("data/knowledge/State Immigrations/NSW/NSW Skills List Skilled Nominated visa (subclass 190).xlsx");
  const list491 = readRows("data/knowledge/State Immigrations/NSW/NSW Regional Skills List Skilled Work Regional visa (subclass 491).xlsx");
  const merged = new Map<string, { name: string; s190: boolean; s491: boolean }>();
  function ingest(rows: unknown[][], key190: boolean, key491: boolean) {
    for (const r of rows.slice(1)) {
      const code = r[0];
      const name = String(r[1] ?? "").trim();
      if (!code || !name) continue;
      const codeStr = String(code).trim().padStart(4, "0");
      const existing = merged.get(codeStr);
      if (existing) {
        existing.s190 = existing.s190 || key190;
        existing.s491 = existing.s491 || key491;
      } else {
        merged.set(codeStr, { name, s190: key190, s491: key491 });
      }
    }
  }
  ingest(list190, true, false);
  ingest(list491, false, true);
  return [...merged.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([unitGroupCode, v]) => ({ unitGroupCode, unitGroupName: v.name, subclass190: v.s190, subclass491: v.s491 }));
}

function writeWithProvenance(fileName: string, provenance: Record<string, unknown>, occupations: unknown[]) {
  const body = { _provenance: { extractedOn: TODAY, ...provenance }, occupations };
  writeFileSync(`${OUT_DIR}/${fileName}`, JSON.stringify(body, null, 2) + "\n");
  console.log(`wrote ${OUT_DIR}/${fileName}  (${occupations.length} rows)`);
}

const act = buildAct();
writeWithProvenance("act.json", {
  sourceFile: "data/knowledge/State Immigrations/ACT/ACT Nominated Migration Program Occupation List.xlsx",
  sourceFileRowCount: act.length,
  method:
    "20 occupations carry a literal '(491 Only)' suffix in the source title -> subclass491 true, subclass190 false. The remaining rows are unmarked in the source; subclass190/491 = true/true is an INFERENCE (act491DefaultInferred:true), not a directly stated fact -- see the Phase 2a review of ACT Migration.pdf, which describes the same list being ranked by visa subclass across all four ACT pathway variants but never states unmarked occupations apply to both subclasses.",
}, act);

const nt = buildNt();
writeWithProvenance("nt.json", {
  sourceFile: "data/knowledge/State Immigrations/NT/NT Offshore Migration Occupation List.xlsx",
  sourceFileRowCount: nt.length,
  method:
    "This is titled the NT OFFSHORE Migration Occupation List; no separate NT onshore/subclass-190 occupation list document exists in data/knowledge. Every row is recorded as subclass491 true, subclass190 false.",
}, nt);

const qld = buildQld();
writeWithProvenance("qld.json", {
  sourceFiles: [
    "data/knowledge/State Immigrations/Queensland/Queensland offshore skilled occupation list.xlsx",
    "data/knowledge/State Immigrations/Queensland/Queensland onshore skilled occupation list.xlsx",
  ],
  sourceFileRowCount: qld.length,
  method:
    "The offshore and onshore lists are merged by ANZSCO code; subclass190/491 is the union (true if either source file marks it Yes for that subclass). `notes` records which source list(s) the occupation came from and any Additional-information / Building-and-Construction-pathway text.",
}, qld);

const wa = buildWa();
writeWithProvenance("wa.json", {
  sourceFile: "data/knowledge/State Immigrations/Western Australia/occupation-search.csv",
  sourceFileRowCount: wa.length,
  method:
    "Grouped by ANZSCO code from occupation-search.csv (an occupation can have one row per WASMOL/Graduate stream it qualifies under); subclass190/491 is the union of v190/v491 across its rows. CAVEAT: every row in this source file has Priority Occupation=Yes -- this appears to be a PRIORITY-OCCUPATIONS SEARCH EXPORT, not confirmed to be WA's complete WASMOL Schedule 1/2 + Graduate occupation lists (which may include non-priority occupations this file doesn't cover). A NOT_ON_LIST result for WA means 'not in this priority-occupations export', not 'confirmed excluded from WA's full occupation lists'.",
}, wa);

const nswUnitGroups = buildNswUnitGroups();
writeWithProvenance("nsw-unit-groups.json", {
  sourceFiles: [
    "data/knowledge/State Immigrations/NSW/NSW Skills List Skilled Nominated visa (subclass 190).xlsx",
    "data/knowledge/State Immigrations/NSW/NSW Regional Skills List Skilled Work Regional visa (subclass 491).xlsx",
  ],
  sourceFileRowCount: nswUnitGroups.length,
  method:
    "NSW's own lists give only 4-digit ANZSCO UNIT GROUP codes (e.g. 1212 'Crop Farmer'), not full 6-digit occupation codes -- a single unit group covers several distinct occupations, so this cannot support exact-occupation matching the way ACT/NT/QLD/WA can. Kept for future use only; NOT wired into matchOccupationToState (see lib/state-nomination/occupation-match.ts), which returns UNIT_GROUP_ONLY for NSW without reading this file's contents.",
}, nswUnitGroups);

console.log("\ndone.");
