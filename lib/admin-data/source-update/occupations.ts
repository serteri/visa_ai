import actData from "@/src/data/state-occupation-lists/act.json";
import ntData from "@/src/data/state-occupation-lists/nt.json";
import qldData from "@/src/data/state-occupation-lists/qld.json";
import waData from "@/src/data/state-occupation-lists/wa.json";

import type { OccupationRow } from "../types";
import type { SheetRows } from "./extract";

/**
 * A state occupation list in an uploaded XLSX / CSV: the ANZSCO codes found per subclass and the difference against the list the reports use now.
 * Only what the file states is read: if it does not say which subclass a row is for, the admin must choose; nothing is assumed.
 */

/** The states whose occupation list the occupation match reads (6-digit ANZSCO codes). NSW publishes unit groups only; TAS and VIC use the national list. */
export const OCCUPATION_LIST_STATES = ["ACT", "NT", "QLD", "WA", "SA"] as const;

const BUNDLED: Record<string, OccupationRow[]> = {
  ACT: (actData as { occupations: OccupationRow[] }).occupations,
  NT: (ntData as { occupations: OccupationRow[] }).occupations,
  QLD: (qldData as { occupations: OccupationRow[] }).occupations,
  WA: (waData as { occupations: OccupationRow[] }).occupations,
  SA: [],
};

export const bundledOccupationList = (stateCode: string): OccupationRow[] | null => (stateCode in BUNDLED ? BUNDLED[stateCode].map((r) => ({ anzscoCode: r.anzscoCode, occupationTitle: r.occupationTitle, subclass190: r.subclass190, subclass491: r.subclass491, ...(r.notes ? { notes: r.notes } : {}) })) : null);

export type ParsedOccupationList = {
  rows: OccupationRow[];
  /** How the file says which subclass a row is for. "none": it does not, and the admin must choose. */
  subclassSource: "columns" | "column" | "sheets" | "titles" | "chosen" | "none";
  sheets: string[];
  warnings: string[];
};

const TRUE = /^(y|yes|true|1|x|✓|✔|✅|available|eligible|open)$/i;
const isCode = (s: string) => /^\d{6}$/.test(s.trim());

function findCodeColumn(rows: string[][]): { col: number; headerRow: number } | null {
  const width = Math.max(0, ...rows.slice(0, 200).map((r) => r.length));
  let best: { col: number; n: number } | null = null;
  for (let c = 0; c < width; c++) {
    const n = rows.filter((r) => isCode(r[c] ?? "")).length;
    if (n >= 5 && n >= rows.length * 0.5 && (!best || n > best.n)) best = { col: c, n };
  }
  if (!best) return null;
  const first = rows.findIndex((r) => isCode(r[best!.col] ?? ""));
  return { col: best.col, headerRow: first > 0 ? first - 1 : -1 };
}

export function parseOccupationSheets(sheets: SheetRows[], choose?: Array<"190" | "491">): ParsedOccupationList | null {
  const merged = new Map<string, OccupationRow>();
  const used: string[] = [];
  let source: ParsedOccupationList["subclassSource"] | null = null;
  const warnings: string[] = [];
  let undecided = false;

  for (const sheet of sheets) {
    const found = findCodeColumn(sheet.rows);
    if (!found) continue;
    used.push(sheet.name);
    const header = found.headerRow >= 0 ? sheet.rows[found.headerRow] : [];
    const colWhere = (re: RegExp) => header.findIndex((h) => re.test(h));
    const c190 = colWhere(/190/);
    const c491 = colWhere(/491/);
    const cSub = colWhere(/subclass|visa/i);
    const cNotes = colWhere(/note|pathway|comment|condition/i);
    let cTitle = colWhere(/occupation|title|name/i);
    if (cTitle < 0 || cTitle === found.col) {
      const width = Math.max(...sheet.rows.map((r) => r.length));
      let bestLen = 0;
      for (let c = 0; c < width; c++) {
        if (c === found.col) continue;
        const sample = sheet.rows.filter((r) => isCode(r[found.col] ?? "")).slice(0, 30);
        const avg = sample.reduce((n, r) => n + (/[A-Za-z]/.test(r[c] ?? "") ? (r[c] ?? "").length : 0), 0) / Math.max(1, sample.length);
        if (avg > bestLen) {
          bestLen = avg;
          cTitle = c;
        }
      }
    }
    const sheetSubs: Array<"190" | "491"> = [...(/190/.test(sheet.name) ? (["190"] as const) : []), ...(/491/.test(sheet.name) ? (["491"] as const) : [])];

    for (const row of sheet.rows) {
      const code = (row[found.col] ?? "").trim();
      if (!isCode(code)) continue;
      let title = (row[cTitle] ?? "").trim();
      let s190: boolean | null = null;
      let s491: boolean | null = null;
      if (c190 >= 0 || c491 >= 0) {
        s190 = c190 >= 0 ? TRUE.test((row[c190] ?? "").trim()) : false;
        s491 = c491 >= 0 ? TRUE.test((row[c491] ?? "").trim()) : false;
        source = source ?? "columns";
      } else if (cSub >= 0 && /190|491/.test(row[cSub] ?? "")) {
        s190 = /190/.test(row[cSub]);
        s491 = /491/.test(row[cSub]);
        source = source ?? "column";
      } else if (sheetSubs.length > 0) {
        s190 = sheetSubs.includes("190");
        s491 = sheetSubs.includes("491");
        source = source ?? "sheets";
      } else if (/\((?:190|491) only\)/i.test(title)) {
        const only = /\(190 only\)/i.test(title) ? "190" : "491";
        s190 = only === "190";
        s491 = only === "491";
        title = title.replace(/\s*\((?:190|491) only\)/i, "").trim();
        source = source ?? "titles";
      } else if (choose && choose.length > 0) {
        s190 = choose.includes("190");
        s491 = choose.includes("491");
        source = source ?? "chosen";
      } else undecided = true;
      const prev = merged.get(code);
      const notes = cNotes >= 0 ? (row[cNotes] ?? "").trim() : "";
      merged.set(code, {
        anzscoCode: code,
        occupationTitle: title || prev?.occupationTitle || "",
        subclass190: Boolean(prev?.subclass190 || s190),
        subclass491: Boolean(prev?.subclass491 || s491),
        ...((notes || prev?.notes) ? { notes: notes || prev?.notes } : {}),
      });
    }
  }
  if (merged.size === 0) return null;
  if (undecided && source === null) source = "none";
  else if (undecided) warnings.push("Some rows do not say which subclass they are for; they are listed under neither subclass.");
  if (source === "none") warnings.push("The file does not say which subclass the occupations are for. Choose 190, 491 or both and upload it again; nothing is assumed.");
  if ([...merged.values()].some((r) => !r.occupationTitle)) warnings.push("Some rows have no occupation title.");
  return { rows: [...merged.values()].sort((a, b) => a.anzscoCode.localeCompare(b.anzscoCode)), subclassSource: source ?? "none", sheets: used, warnings };
}

export type OccupationDiff = {
  added: OccupationRow[];
  removed: OccupationRow[];
  changed: Array<{ anzscoCode: string; occupationTitle: string; before: { subclass190: boolean; subclass491: boolean; title: string }; after: { subclass190: boolean; subclass491: boolean; title: string } }>;
  counts: { current190: number; current491: number; next190: number; next491: number };
  /** The codes found in the file, per subclass. */
  found: { "190": string[]; "491": string[] };
};

export function diffOccupationLists(current: OccupationRow[], next: OccupationRow[]): OccupationDiff {
  const cur = new Map(current.map((r) => [r.anzscoCode, r]));
  const nxt = new Map(next.map((r) => [r.anzscoCode, r]));
  const added = next.filter((r) => !cur.has(r.anzscoCode));
  const removed = current.filter((r) => !nxt.has(r.anzscoCode));
  const changed: OccupationDiff["changed"] = [];
  for (const r of next) {
    const c = cur.get(r.anzscoCode);
    if (c && (c.subclass190 !== r.subclass190 || c.subclass491 !== r.subclass491 || (c.occupationTitle !== r.occupationTitle && r.occupationTitle))) {
      changed.push({ anzscoCode: r.anzscoCode, occupationTitle: r.occupationTitle || c.occupationTitle, before: { subclass190: c.subclass190, subclass491: c.subclass491, title: c.occupationTitle }, after: { subclass190: r.subclass190, subclass491: r.subclass491, title: r.occupationTitle || c.occupationTitle } });
    }
  }
  return {
    added,
    removed,
    changed,
    counts: { current190: current.filter((r) => r.subclass190).length, current491: current.filter((r) => r.subclass491).length, next190: next.filter((r) => r.subclass190).length, next491: next.filter((r) => r.subclass491).length },
    found: { "190": next.filter((r) => r.subclass190).map((r) => r.anzscoCode), "491": next.filter((r) => r.subclass491).map((r) => r.anzscoCode) },
  };
}

/** The list after the approved changes only: `ids` are "add:<code>", "remove:<code>", "change:<code>". */
export function applyOccupationChanges(current: OccupationRow[], next: OccupationRow[], diff: OccupationDiff, ids: ReadonlySet<string>): OccupationRow[] {
  const nxt = new Map(next.map((r) => [r.anzscoCode, r]));
  const out = new Map(current.map((r) => [r.anzscoCode, r]));
  for (const r of diff.added) if (ids.has(`add:${r.anzscoCode}`)) out.set(r.anzscoCode, r);
  for (const r of diff.removed) if (ids.has(`remove:${r.anzscoCode}`)) out.delete(r.anzscoCode);
  for (const c of diff.changed) if (ids.has(`change:${c.anzscoCode}`)) out.set(c.anzscoCode, { ...(out.get(c.anzscoCode) as OccupationRow), ...(nxt.get(c.anzscoCode) as OccupationRow), occupationTitle: c.after.title });
  return [...out.values()].sort((a, b) => a.anzscoCode.localeCompare(b.anzscoCode));
}
