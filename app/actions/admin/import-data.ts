"use server";

import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";

import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getSourceFormat, type SourceFormat } from "@/lib/constants/source-formats";

/**
 * Manual Data Upload (Admin Data Sync panel). There is no scraper bot --
 * admins download the file themselves from a source's official page (still
 * linked on the panel via lib/constants/migration-sources.ts) and upload it
 * here.
 *
 * Writes to InvitationFeedItem (app/[locale]/(main)/rounds's feed table),
 * NOT the pre-existing InvitationRound/RoundCutoff/Occupation trio -- that
 * trio is live production data read by app/api/viability/route.ts and
 * lib/services/report-service.ts for real user-facing point calculations.
 * An upload landing there could silently corrupt those. See
 * InvitationFeedItem's doc comment in prisma/schema.prisma for the full
 * naming-collision context (a model literally named InvitationRound already
 * exists and is unrelated to this feature).
 *
 * Uses the `xlsx` package (already a dependency, used elsewhere in this app
 * for .xlsx parsing -- see scripts/sync-state-occupation-lists.ts) for both
 * .xlsx/.xls AND .csv: SheetJS's XLSX.read() parses CSV text natively, so
 * this avoids adding a second parsing library (papaparse) for a format the
 * existing one already handles.
 */
export type ImportDataResult =
  | { success: true; message: string; rowsImported: number }
  | { success: false; error: string };

function findColumnIndex(headers: string[], pattern: RegExp): number {
  return headers.findIndex((h) => pattern.test(h));
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number") {
    // Excel serial date (days since 1899-12-30).
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value.trim());
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function parsePoints(value: unknown): number | null {
  const num = typeof value === "number" ? value : parseInt(String(value ?? "").replace(/[^\d.-]/g, ""), 10);
  return Number.isFinite(num) ? Math.round(num) : null;
}

type ParsedRow = {
  occupation: string;
  subclass: string;
  state: string;
  location: string;
  points: number;
  dateOfEffect: Date;
  roundDate: Date;
};

type VolumeRow = {
  state: string;
  stream: string;
  subclass: string;
  month: string;
  count: number;
};

const ONSHORE_LOCATIONS = new Set(["onshore", "on-shore", "on shore", "wa", "western australia"]);

const WA_VALID_SUBCLASSES = new Set(["190", "491"]);

/** True for a blank/placeholder points cell ("-", "", "N/A", etc.) that marks an empty slot in a WA sub-table row, not a real score. */
function isBlankCell(value: unknown): boolean {
  const text = String(value ?? "").trim();
  return text === "" || text === "-" || /^n\/?a$/i.test(text);
}

/** Cell index 1-12 -> program-year month name, per the WA "Invitations issued" volume table's fixed July-June column order. */
const WA_VOLUME_MONTHS: Record<number, string> = {
  1: "July",
  2: "August",
  3: "September",
  4: "October",
  5: "November",
  6: "December",
  7: "January",
  8: "February",
  9: "March",
  10: "April",
  11: "May",
  12: "June",
};

/**
 * "WA - Invitation Rounds" format: the real WA government export is NOT a
 * flat table. It has two sections stacked in the same sheet:
 *
 *  Mode 1 (points, top of the sheet): a sequence of sub-tables, each
 *  preceded by a section heading row (e.g. "Trade occupations in priority
 *  WA industry sectors ('Stream 1')...") that applies to every data row
 *  until the next heading.
 *    - A row whose first cell mentions "occupations in priority" or
 *      "STREAM" is a section heading -- captured into currentOccupation
 *      and applied to every subsequent data row (not itself a data row).
 *    - A row is a data row once a subclass (190/491) is found in cell
 *      index 1 or 2, AND a numeric EOI points score is found in index 3
 *      or 4 -- both must be present, so heading rows and blank/"-"
 *      placeholder rows are naturally skipped rather than needing a
 *      separate filter.
 *    - "State of residence" and the submission date aren't at fixed
 *      indices either (they trail the points column, but shift depending
 *      on which of the two subclass/points slots was used), so both are
 *      found by scanning the remaining cells in the row.
 *
 *  Mode 2 (volume, further down the same sheet): a "2025-26 program
 *  year -- Invitations issued" table with a fixed July-June monthly
 *  column layout (index 1-12, see WA_VOLUME_MONTHS).
 *    - A row whose first cell mentions "program year" or "invitations
 *      issued" switches the reader into Mode 2 -- this never happens
 *      again in reverse (a WA export doesn't go back to a points table
 *      after the volume table starts).
 *    - Within Mode 2, a row starting with "General stream" or "Graduate
 *      stream" sets currentVolumeStream for subsequent rows.
 *    - Within Mode 2, a row whose first cell is exactly "190" or "491" is
 *      a volume data row: indices 1-12 are July-June counts. A cell with
 *      no value (blank/"-") means no invitations that month and is
 *      skipped, not recorded as a zero.
 */
function parseWaInvitationRounds(
  sheetRows: unknown[][],
  format: SourceFormat
): { points: ParsedRow[]; volumes: VolumeRow[] } {
  const points: ParsedRow[] = [];
  const volumes: VolumeRow[] = [];
  let currentOccupation = "General WA Occupations";
  let currentVolumeStream = "General stream";
  let mode: "points" | "volume" = "points";

  for (const row of sheetRows) {
    const firstCell = String(row[0] ?? "").trim();

    if (/program year|invitations issued/i.test(firstCell)) {
      mode = "volume";
      continue;
    }

    if (mode === "volume") {
      if (/^(general stream|graduate stream)/i.test(firstCell)) {
        currentVolumeStream = firstCell;
        continue;
      }
      if (WA_VALID_SUBCLASSES.has(firstCell)) {
        for (let monthIndex = 1; monthIndex <= 12; monthIndex++) {
          const cell = row[monthIndex];
          if (isBlankCell(cell)) continue;
          const count = parsePoints(cell);
          if (count === null) continue;
          volumes.push({
            state: format.state,
            stream: currentVolumeStream,
            subclass: firstCell,
            month: WA_VOLUME_MONTHS[monthIndex],
            count,
          });
        }
      }
      continue;
    }

    if (/occupations in priority|stream/i.test(firstCell)) {
      currentOccupation = firstCell;
      continue;
    }

    // Subclass: cell index 1 or 2, must be exactly 190 or 491.
    let subclass: string | null = null;
    for (const idx of [1, 2]) {
      const candidate = String(row[idx] ?? "").trim();
      if (WA_VALID_SUBCLASSES.has(candidate)) {
        subclass = candidate;
        break;
      }
    }
    if (!subclass) continue;

    // EOI points: cell index 3 or 4, must be a real number -- an empty
    // slot in the sub-table ("-", blank) means this row has no data for
    // this stream and is skipped, per this task's explicit instruction.
    let pointsScore: number | null = null;
    for (const idx of [3, 4]) {
      if (isBlankCell(row[idx])) continue;
      const parsed = parsePoints(row[idx]);
      if (parsed !== null) {
        pointsScore = parsed;
        break;
      }
    }
    if (pointsScore === null) continue;

    // State of residence and submission date: scan the remaining cells
    // (no fixed index -- see function doc comment above).
    let residenceText = "";
    let roundDate: Date | null = null;
    for (const cell of row.slice(5)) {
      const text = String(cell ?? "").trim();
      if (!residenceText && (ONSHORE_LOCATIONS.has(text.toLowerCase()) || text === "-")) {
        residenceText = text;
      }
      if (!roundDate) {
        const parsed = parseDate(cell);
        if (parsed) roundDate = parsed;
      }
    }
    const effectiveRoundDate = roundDate ?? new Date();

    points.push({
      occupation: currentOccupation,
      subclass,
      state: format.state,
      location: ONSHORE_LOCATIONS.has(residenceText.toLowerCase()) ? "Onshore" : "Offshore",
      points: pointsScore,
      dateOfEffect: effectiveRoundDate,
      roundDate: effectiveRoundDate,
    });
  }

  return { points, volumes };
}

/**
 * Generic fallback for "Federal 189" and "Generic State Data": government
 * exports and hand-compiled admin sheets don't share one column layout, so
 * headers are matched by keyword rather than fixed position (same approach
 * as sync-state-occupation-lists.ts's findColumnIndex, for the same reason).
 */
function parseGenericFormat(headers: string[], dataRows: unknown[][], format: SourceFormat): ParsedRow[] {
  const occupationIdx = findColumnIndex(headers, /occupation/i);
  const subclassIdx = findColumnIndex(headers, /subclass/i);
  const stateIdx = findColumnIndex(headers, /^state$/i);
  const locationIdx = findColumnIndex(headers, /location|onshore|offshore/i);
  const pointsIdx = findColumnIndex(headers, /points|score|cutoff/i);
  const effectIdx = findColumnIndex(headers, /effect/i);
  const roundDateIdx = findColumnIndex(headers, /round.*date|invitation.*date|submission date/i);

  if (occupationIdx === -1 || pointsIdx === -1) return [];

  const rows: ParsedRow[] = [];
  for (const row of dataRows) {
    const occupation = String(row[occupationIdx] ?? "").trim();
    const points = parsePoints(row[pointsIdx]);
    if (!occupation || points === null) continue;

    const roundDate =
      (roundDateIdx !== -1 ? parseDate(row[roundDateIdx]) : null) ??
      (effectIdx !== -1 ? parseDate(row[effectIdx]) : null) ??
      new Date();
    const dateOfEffect = (effectIdx !== -1 ? parseDate(row[effectIdx]) : null) ?? roundDate;
    const rawLocation = locationIdx !== -1 ? String(row[locationIdx] ?? "").trim().toLowerCase() : "";

    rows.push({
      occupation,
      subclass: subclassIdx !== -1 ? String(row[subclassIdx] ?? "").trim() || format.defaultSubclass : format.defaultSubclass,
      state: stateIdx !== -1 ? String(row[stateIdx] ?? "").trim() || format.state : format.state,
      location: ONSHORE_LOCATIONS.has(rawLocation) ? "Onshore" : "Offshore",
      points,
      dateOfEffect,
      roundDate,
    });
  }
  return rows;
}

function parseRows(workbook: XLSX.WorkBook, format: SourceFormat): { points: ParsedRow[]; volumes: VolumeRow[] } {
  const points: ParsedRow[] = [];
  const volumes: VolumeRow[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
      header: 1,
      defval: "",
      raw: true,
    });
    if (sheetRows.length < 2) continue;

    if (format.parser === "wa-nested") {
      // No fixed header row to key off of -- see parseWaInvitationRounds's
      // doc comment. It walks every raw row itself, section headings
      // included, rather than skipping a "first row" that doesn't exist
      // as a real header in this format.
      const parsed = parseWaInvitationRounds(sheetRows as unknown[][], format);
      points.push(...parsed.points);
      volumes.push(...parsed.volumes);
      continue;
    }

    // format.parser === "generic-flat" -- "not-implemented" formats are
    // rejected in importMigrationData before parseRows is ever called.
    const headers = (sheetRows[0] as unknown[]).map((h) => String(h ?? "").trim());
    const dataRows = sheetRows.slice(1);
    points.push(...parseGenericFormat(headers, dataRows, format));
  }

  return { points, volumes };
}

export async function importMigrationData(formData: FormData): Promise<ImportDataResult> {
  if (!(await isAdminAuthenticated())) {
    return { success: false, error: "Unauthorized" };
  }

  const formatId = formData.get("sourceFormat");
  const file = formData.get("file");

  if (typeof formatId !== "string" || !formatId) {
    return { success: false, error: "Select a source format before uploading." };
  }
  const format = getSourceFormat(formatId);
  if (!format) {
    return { success: false, error: "Unknown source format." };
  }
  if (format.parser === "not-implemented") {
    return {
      success: false,
      error: `This state's custom Excel structure is not implemented yet (${format.label}).`,
    };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Choose a .csv or .xlsx file to upload." };
  }
  if (!/\.(csv|xlsx?|xls)$/i.test(file.name)) {
    return { success: false, error: "Only .csv, .xls, and .xlsx files are accepted." };
  }

  let workbook: XLSX.WorkBook;
  try {
    const buffer = await file.arrayBuffer();
    workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  } catch (error) {
    return {
      success: false,
      error: `Could not read the file: ${error instanceof Error ? error.message : "unknown error"}`,
    };
  }

  const { points: rows, volumes } = parseRows(workbook, format);

  if (rows.length === 0 && volumes.length === 0) {
    return {
      success: false,
      error:
        format.parser === "wa-nested"
          ? "No usable rows found. Expected Occupation/EOI Points Score rows and/or an Invitations Issued volume table in the file."
          : "No usable rows found. Expected at least an Occupation column and a Points/Score/Cutoff column in the file.",
    };
  }

  const now = new Date();

  try {
    // "Eskileri temizle, yenileri ekle" -- replace this format's previous
    // import entirely rather than merging, so a re-upload always reflects
    // exactly what's in the latest file (no stale rows from an earlier
    // upload lingering alongside it). Both tables are scoped by
    // format.state independently, since a file can contain points rows,
    // volume rows, both, or neither.
    if (rows.length > 0) {
      await prisma.invitationFeedItem.deleteMany({ where: { state: format.state } });
      await prisma.invitationFeedItem.createMany({
        data: rows.map((row) => ({
          occupation: row.occupation,
          subclass: row.subclass,
          state: row.state,
          location: row.location,
          points: row.points,
          dateOfEffect: row.dateOfEffect,
          roundDate: row.roundDate,
        })),
      });
    }

    if (volumes.length > 0) {
      await prisma.invitationVolume.deleteMany({ where: { state: format.state } });
      await prisma.invitationVolume.createMany({ data: volumes });
    }

    // "X points and Y volume records" -- always both numbers, even when
    // one of them is 0, so the admin can tell "the file had no volume
    // table" apart from "the volume table failed to parse".
    const summary = `${rows.length} point${rows.length === 1 ? "" : "s"} and ${volumes.length} volume record${volumes.length === 1 ? "" : "s"}`;

    // Repurposes ScraperSyncLog (see prisma/schema.prisma) as an import
    // log now that there's no scraper -- same table, same "when did this
    // source last update" purpose, just triggered by a manual upload
    // instead of a bot run.
    await prisma.scraperSyncLog.upsert({
      where: { sourceId: format.id },
      update: {
        lastRunAt: now,
        status: "success",
        message: `Imported ${summary} from ${file.name}`,
      },
      create: {
        sourceId: format.id,
        lastRunAt: now,
        status: "success",
        message: `Imported ${summary} from ${file.name}`,
      },
    });

    revalidatePath("/[locale]/admin/data-sync", "page");
    revalidatePath("/[locale]/rounds", "page");

    return {
      success: true,
      message: `Successfully imported ${summary} for ${format.label}`,
      rowsImported: rows.length + volumes.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await prisma.scraperSyncLog
      .upsert({
        where: { sourceId: format.id },
        update: { lastRunAt: now, status: "failed", message },
        create: { sourceId: format.id, lastRunAt: now, status: "failed", message },
      })
      .catch(() => {
        // Best-effort -- the original error below is what's returned either way.
      });

    console.error(`[import-data] import failed for "${format.id}":`, error);
    return { success: false, error: `Database write failed: ${message}` };
  }
}
