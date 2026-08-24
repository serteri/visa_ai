import { scrapeCaEoiRounds } from "@/lib/scrapers/ca-eoi-scraper";
import { safeEqual } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/scrape-ca-eoi
 *
 * Triggers the Canada Express Entry draw scraper.
 * Protected by CRON_SECRET (same secret as the AU cron).
 *
 * Designed to be idempotent: if no new rounds are found, inserted=0 and the
 * response still has status 200 — safe to call at any frequency.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const providedToken = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : null;

  if (!secret) {
    return Response.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 }
    );
  }

  if (!providedToken || !safeEqual(providedToken, secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const scrape = await scrapeCaEoiRounds();

    return Response.json({
      ...scrape,
      country: "CA",
      ranAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown cron error";
    return Response.json(
      {
        inserted: 0,
        skipped: 0,
        country: "CA",
        error: message,
      },
      { status: 500 }
    );
  }
}
