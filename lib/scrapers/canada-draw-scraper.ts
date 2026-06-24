import * as cheerio from "cheerio";

import { prisma } from "@/lib/prisma";

const TARGET_URL =
  "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/rounds-invitations.html";

// Browser-like request headers, mirroring lib/scrapers/eoi-scraper.ts (the AU
// SkillSelect scraper). That site is a different domain with a different
// anti-bot setup, so this is not guaranteed to work the same way here — see
// the verification note in the cron route before relying on this in
// production.
const REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
  "Upgrade-Insecure-Requests": "1",
  "Cache-Control": "max-age=0",
} as const;

type ScrapedDraw = {
  drawDate: Date;
  programType: string;
  crsScoreCutoff: number | null;
  invitationsIssued: number;
  tieBreakRule: Date | null;
};

export type CanadaDrawScrapeResult = {
  inserted: number;
  skipped: number;
  error?: string;
};

function normalizeText(value: string): string {
  return value
    .replace(/[‒–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function parseInteger(value: string): number | null {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return null;
  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDrawDate(raw: string): Date | null {
  const text = normalizeText(raw);
  const simple = text.match(/([A-Za-z]+\s+\d{1,2},?\s+\d{4})/);
  const value = simple?.[1] ?? text;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  // Use local getters (matching eoi-scraper.ts) since `parsed` was built from
  // a local-time string parse — mixing local getters with Date.UTC normalizes
  // it to a UTC midnight representing the same calendar date. Using the UTC
  // getters here instead would shift the date by a day in timezones behind UTC.
  return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
}

function parseTieBreakDateTime(raw: string): Date | null {
  const text = normalizeText(raw);
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// IRCC's program taxonomy is open-ended (category-based draws are added over
// time, see knownPendingChanges in express-entry.json) — this maps known
// labels to a stable internal code and otherwise passes the label through
// as a slug rather than dropping the row, so new draw types still get stored.
const PROGRAM_TYPE_MAP: Array<[RegExp, string]> = [
  [/no program specified|general/i, "general"],
  [/canadian experience class/i, "CEC"],
  [/federal skilled trades/i, "FSTP"],
  [/federal skilled worker/i, "FSW"],
  [/provincial nominee/i, "PNP"],
  [/healthcare/i, "category_healthcare"],
  [/french language proficiency|french-language/i, "category_french"],
  [/trade occupations/i, "category_trade"],
  [/transport occupations/i, "category_transport"],
  [/agriculture and agri-food/i, "category_agriculture"],
  [/stem occupations/i, "category_stem"],
];

function mapProgramType(raw: string): string {
  const text = normalizeText(raw);
  for (const [pattern, code] of PROGRAM_TYPE_MAP) {
    if (pattern.test(text)) return code;
  }
  // Unknown/new category — keep a readable slug instead of discarding the row.
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "unknown";
}

// NOTE: column order/wording have not been verified against the live page
// from this environment (canada.ca was unreachable from this sandbox — see
// scrapeCanadaDraws() error handling and the cron route's verification
// note). This parses heuristically (matching by content, not fixed column
// index) the same way eoi-scraper.ts does, specifically to tolerate minor
// markup differences, but the exact selectors should be confirmed against
// real HTML before this is trusted in production.
function parseDrawFromCells(cells: string[]): ScrapedDraw | null {
  if (cells.length < 3) return null;

  const dateCell = cells.find((cell) => /\d{4}/.test(cell) && /[A-Za-z]/.test(cell)) ?? "";
  const drawDate = parseDrawDate(dateCell);
  if (!drawDate) return null;

  const programCell =
    cells.find((cell) =>
      PROGRAM_TYPE_MAP.some(([pattern]) => pattern.test(cell)) || /round|program|category/i.test(cell)
    ) ?? cells[1] ?? "";
  const programType = mapProgramType(programCell);

  // Only scan cells that are purely numeric (ignoring thousands separators)
  // for the CRS/invitations figures — naively stripping non-digits from the
  // date cell (e.g. "June 11, 2026") produces a spurious number ("112026")
  // that would otherwise get picked up as a candidate.
  //
  // Distinguishing invitations from CRS score by value range (as
  // eoi-scraper.ts does for AU) does not work reliably here: small
  // category-based draws can issue only a few hundred invitations, which
  // overlaps with plausible CRS scores (100-1200). Instead this relies on
  // the documented, stable column order of the official table — "Number of
  // invitations issued" before "CRS score of lowest-ranked candidate
  // invited" — so the first numeric cell is invitations, the second is CRS.
  // This positional assumption must be re-checked against live HTML.
  const numericCells = cells
    .filter((cell) => cell !== dateCell && cell !== programCell && /^[\d,]+$/.test(cell))
    .map((cell) => parseInteger(cell))
    .filter((value): value is number => value !== null);
  const invitationsCandidate = numericCells[0] ?? null;
  const crsCandidate = numericCells[1] ?? null;

  if (invitationsCandidate === null) return null;

  const tieBreakCell = cells.find((cell) => /\d{1,2}:\d{2}/.test(cell)) ?? "";
  const tieBreakRule = tieBreakCell ? parseTieBreakDateTime(tieBreakCell) : null;

  return {
    drawDate,
    programType,
    crsScoreCutoff: crsCandidate,
    invitationsIssued: invitationsCandidate,
    tieBreakRule,
  };
}

// Exported for testing the parsing logic against fixture HTML without
// requiring live network access or touching the database.
export function extractDrawsFromHtml(html: string): ScrapedDraw[] {
  const $ = cheerio.load(html);
  const parsed = new Map<string, ScrapedDraw>();

  $("table tr").each((_, row) => {
    const cells = $(row)
      .find("th, td")
      .toArray()
      .map((cell) => normalizeText($(cell).text()))
      .filter(Boolean);

    const draw = parseDrawFromCells(cells);
    if (!draw) return;

    const key = `${draw.drawDate.toISOString()}-${draw.programType}`;
    if (!parsed.has(key)) parsed.set(key, draw);
  });

  return Array.from(parsed.values());
}

export async function scrapeCanadaDraws(): Promise<CanadaDrawScrapeResult> {
  let inserted = 0;
  let skipped = 0;

  try {
    console.log("[Canada Draw Scraper] Fetching rounds-of-invitations page...");
    const response = await fetch(TARGET_URL, {
      method: "GET",
      headers: REQUEST_HEADERS,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Source request failed with status ${response.status}`);
    }

    const html = await response.text();
    const draws = extractDrawsFromHtml(html);

    if (draws.length === 0) {
      throw new Error("No draws parsed. Source HTML structure may have changed or selectors need updating.");
    }

    for (const draw of draws) {
      try {
        const existing = await prisma.expressEntryDraw.findUnique({
          where: {
            drawDate_programType: {
              drawDate: draw.drawDate,
              programType: draw.programType,
            },
          },
        });

        // This existence check (not a fixed cron interval) is what makes the
        // scraper safe to run on any schedule, including more often than
        // IRCC's actual draw cadence — it only ever inserts rounds it hasn't
        // seen before.
        if (existing) {
          skipped += 1;
          continue;
        }

        await prisma.expressEntryDraw.create({
          data: {
            drawDate: draw.drawDate,
            programType: draw.programType,
            crsScoreCutoff: draw.crsScoreCutoff,
            invitationsIssued: draw.invitationsIssued,
            tieBreakRule: draw.tieBreakRule,
            source: "scraper",
            isEstimated: false,
          },
        });

        inserted += 1;
      } catch (rowError) {
        skipped += 1;
        console.error("[Canada Draw Scraper] Failed to process row", draw, rowError);
      }
    }

    console.log(`[Canada Draw Scraper] Completed: inserted=${inserted}, skipped=${skipped}`);
    return { inserted, skipped };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scrape error";
    console.error("[Canada Draw Scraper] Failed:", message);
    return { inserted, skipped, error: message };
  }
}
