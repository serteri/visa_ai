/**
 * Canada Express Entry – Draw Round Scraper
 *
 * Data source: IRCC's official JSON asset that powers the canada.ca rounds page.
 * Using the JSON endpoint avoids HTML scraping entirely (no bot-blocking risk,
 * no Cheerio, no User-Agent spoofing required).
 *
 * Endpoint: https://www.canada.ca/content/dam/ircc/documents/json/ee_rounds_123_en.json
 *
 * JSON shape (per element in rounds[]):
 *   drawNumber      – "419"  (unique round identifier, used as idempotency key)
 *   drawDate        – "2026-06-22"  (YYYY-MM-DD)
 *   drawName        – "Provincial Nominee Program"
 *   drawSize        – "955"  (invitations issued, may contain commas)
 *   drawCRS         – "730"  (CRS cut-off score)
 *
 * Idempotency: a round is skipped if drawNumber already exists in ca_eoi_rounds.
 * This makes the cron safe to run at any frequency.
 */

import { prisma } from "@/lib/prisma";

const IRCC_JSON_URL =
  "https://www.canada.ca/content/dam/ircc/documents/json/ee_rounds_123_en.json";

// ─── Types ────────────────────────────────────────────────────────────────────

type IrccRound = {
  drawNumber: string;
  drawDate: string; // "YYYY-MM-DD"
  drawName: string;
  drawSize: string; // may be "4,500" – contains commas
  drawCRS: string;  // CRS cut-off score
  [key: string]: string; // dd1…dd18 pool distribution fields, ignored
};

type IrccResponse = {
  rounds: IrccRound[];
};

export type CaEoiScrapeResult = {
  inserted: number;
  skipped: number;
  latestDrawNumber?: number;
  error?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip commas from numeric strings like "4,500" → 4500 */
function parseCommaInt(value: string): number | null {
  const digits = value.replace(/,/g, "").trim();
  if (!digits) return null;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}

/** Parse IRCC's "YYYY-MM-DD" date string into a UTC midnight Date. */
function parseIrccDate(raw: string): Date | null {
  // Expect format: "2026-06-22"
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(d.getTime()) ? null : d;
}

// ─── Fetch & Parse ────────────────────────────────────────────────────────────

async function fetchIrccRounds(): Promise<IrccRound[]> {
  /**
   * The IRCC JSON is served from Canada.ca's CDN (Akamai).
   * No special headers are needed — plain GET works fine.
   * We still include a realistic Accept header to be good citizens.
   */
  const response = await fetch(IRCC_JSON_URL, {
    method: "GET",
    headers: {
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-CA,en;q=0.9",
      // Deliberately NOT spoofing a browser UA — the CDN doesn't need it.
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `IRCC JSON fetch failed with status ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as IrccResponse;

  if (!Array.isArray(data?.rounds)) {
    throw new Error("Unexpected IRCC JSON shape: missing `rounds` array");
  }

  return data.rounds;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function scrapeCaEoiRounds(): Promise<CaEoiScrapeResult> {
  let inserted = 0;
  let skipped = 0;

  try {
    console.log("[CA EOI Scraper] Fetching IRCC JSON...");
    const rounds = await fetchIrccRounds();
    console.log(`[CA EOI Scraper] Received ${rounds.length} rounds from IRCC.`);

    if (rounds.length === 0) {
      throw new Error("IRCC returned an empty rounds array.");
    }

    // The JSON is ordered newest-first; use the first entry's drawNumber as
    // a quick "new data?" check before touching the DB.
    const latestDrawNumber = parseCommaInt(rounds[0].drawNumber);

    for (const raw of rounds) {
      const drawNumber = parseCommaInt(raw.drawNumber);
      if (drawNumber === null) {
        console.warn("[CA EOI Scraper] Skipping round with unparseable drawNumber:", raw.drawNumber);
        skipped += 1;
        continue;
      }

      const roundDate = parseIrccDate(raw.drawDate);
      if (!roundDate) {
        console.warn("[CA EOI Scraper] Skipping round with unparseable date:", raw.drawDate, "drawNumber:", drawNumber);
        skipped += 1;
        continue;
      }

      const invitations = parseCommaInt(raw.drawSize);
      if (invitations === null) {
        console.warn("[CA EOI Scraper] Skipping round with unparseable drawSize:", raw.drawSize, "drawNumber:", drawNumber);
        skipped += 1;
        continue;
      }

      const crsScore = parseCommaInt(raw.drawCRS);
      if (crsScore === null) {
        console.warn("[CA EOI Scraper] Skipping round with unparseable drawCRS:", raw.drawCRS, "drawNumber:", drawNumber);
        skipped += 1;
        continue;
      }

      const drawName = (raw.drawName ?? "").trim() || "Express Entry";

      try {
        // Idempotency: upsert on drawNumber — if already present, skip.
        const existing = await prisma.caEoiRound.findUnique({
          where: { drawNumber },
        });

        if (existing) {
          skipped += 1;
          continue;
        }

        await prisma.caEoiRound.create({
          data: {
            drawNumber,
            roundDate,
            drawName,
            crsScore,
            invitations,
            source: "scraper",
          },
        });

        inserted += 1;
        console.log(
          `[CA EOI Scraper] Inserted draw #${drawNumber} – ${drawName} – CRS ${crsScore} – ${invitations} invitations`
        );
      } catch (rowError) {
        skipped += 1;
        console.error("[CA EOI Scraper] Failed to insert draw #" + drawNumber, rowError);
      }
    }

    console.log(
      `[CA EOI Scraper] Done: inserted=${inserted}, skipped=${skipped}, latest draw #${latestDrawNumber ?? "?"}`
    );
    return { inserted, skipped, latestDrawNumber: latestDrawNumber ?? undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scrape error";
    console.error("[CA EOI Scraper] Failed:", message);
    return { inserted, skipped, error: message };
  }
}
