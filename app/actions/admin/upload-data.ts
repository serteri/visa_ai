"use server";

import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";

import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getMigrationSource } from "@/lib/constants/migration-sources";

/**
 * Manual Data Upload (Admin Data Sync panel). Replaces the previous mock
 * "Run Script & Sync" bot button entirely -- there was never a real
 * scraper, so admins now download the file themselves from the source's
 * official page (still linked on the panel) and upload it here instead of
 * a fake bot pretending to fetch it.
 *
 * Writes to InvitationFeedItem (app/[locale]/(main)/rounds's feed table),
 * NOT the pre-existing InvitationRound/RoundCutoff/Occupation trio -- that
 * trio is live production data read by app/api/viability/route.ts and
 * lib/services/report-service.ts for real user-facing point calculations.
 * A manual upload landing there could silently corrupt those. See
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
export type UploadDataResult =
  | { success: true; message: string; rowsImported: number }
  | { success: false; error: string };

const ONSHORE_LOCATIONS = new Set(["onshore", "on-shore", "on shore"]);

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

/**
 * Column names vary by source (Federal SkillSelect exports, state
 * government spreadsheets, hand-compiled admin CSVs are all different
 * shapes) so headers are matched generically by keyword rather than exact
 * position -- same approach as sync-state-occupation-lists.ts's
 * findColumnIndex for the same reason.
 */
function parseRows(workbook: XLSX.WorkBook, sourceName: string, sourceState: string): ParsedRow[] {
  const rows: ParsedRow[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
      header: 1,
      defval: "",
      raw: true,
    });
    if (sheetRows.length < 2) continue;

    const headers = (sheetRows[0] as unknown[]).map((h) => String(h ?? "").trim());
    const occupationIdx = findColumnIndex(headers, /occupation/i);
    const subclassIdx = findColumnIndex(headers, /subclass/i);
    const stateIdx = findColumnIndex(headers, /^state$/i);
    const locationIdx = findColumnIndex(headers, /location|onshore|offshore/i);
    const pointsIdx = findColumnIndex(headers, /points|score|cutoff/i);
    const effectIdx = findColumnIndex(headers, /effect/i);
    const roundDateIdx = findColumnIndex(headers, /round.*date|invitation.*date/i);

    if (occupationIdx === -1 || pointsIdx === -1) {
      // No recognizable occupation/points columns on this sheet -- skip it
      // rather than guessing, so a workbook with an unrelated cover-sheet
      // tab doesn't produce garbage rows.
      continue;
    }

    for (const row of sheetRows.slice(1)) {
      const occupation = String(row[occupationIdx] ?? "").trim();
      const points = parsePoints(row[pointsIdx]);
      if (!occupation || points === null) continue;

      const roundDate =
        (roundDateIdx !== -1 ? parseDate(row[roundDateIdx]) : null) ??
        (effectIdx !== -1 ? parseDate(row[effectIdx]) : null) ??
        new Date();
      const dateOfEffect = (effectIdx !== -1 ? parseDate(row[effectIdx]) : null) ?? roundDate;

      const rawLocation = locationIdx !== -1 ? String(row[locationIdx] ?? "").trim().toLowerCase() : "";
      const location = ONSHORE_LOCATIONS.has(rawLocation) ? "Onshore" : "Offshore";

      rows.push({
        occupation,
        subclass: subclassIdx !== -1 ? String(row[subclassIdx] ?? "").trim() || "189" : "189",
        state: stateIdx !== -1 ? String(row[stateIdx] ?? "").trim() || sourceState : sourceState,
        location,
        points,
        dateOfEffect,
        roundDate,
      });
    }
  }

  return rows;
}

export async function uploadMigrationData(formData: FormData): Promise<UploadDataResult> {
  if (!(await isAdminAuthenticated())) {
    return { success: false, error: "Unauthorized" };
  }

  const sourceId = formData.get("sourceId");
  const file = formData.get("file");

  if (typeof sourceId !== "string" || !sourceId) {
    return { success: false, error: "Select a source before uploading." };
  }
  const source = getMigrationSource(sourceId);
  if (!source) {
    return { success: false, error: "Unknown source." };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Choose a .csv, .xls, or .xlsx file to upload." };
  }
  if (!/\.(csv|xlsx?|xls)$/i.test(file.name)) {
    return { success: false, error: "Only .csv, .xls, and .xlsx files are accepted." };
  }

  let workbook: XLSX.WorkBook;
  try {
    const buffer = await file.arrayBuffer();
    workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  } catch (error) {
    return { success: false, error: `Could not read the file: ${error instanceof Error ? error.message : "unknown error"}` };
  }

  const sourceState = source.category === "Federal" ? "Federal" : source.name;
  const rows = parseRows(workbook, source.name, sourceState);

  if (rows.length === 0) {
    return {
      success: false,
      error:
        "No usable rows found. Expected at least an Occupation column and a Points/Score/Cutoff column in the file.",
    };
  }

  const now = new Date();

  try {
    // "Eskileri temizle, yenileri ekle" -- replace this source's previous
    // import entirely rather than merging, so a re-upload always reflects
    // exactly what's in the latest file (no stale rows from an earlier
    // upload lingering alongside it).
    await prisma.invitationFeedItem.deleteMany({ where: { state: sourceState } });
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
      where: { sourceId: source.id },
      update: { lastRunAt: now, status: "success", message: `Imported ${rows.length} row${rows.length === 1 ? "" : "s"} from ${file.name}` },
      create: {
        sourceId: source.id,
        lastRunAt: now,
        status: "success",
        message: `Imported ${rows.length} row${rows.length === 1 ? "" : "s"} from ${file.name}`,
      },
    });

    revalidatePath("/[locale]/admin/data-sync", "page");
    revalidatePath("/[locale]/rounds", "page");

    return {
      success: true,
      message: `Successfully imported ${rows.length} row${rows.length === 1 ? "" : "s"} for ${source.name}`,
      rowsImported: rows.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await prisma.scraperSyncLog
      .upsert({
        where: { sourceId: source.id },
        update: { lastRunAt: now, status: "failed", message },
        create: { sourceId: source.id, lastRunAt: now, status: "failed", message },
      })
      .catch(() => {
        // Best-effort -- the original error below is what's returned either way.
      });

    console.error(`[upload-data] import failed for "${source.id}":`, error);
    return { success: false, error: `Database write failed: ${message}` };
  }
}
