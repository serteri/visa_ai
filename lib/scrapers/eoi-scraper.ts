import * as cheerio from "cheerio";

import { prisma } from "@/lib/prisma";

const TARGET_URL =
  "https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect/invitation-rounds";

type ScrapedRound = {
  roundDate: Date;
  visaSubclass: string;
  visaName: string;
  lowestPoints: number;
  invitations: number;
};

export type EoiScrapeResult = {
  inserted: number;
  skipped: number;
  error?: string;
};

function normalizeText(value: string): string {
  return value
    .replace(/[\u2012\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function parseInteger(value: string): number | null {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return null;
  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseRoundDate(raw: string): Date | null {
  const text = normalizeText(raw);
  const simple = text.match(/(\d{1,2}\s+[A-Za-z]+\s+\d{4})/);
  const value = simple?.[1] ?? text;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
}

function mapVisa(raw: string): { subclass: string; name: string } | null {
  const text = normalizeText(raw).toLowerCase();

  if (text.includes("189") || text.includes("skilled-independent") || text.includes("skilled independent")) {
    return { subclass: "189", name: "Skilled Independent" };
  }
  if (text.includes("190") || text.includes("skilled-nominated") || text.includes("skilled nominated")) {
    return { subclass: "190", name: "Skilled Nominated" };
  }
  if (
    text.includes("491") ||
    text.includes("skilled-work regional") ||
    text.includes("skilled work regional")
  ) {
    return { subclass: "491", name: "Skilled Work Regional" };
  }

  return null;
}

function parseRoundFromCells(cells: string[]): ScrapedRound | null {
  if (cells.length < 4) return null;

  const dateText = cells.find((cell) => /\d{4}/.test(cell)) ?? "";
  const roundDate = parseRoundDate(dateText);
  if (!roundDate) return null;

  const visaCell = cells.find((cell) => /(subclass|skilled)/i.test(cell)) ?? cells[1] ?? "";
  const visa = mapVisa(visaCell);
  if (!visa) return null;

  const numericCells = cells.map((cell) => parseInteger(cell));
  const pointsCandidate = numericCells.find((value) => value !== null && value >= 50 && value <= 130) ?? null;

  const invitationCandidate =
    numericCells.find((value) => value !== null && value > 130) ??
    numericCells.find((value) => value !== null && value > 0 && value !== pointsCandidate) ??
    null;

  if (pointsCandidate === null || invitationCandidate === null) {
    return null;
  }

  return {
    roundDate,
    visaSubclass: visa.subclass,
    visaName: visa.name,
    lowestPoints: pointsCandidate,
    invitations: invitationCandidate,
  };
}

function extractRoundsFromHtml(html: string): ScrapedRound[] {
  const $ = cheerio.load(html);
  const parsed = new Map<string, ScrapedRound>();

  $("table tr").each((_, row) => {
    const cells = $(row)
      .find("th, td")
      .toArray()
      .map((cell) => normalizeText($(cell).text()))
      .filter(Boolean);

    const round = parseRoundFromCells(cells);
    if (!round) return;

    const key = `${round.roundDate.toISOString()}-${round.visaSubclass}`;
    if (!parsed.has(key)) parsed.set(key, round);
  });

  return Array.from(parsed.values());
}

export async function scrapeEoiRounds(): Promise<EoiScrapeResult> {
  let inserted = 0;
  let skipped = 0;

  try {
    console.log("[EOI Scraper] Fetching invitation rounds page...");
    const response = await fetch(TARGET_URL, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Cache-Control": "max-age=0",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Source request failed with status ${response.status}`);
    }

    const html = await response.text();
    const rounds = extractRoundsFromHtml(html);

    if (rounds.length === 0) {
      throw new Error("No rounds parsed. Source HTML structure may have changed.");
    }

    for (const round of rounds) {
      try {
        const existing = await prisma.eoiRound.findUnique({
          where: {
            roundDate_visaSubclass: {
              roundDate: round.roundDate,
              visaSubclass: round.visaSubclass,
            },
          },
        });

        if (existing) {
          skipped += 1;
          continue;
        }

        await prisma.eoiRound.create({
          data: {
            roundDate: round.roundDate,
            visaSubclass: round.visaSubclass,
            visaName: round.visaName,
            lowestPoints: round.lowestPoints,
            invitations: round.invitations,
            source: "scraper",
            isEstimated: false,
          },
        });

        inserted += 1;
      } catch (rowError) {
        skipped += 1;
        console.error("[EOI Scraper] Failed to process row", round, rowError);
      }
    }

    console.log(`[EOI Scraper] Completed: inserted=${inserted}, skipped=${skipped}`);
    return { inserted, skipped };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scrape error";
    console.error("[EOI Scraper] Failed:", message);
    return { inserted, skipped, error: message };
  }
}
