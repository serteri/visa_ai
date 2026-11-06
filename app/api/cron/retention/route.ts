import { safeEqual } from "@/lib/admin-auth";
import { isDryRun, runRetention } from "@/lib/retention/run";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Weekly retention clean-up (vercel.json "crons"); same CRON_SECRET bearer auth as the other cron routes. DRY RUN BY DEFAULT: it only counts the rows each
 * rule would delete, and returns the counts, until RETENTION_DRY_RUN is set to exactly "false" in the Vercel environment (see lib/retention/run.ts).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const providedToken = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : null;
  if (!secret) return Response.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  if (!providedToken || !safeEqual(providedToken, secret)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const result = await runRetention(isDryRun());
  console.log(`[retention] dryRun=${result.dryRun} ${JSON.stringify(Object.fromEntries(Object.entries(result.rules).map(([k, v]) => [k, v.rows])))}`);
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
