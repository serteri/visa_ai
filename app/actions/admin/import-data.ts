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

const ONSHORE_LOCATIONS = new Set(["onshore", "on-shore", "on shore", "wa", "western australia"]);

/**
 * "WA - Invitation Rounds" format: exact WA government export columns --
 * Occupation, State of residence, EOI Points Score, EOI Submission Date.
 * "State of residence" describes where the APPLICANT currently lives, not
 * the nominating state (that's always Western Australia for this format,
 * from SourceFormat.state) -- mapped onto InvitationFeedItem.location
 * instead: a resident of WA is "Onshore" for a WA nomination, anyone else
 * is "Offshore". There's no separate "date of effect" column in this
 * format, so EOI Submission Date fills both roundDate and dateOfEffect.
 */
function parseWaInvitationRounds(headers: string[], dataRows: unknown[][], format: SourceFormat): ParsedRow[] {
  const occupationIdx = findColumnIndex(headers, /^occupation$/i);
  const residenceIdx = findColumnIndex(headers, /state of residence/i);
  const pointsIdx = findColumnIndex(headers, /eoi points score|points score/i);
  const submissionDateIdx = findColumnIndex(headers, /eoi submission date|submission date/i);

  if (occupationIdx === -1 || pointsIdx === -1) return [];

  const rows: ParsedRow[] = [];
  for (const row of dataRows) {
    const occupation = String(row[occupationIdx] ?? "").trim();
    const points = parsePoints(row[pointsIdx]);
    if (!occupation || points === null) continue;

    const submissionDate = (submissionDateIdx !== -1 ? parseDate(row[submissionDateIdx]) : null) ?? new Date();
    const residence = residenceIdx !== -1 ? String(row[residenceIdx] ?? "").trim().toLowerCase() : "";

    rows.push({
      occupation,
      subclass: format.defaultSubclass,
      state: format.state,
      location: ONSHORE_LOCATIONS.has(residence) ? "Onshore" : "Offshore",
      points,
      dateOfEffect: submissionDate,
      roundDate: submissionDate,
    });
  }
  return rows;
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

function parseRows(workbook: XLSX.WorkBook, format: SourceFormat): ParsedRow[] {
  const rows: ParsedRow[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
      header: 1,
      defval: "",
      raw: true,
    });
    if (sheetRows.length < 2) continue;

    const headers = (sheetRows[0] as unknown[]).map((h) => String(h ?? "").trim());
    const dataRows = sheetRows.slice(1);

    rows.push(
      ...(format.id === "wa-invitation-rounds"
        ? parseWaInvitationRounds(headers, dataRows, format)
        : parseGenericFormat(headers, dataRows, format))
    );
  }

  return rows;
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

  const rows = parseRows(workbook, format);

  if (rows.length === 0) {
    return {
      success: false,
      error:
        format.id === "wa-invitation-rounds"
          ? "No usable rows found. Expected Occupation and EOI Points Score columns in the file."
          : "No usable rows found. Expected at least an Occupation column and a Points/Score/Cutoff column in the file.",
    };
  }

  const now = new Date();

  try {
    // "Eskileri temizle, yenileri ekle" -- replace this format's previous
    // import entirely rather than merging, so a re-upload always reflects
    // exactly what's in the latest file (no stale rows from an earlier
    // upload lingering alongside it).
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

    // Repurposes ScraperSyncLog (see prisma/schema.prisma) as an import
    // log now that there's no scraper -- same table, same "when did this
    // source last update" purpose, just triggered by a manual upload
    // instead of a bot run.
    await prisma.scraperSyncLog.upsert({
      where: { sourceId: format.id },
      update: {
        lastRunAt: now,
        status: "success",
        message: `Imported ${rows.length} row${rows.length === 1 ? "" : "s"} from ${file.name}`,
      },
      create: {
        sourceId: format.id,
        lastRunAt: now,
        status: "success",
        message: `Imported ${rows.length} row${rows.length === 1 ? "" : "s"} from ${file.name}`,
      },
    });

    revalidatePath("/[locale]/admin/data-sync", "page");
    revalidatePath("/[locale]/rounds", "page");

    return {
      success: true,
      message: `Successfully imported ${rows.length} row${rows.length === 1 ? "" : "s"} for ${format.label}`,
      rowsImported: rows.length,
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
