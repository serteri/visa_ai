import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { db } from "@/db";
import { fullCheckUsage } from "@/db/schema";
import { prisma } from "@/lib/prisma";
import { safeEqual } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Header-only -- see the sibling revalidate-full-check-usage route for why
// the `?secret=` query-string fallback was removed (URL-embedded secrets
// leak into logs/history/referrers).
function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  const fallbackHeader = request.headers.get("x-admin-secret");
  if (fallbackHeader && fallbackHeader.trim().length > 0) {
    return fallbackHeader.trim();
  }

  return null;
}

// Strips surrounding quote characters in addition to whitespace: if an env
// var value like ADMIN_EMAILS="a@b.com,c@d.com" gets pasted verbatim
// (quotes included) into a dashboard UI, trim() alone won't remove the
// quotes, silently breaking every email in the list.
function parseEmailList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((value) => value.trim().replace(/^["']+|["']+$/g, "").trim().toLowerCase())
    .filter(Boolean);
}

function getDatabaseIdentity() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    return { configured: false };
  }

  try {
    const url = new URL(raw);
    return {
      configured: true,
      host: url.hostname,
      database: url.pathname.replace(/^\//, "") || null,
    };
  } catch {
    return {
      configured: true,
      parseError: true,
    };
  }
}

function isMissingRelationError(error: unknown, relationName: string): boolean {
  const target = relationName.toLowerCase();

  const scan = (value: unknown): boolean => {
    if (!value) return false;
    if (typeof value === "string") {
      return value.toLowerCase().includes(target) || value.includes("42P01");
    }
    if (typeof value !== "object") return false;

    const record = value as Record<string, unknown>;
    if (record.code === "42P01") return true;
    return Object.values(record).some((entry) => scan(entry));
  };

  return scan(error);
}

export async function GET(request: NextRequest) {
  const configuredSecret = process.env.ADMIN_SECRET ?? process.env.CRON_SECRET;

  if (!configuredSecret) {
    return Response.json(
      { ok: false, error: "Missing ADMIN_SECRET/CRON_SECRET in runtime" },
      { status: 500 },
    );
  }

  const providedSecret = getAuthToken(request);
  if (!providedSecret || !safeEqual(providedSecret, configuredSecret)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const maxFreeRaw = process.env.MAX_FREE_REPORTS;
  const maxFreeParsed = parseInt(maxFreeRaw ?? "14", 10);
  const adminEmails = parseEmailList(process.env.ADMIN_EMAILS);
  const knownTestEmails = parseEmailList(process.env.KNOWN_TEST_EMAILS);
  const excludedEmails = Array.from(new Set([...adminEmails, ...knownTestEmails])).sort();

  let fullCheckUsageTableExists = true;
  let fullCheckUsageRow: {
    freeReportsUsed: number | null;
    freeLimit: number | null;
    isFreeActive: boolean | null;
  } | null = null;
  let fullCheckUsageError: string | null = null;

  try {
    const rows = await db
      .select({
        freeReportsUsed: fullCheckUsage.free_reports_used,
        freeLimit: fullCheckUsage.free_limit,
        isFreeActive: fullCheckUsage.is_free_active,
      })
      .from(fullCheckUsage)
      .where(eq(fullCheckUsage.id, 1))
      .limit(1);

    fullCheckUsageRow = rows[0] ?? null;
  } catch (error) {
    fullCheckUsageTableExists = !isMissingRelationError(error, "full_check_usage");
    fullCheckUsageError = error instanceof Error ? error.message : "Unknown error";
  }

  const fallbackRows = await prisma.userReport.findMany({
    where: { source: "full_check" },
    select: {
      email: true,
      isUnlocked: true,
      paymentStatus: true,
      unlockMethod: true,
    },
  });

  const consumedUsers = new Set<string>();
  for (const row of fallbackRows) {
    const email = row.email?.trim().toLowerCase() ?? "";
    if (!email) continue;
    if (excludedEmails.includes(email)) continue;

    const hasClaimedFreeSlot =
      row.isUnlocked === true ||
      row.paymentStatus === "beta_free" ||
      row.unlockMethod === "beta_free";

    if (hasClaimedFreeSlot) {
      consumedUsers.add(email);
    }
  }

  const consumedEmails = Array.from(consumedUsers).sort();

  return Response.json({
    ok: true,
    runtime: {
      nextPublicIsFreeBeta: process.env.NEXT_PUBLIC_IS_FREE_BETA,
      maxFreeReportsRaw: maxFreeRaw ?? null,
      maxFreeReportsParsed: Number.isFinite(maxFreeParsed) ? maxFreeParsed : null,
      adminEmails,
      knownTestEmails,
      excludedEmails,
      databaseIdentity: getDatabaseIdentity(),
    },
    fullCheckUsageTable: {
      exists: fullCheckUsageTableExists,
      row: fullCheckUsageRow,
      error: fullCheckUsageError,
    },
    fallback: {
      consumedCount: consumedEmails.length,
      consumedEmails,
      computedRemaining: Number.isFinite(maxFreeParsed)
        ? Math.max(0, maxFreeParsed - consumedEmails.length)
        : null,
    },
    checkedAt: new Date().toISOString(),
  });
}
