/**
 * Structured-data ingestion pipeline (pipeline 2 of 2) for data/knowledge/
 * State Immigrations: parses every .xlsx/.csv under that folder and syncs
 * exact occupation-list membership into StateOccupationListEntry (Prisma),
 * not the vector store -- see scripts/ingest-state-pdfs.ts's header comment
 * for why this split exists (exact yes/no list membership should be a DB
 * lookup, not a vector-similarity guess).
 *
 * Column layouts vary per state (confirmed by inspecting the actual files):
 *   NSW xlsx:        "ANZSCO Code" | "Unit Group Name"
 *   Queensland xlsx:  "ANZSCO Code" | "Occupation" | "Skilled Work Regional
 *                     visa (subclass 491)" | "Skilled Nominated visa
 *                     (subclass 190)" | ...
 *   WA csv:           "Occupation" | "Industry Sector" | "ANZSCO" | "Stream"
 *                     | "Minimum Points" | "Priority Occupation" | "Regional
 *                     WA only" | "Status" | "v190" | "v491"
 * so this parses headers generically instead of hardcoding one shape:
 *   - ANZSCO code column: header matching /anzsco/i
 *   - Occupation title column: header matching /occupation|unit group/i
 *   - Visa subclass columns: header containing "190" or "491" -- a
 *     "Yes"/truthy cell means that row is on that subclass's list
 *   - Every other column is kept verbatim in `metadata` (Status, Minimum
 *     Points, Stream, Priority Occupation, etc.) rather than mapped to
 *     dedicated columns, since which extra fields exist differs by state
 *
 * State code is taken from the file's top-level folder under "State
 * Immigrations" (e.g. .../NSW/... -> "NSW"), mapped to the same
 * StateNominationCode short codes used elsewhere in the app (lib/readiness/
 * types.ts) -- "Queensland" -> "QLD", "Western Australia" -> "WA", etc.
 *
 * Idempotent per source file: deletes existing StateOccupationListEntry
 * rows for a sourceFile before re-inserting, so re-running this script is
 * safe.
 *
 * No quota/allocation data was found in any of the sampled files (no
 * "allocation"/"quota"-shaped columns) -- state occupation lists are
 * membership data, not intake numbers. StateAllocation (existing model)
 * remains the destination for quota data if/when a source file with actual
 * allocation figures is added; this script doesn't touch it.
 *
 * Usage: npx tsx scripts/sync-state-occupation-lists.ts
 */
import path from "node:path";
import { readdir } from "node:fs/promises";
import * as XLSX from "xlsx";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

const STATE_IMMIGRATIONS_DIR = path.join(process.cwd(), "data", "knowledge", "State Immigrations");

const STATE_FOLDER_TO_CODE: Record<string, string> = {
  NSW: "NSW",
  Queensland: "QLD",
  SA: "SA",
  Victoria: "VIC",
  "Western Australia": "WA",
  ACT: "ACT",
  NT: "NT",
};

/**
 * States whose occupation list has no explicit "190"/"491" flag columns and
 * is nonetheless implicitly scoped to a single subclass -- applied when
 * parseSheet finds zero subclass columns for that row. Currently only NT:
 * the Northern Territory Offshore Migration Occupations List (NTOMOL) is
 * specifically the list for the NT Priority Occupation stream, which is
 * offshore-491-only per the source PDF (data/knowledge/State Immigrations/
 * NT/NT Government visa nomination.pdf: "Offshore applicants will generally
 * only be considered for a subclass 491 nomination").
 */
const IMPLICIT_SUBCLASS_BY_STATE: Record<string, string[]> = {
  NT: ["491"],
  // ACT's occupation list applies to both subclasses by default; a row-level
  // "(491 Only)" suffix (handled by extractSuffixSubclass) narrows it to 491.
  ACT: ["190", "491"],
};

interface SourceFile {
  absolutePath: string;
  filename: string;
  stateFolder: string;
}

async function findSpreadsheetFiles(dir: string, stateFolder?: string): Promise<SourceFile[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: SourceFile[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // The immediate child of STATE_IMMIGRATIONS_DIR names the state;
      // deeper nesting keeps that same state association.
      files.push(...(await findSpreadsheetFiles(absolutePath, stateFolder ?? entry.name)));
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if ((ext === ".xlsx" || ext === ".csv") && stateFolder) {
      files.push({ absolutePath, filename: entry.name, stateFolder });
    }
  }

  return files;
}

function findColumnIndex(headers: string[], pattern: RegExp): number {
  return headers.findIndex((h) => pattern.test(h));
}

/**
 * Finds the per-occupation title column, trying the most specific pattern
 * first. Plain /occupation|unit group/i would match ACT's "ANZSCO Unit
 * Group" (the category name, e.g. "Construction Managers") before reaching
 * "NOMINATED OCCUPATION" (the actual per-row occupation, e.g. "construction
 * project manager"), since Array.find takes the first match -- so an exact
 * "nominated occupation" / "occupation" header is preferred over any header
 * that merely contains "unit group".
 */
function findTitleColumnIndex(headers: string[]): number {
  const exact = headers.findIndex((h) => /^(nominated )?occupation$/i.test(h.trim()));
  if (exact !== -1) return exact;
  const containsOccupation = headers.findIndex((h) => /occupation/i.test(h));
  if (containsOccupation !== -1) return containsOccupation;
  return findColumnIndex(headers, /unit group/i);
}

/**
 * Strips a "(491 Only)" / "(190 Only)" suffix from an occupation title (used
 * by ACT's occupation list to mark rows that only apply to one subclass) and
 * returns the subclasses it implies, or null if no such suffix is present.
 */
function extractSuffixSubclass(title: string): { cleanTitle: string; subclasses: string[] } | null {
  const match = title.match(/\s*\((491|190)\s*only\)\s*$/i);
  if (!match) return null;
  return {
    cleanTitle: title.slice(0, match.index).trim(),
    subclasses: [match[1]],
  };
}

function isTruthyCell(value: unknown): boolean {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "yes" || normalized === "y" || normalized === "true" || normalized === "1";
}

interface ParsedEntry {
  anzscoCode: string | null;
  occupationTitle: string;
  visaSubclasses: string[];
  metadata: Record<string, unknown>;
}

function parseSheet(headers: string[], rows: unknown[][], stateCode?: string): ParsedEntry[] {
  const anzscoIdx = findColumnIndex(headers, /anzsco/i);
  const titleIdx = findTitleColumnIndex(headers);
  if (titleIdx === -1) return [];

  // Any header containing "190" or "491" is treated as a per-subclass
  // membership flag column (covers "Skilled Nominated visa (subclass 190)",
  // "v190", etc.) -- excluded from the generic metadata catch-all below so
  // it isn't duplicated there.
  const subclassColumns = headers
    .map((h, idx) => ({ idx, subclass: h.includes("190") ? "190" : h.includes("491") ? "491" : null }))
    .filter((c): c is { idx: number; subclass: string } => c.subclass !== null);
  const subclassIndexes = new Set(subclassColumns.map((c) => c.idx));
  const implicitSubclasses = stateCode ? IMPLICIT_SUBCLASS_BY_STATE[stateCode] : undefined;

  return rows
    .map((row): ParsedEntry | null => {
      const rawTitle = String(row[titleIdx] ?? "").trim();
      if (!rawTitle) return null;

      // ACT-style "(491 Only)" / "(190 Only)" suffix on the title itself
      // takes priority over flag columns and the implicit-subclass default,
      // since it's a per-row override, not a per-file default.
      const suffixMatch = extractSuffixSubclass(rawTitle);
      const occupationTitle = suffixMatch?.cleanTitle ?? rawTitle;

      const flagSubclasses = subclassColumns
        .filter((c) => isTruthyCell(row[c.idx]))
        .map((c) => c.subclass);

      const visaSubclasses =
        suffixMatch?.subclasses ??
        (flagSubclasses.length > 0 ? flagSubclasses : (implicitSubclasses ?? []));

      const metadata: Record<string, unknown> = {};
      headers.forEach((header, idx) => {
        if (idx === anzscoIdx || idx === titleIdx || subclassIndexes.has(idx)) return;
        const value = row[idx];
        if (value !== undefined && value !== null && value !== "") metadata[header] = value;
      });

      return {
        anzscoCode: anzscoIdx !== -1 ? String(row[anzscoIdx] ?? "").trim() || null : null,
        occupationTitle,
        visaSubclasses,
        metadata,
      };
    })
    .filter((entry): entry is ParsedEntry => entry !== null);
}

async function syncFile(file: SourceFile): Promise<{ entries: number }> {
  const stateCode = STATE_FOLDER_TO_CODE[file.stateFolder];
  if (!stateCode) {
    console.warn(`Skipping ${file.filename}: unrecognized state folder "${file.stateFolder}".`);
    return { entries: 0 };
  }

  const workbook = XLSX.readFile(file.absolutePath);
  const allEntries: ParsedEntry[] = [];

  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: "" });
    if (rows.length < 2) continue;
    const headers = (rows[0] as unknown[]).map((h) => String(h ?? "").trim());
    allEntries.push(...parseSheet(headers, rows.slice(1), stateCode));
  }

  if (allEntries.length === 0) return { entries: 0 };

  await prisma.stateOccupationListEntry.deleteMany({ where: { sourceFile: file.filename } });
  await prisma.stateOccupationListEntry.createMany({
    data: allEntries.map((entry) => ({
      stateCode,
      anzscoCode: entry.anzscoCode,
      occupationTitle: entry.occupationTitle,
      visaSubclasses: entry.visaSubclasses,
      metadata: entry.metadata as Prisma.InputJsonValue,
      sourceFile: file.filename,
    })),
  });

  return { entries: allEntries.length };
}

async function main() {
  const files = await findSpreadsheetFiles(STATE_IMMIGRATIONS_DIR);
  console.log(`Found ${files.length} xlsx/csv file(s) under "State Immigrations".\n`);

  let totalEntries = 0;
  let failedFiles = 0;

  for (const [i, file] of files.entries()) {
    const label = `[${i + 1}/${files.length}] ${file.stateFolder} / ${file.filename}`;
    try {
      const { entries } = await syncFile(file);
      totalEntries += entries;
      console.log(`${label} -> ${entries} entries`);
    } catch (err) {
      failedFiles += 1;
      console.error(`${label} -> FAILED:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\nDone. ${totalEntries} entries synced across ${files.length - failedFiles}/${files.length} files.`);
  if (failedFiles > 0) {
    console.log(`${failedFiles} file(s) failed -- see errors above.`);
  }
}

main()
  .catch((err) => {
    console.error("Sync script crashed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
