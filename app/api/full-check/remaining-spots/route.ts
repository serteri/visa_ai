import { getCachedFullCheckUsage } from "@/lib/cache/public-read-models";

export const revalidate = 300;

export async function GET() {
  try {
    const usage = await getCachedFullCheckUsage();

    return Response.json({
      remaining: usage.remainingSpots,
      total: usage.maxFree,
      isFreeActive: usage.isFreeActive,
    });
  } catch (err) {
    console.error("Failed to fetch remaining spots:", err);
    return Response.json(
      { remaining: 0, total: 50, isFreeActive: false },
      { status: 500 }
    );
  }
}
