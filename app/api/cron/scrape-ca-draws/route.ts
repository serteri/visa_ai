import { scrapeCanadaDraws } from "@/lib/scrapers/canada-draw-scraper";
import { safeEqual } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const providedToken = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : null;

  if (!secret) {
    return Response.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }

  if (!providedToken || !safeEqual(providedToken, secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const scrape = await scrapeCanadaDraws();

    return Response.json({
      ...scrape,
      ranAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown cron error";
    return Response.json(
      {
        inserted: 0,
        skipped: 0,
        error: message,
      },
      { status: 500 }
    );
  }
}
