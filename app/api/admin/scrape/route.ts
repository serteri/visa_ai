import { NextRequest } from "next/server";
import * as cheerio from "cheerio";

import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getScraperSource } from "@/lib/constants/scraper-sources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Admin-triggered "Run Scraper" endpoint (data-sync panel).
 *
 * No Playwright/Puppeteer here on purpose -- a headless browser doesn't fit
 * Vercel's serverless function limits, per this task's explicit scope. What
 * follows is a genuine draft of the eventual real-scrape shape (fetch the
 * source page, load it into cheerio so a future change just needs real
 * selectors instead of a whole new fetch/parse harness) followed by a
 * simulated 2s delay and a mock InvitationFeedItem write, so the end-to-end
 * "click button -> old mock row replaced -> new mock row visible" flow is
 * verifiable today without a real scraper existing yet.
 *
 * Writes to InvitationFeedItem (app/[locale]/(main)/rounds's feed table),
 * NOT the pre-existing InvitationRound/RoundCutoff/Occupation trio -- that
 * trio is live production data read by app/api/viability/route.ts and
 * lib/services/report-service.ts for real user-facing calculations, and
 * writing mock rows into it would corrupt those. See InvitationFeedItem's
 * doc comment in prisma/schema.prisma for the full naming-collision context.
 */
export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const sourceId = (body as { sourceId?: unknown })?.sourceId;
  const source = typeof sourceId === "string" ? getScraperSource(sourceId) : undefined;
  if (!source) {
    return Response.json({ ok: false, error: "Unknown sourceId" }, { status: 400 });
  }

  // Draft fetch+cheerio pass -- best-effort only, not real data extraction
  // yet. A failure here (network, bot-blocking, page structure) must never
  // abort the mock flow below; it's only used to prove the fetch/parse
  // plumbing works against the real URL.
  let pageTitle: string | null = null;
  let draftFetchError: string | null = null;
  try {
    const response = await fetch(source.url, {
      headers: { "User-Agent": "LogiVisaScraperBot/0.1 (+https://www.logivisa.com)" },
      signal: AbortSignal.timeout(6000),
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    pageTitle = $("title").first().text().trim() || null;
  } catch (error) {
    draftFetchError = error instanceof Error ? error.message : "Unknown fetch error";
    console.warn(`[admin/scrape] draft fetch failed for "${source.id}":`, draftFetchError);
  }

  // Simulate a scrape that takes real time, per this task's explicit ask.
  await sleep(2000);

  const now = new Date();
  const mockOccupation = `${source.label} (Mock Sample)`;
  const mockPoints = 70 + Math.floor(Math.random() * 21); // 70-90, a plausible cutoff range

  try {
    // "Old data replaced by new data" -- delete this source's previous mock
    // row (identified by its distinctive occupation label) before inserting
    // a fresh one, so re-running the scraper visibly swaps the row rather
    // than accumulating duplicates.
    await prisma.invitationFeedItem.deleteMany({ where: { occupation: mockOccupation } });
    const record = await prisma.invitationFeedItem.create({
      data: {
        occupation: mockOccupation,
        subclass: "189",
        state: source.label,
        location: "Offshore",
        points: mockPoints,
        dateOfEffect: now,
        roundDate: now,
      },
    });

    await prisma.scraperSyncLog.upsert({
      where: { sourceId: source.id },
      update: {
        lastRunAt: now,
        status: "success",
        message: pageTitle
          ? `Draft fetch OK (page title: "${pageTitle}"). Mock record inserted.`
          : `Draft fetch failed (${draftFetchError ?? "unknown"}). Mock record inserted anyway.`,
      },
      create: {
        sourceId: source.id,
        lastRunAt: now,
        status: "success",
        message: pageTitle ?? draftFetchError ?? "Mock run",
      },
    });

    return Response.json({
      ok: true,
      message: "Scraping successful",
      record,
      lastRunAt: now.toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await prisma.scraperSyncLog
      .upsert({
        where: { sourceId: source.id },
        update: { lastRunAt: now, status: "failed", message },
        create: { sourceId: source.id, lastRunAt: now, status: "failed", message },
      })
      .catch(() => {
        // Logging the failure is best-effort -- the original error below is
        // what actually gets returned to the caller either way.
      });

    console.error(`[admin/scrape] mock write failed for "${source.id}":`, error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
