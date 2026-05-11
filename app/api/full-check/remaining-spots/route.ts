import { eq } from "drizzle-orm";
import { db } from "@/db";
import { fullCheckUsage } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(fullCheckUsage)
      .where(eq(fullCheckUsage.id, 1))
      .limit(1);

    const maxFree = parseInt(process.env.MAX_FREE_REPORTS ?? "50", 10);
    const used = rows[0]?.free_reports_used ?? 0;
    const remaining = Math.max(0, maxFree - used);

    return Response.json({
      remaining,
      total: maxFree,
      isFreeActive: remaining > 0,
    });
  } catch (err) {
    console.error("Failed to fetch remaining spots:", err);
    return Response.json(
      { remaining: 0, total: 50, isFreeActive: false },
      { status: 500 }
    );
  }
}
