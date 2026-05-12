import { checkAndSendAlerts } from "@/lib/alerts/check-points-alerts";
import { scrapeEoiRounds } from "@/lib/scrapers/eoi-scraper";

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

  try {
    const scrape = await scrapeEoiRounds();
    const alerts = await checkAndSendAlerts();

    return Response.json({
      ...scrape,
      alerts,
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
