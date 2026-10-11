import { safeEqual } from "@/lib/admin-auth";
import { runStateMonitor } from "@/lib/state-monitor/run";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Weekly state-page change monitor (vercel.json "crons"): same CRON_SECRET bearer auth as the other cron routes. Fetches the official state pages,
 * stores a normalised hash and snippet, emails ADMIN_NOTIFICATION_EMAIL when a page's content changed (or a page keeps failing), logs the run.
 * It never changes report data. The admin panel (/admin/states) can run it by hand too.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const providedToken = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : null;
  if (!secret) return Response.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  if (!providedToken || !safeEqual(providedToken, secret)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const summary = await runStateMonitor({ trigger: "cron" });
  return Response.json({ ...summary, changed: summary.changed.map((c) => ({ state: c.state, url: c.url, detectedAt: c.detectedAt })), ranAt: new Date().toISOString() }, { status: summary.error ? 500 : 200 });
}
