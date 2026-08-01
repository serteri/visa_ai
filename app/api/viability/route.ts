/**
 * POST /api/viability
 *
 * Fetches the most recent invitation round cutoff for a user's occupation
 * and compares it against their calculated points.
 *
 * Body: { occupation: string, calculatedPoints: number, visaSubclass?: string }
 * Returns: { cutoff, gap, viability, round, message }
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { occupation, calculatedPoints, visaSubclass = "189" } = await request.json();

    if (!occupation || calculatedPoints === undefined) {
      return NextResponse.json(
        { error: "occupation and calculatedPoints are required" },
        { status: 400 }
      );
    }

    // Find the occupation by ANZSCO code or title
    const occupationRecord = await prisma.occupation.findFirst({
      where: {
        OR: [
          { anzscoCode: occupation },
          { title: { contains: occupation, mode: "insensitive" } },
        ],
      },
    });

    if (!occupationRecord) {
      return NextResponse.json({
        found: false,
        message: "Occupation not found in historical cutoff database.",
      });
    }

    // Find the most recent round cutoff for this occupation + subclass
    const latestCutoff = await prisma.roundCutoff.findFirst({
      where: {
        occupationId: occupationRecord.id,
        round: { visaSubclass },
      },
      include: { round: true },
      orderBy: { round: { date: "desc" } },
    });

    if (!latestCutoff) {
      return NextResponse.json({
        found: true,
        occupation: { code: occupationRecord.anzscoCode, title: occupationRecord.title },
        cutoff: null,
        message: "No historical cutoff data available for this occupation.",
      });
    }

    const gap = calculatedPoints - latestCutoff.minimumScore;
    const viability =
      gap >= 10 ? "strong"
        : gap >= 0 ? "viable"
        : gap >= -5 ? "borderline"
        : "below_threshold";

    // Fetch state allocation for context
    const stateAllocation = await prisma.stateAllocation.findMany({
      where: {
        programYear: "2025-26",
        visaSubclass: { in: ["190", "491"] },
      },
      orderBy: [{ state: "asc" }, { visaSubclass: "asc" }],
    });

    return NextResponse.json({
      found: true,
      occupation: {
        code: occupationRecord.anzscoCode,
        title: occupationRecord.title,
      },
      cutoff: {
        minimumScore: latestCutoff.minimumScore,
        roundDate: latestCutoff.round.date,
        totalInvited: latestCutoff.round.totalInvited,
        tieBreakDate: latestCutoff.round.tieBreakDate,
      },
      calculatedPoints,
      gap,
      viability,
      stateAllocations: stateAllocation.map((sa) => ({
        state: sa.state,
        visaSubclass: sa.visaSubclass,
        allocation: sa.allocation,
        nominationsUsed: sa.nominationsUsed,
      })),
    });
  } catch (error) {
    console.error("Viability check failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
