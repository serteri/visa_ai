// Skeleton for the fortnightly state-migration status sync. Intended to be
// wired up to Vercel Cron (vercel.json "crons" entry, schedule e.g.
// "0 3 1,15 * *" for 1st + 15th of each month) hitting this route with the
// CRON_SECRET bearer token, same auth pattern as the other app/api/cron/*
// routes (see scrape-eoi/route.ts).
//
// TODO(state-intelligence): implement the actual scrape. Rough shape:
//   1. For each AU state/territory in STATE_SOURCES below, fetch the
//      official migration page (Cheerio for static HTML; a headless
//      browser like Puppeteer/Playwright if the page needs JS rendering;
//      or an AI-extraction call if the page structure is too unstable for
//      a hand-written selector) and pull out:
//        - current nomination status (map the site's wording onto one of
//          "Open for Offshore" | "High Demand" | "Closed" | "Onshore Only"
//          -- see StateNominationStatus in lib/readiness/types.ts -- an
//          unrecognized value is safely ignored by the reader, see
//          asKnownStatus() in lib/readiness/state-nomination.ts, so it's
//          fine to store the raw site wording in `status` even when it
//          doesn't map cleanly)
//        - a short human-readable summary of the latest official update
//   2. Upsert one StateIntelligence row per state (unique on stateCode):
//        prisma.stateIntelligence.upsert({
//          where: { stateCode },
//          update: { status, officialNote, sourceUrl, lastVerifiedAt: new Date() },
//          create: { stateCode, status, officialNote, sourceUrl, lastVerifiedAt: new Date() },
//        });
//      Only touch lastVerifiedAt on a SUCCESSFUL scrape of that specific
//      state -- if one state's fetch fails, leave its previous
//      status/officialNote/lastVerifiedAt untouched rather than overwriting
//      good data with a failure, and don't let one state's failure abort
//      the rest of the batch.
//   3. Return a per-state summary (updated/skipped/failed + reasons) so
//      cron run logs are debuggable without needing DB access.
//
// import { prisma } from "@/lib/prisma";
//
// const STATE_SOURCES: Record<string, string> = {
//   NSW: "https://www.nsw.gov.au/migration/skilled-visa-nomination",
//   VIC: "https://www.vic.gov.au/live-victoria-skilled-and-business-visas",
//   QLD: "https://migration.qld.gov.au/",
//   WA: "https://www.migration.wa.gov.au/",
//   SA: "https://migration.sa.gov.au/",
//   TAS: "https://www.migration.tas.gov.au/",
//   NT: "https://www.migration.nt.gov.au/",
//   ACT: "https://www.canberrayourfuture.act.gov.au/",
// };

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret) {
    return Response.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Not implemented yet -- see TODO above. Returning a clearly-labeled
  // no-op response (not a 500) so wiring this into Vercel Cron early
  // doesn't page anyone; the real scrape lands in a follow-up change.
  return Response.json({
    status: "not_implemented",
    message: "sync-states scraper is scaffolded but not yet implemented.",
    ranAt: new Date().toISOString(),
  });
}
