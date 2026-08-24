import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { NextRequest } from "next/server";

import { db } from "@/db";
import { fullCheckUsage } from "@/db/schema";
import { prisma } from "@/lib/prisma";
import { safeEqual } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Header-only -- a `?secret=` query-string fallback used to be accepted
// here too, but a secret in the URL leaks into server/proxy access logs,
// browser history, and any Referer header a link on this response might
// trigger. Headers only.
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

function getConfiguredSecret(): string | null {
  return process.env.ADMIN_SECRET ?? process.env.CRON_SECRET ?? null;
}

function isAuthorized(request: NextRequest): boolean {
  const configuredSecret = getConfiguredSecret();
  if (!configuredSecret) {
    return false;
  }

  const providedSecret = getAuthToken(request);
  return Boolean(providedSecret && safeEqual(providedSecret, configuredSecret));
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

export async function GET(request: NextRequest) {
  const configuredSecret = getConfiguredSecret();
  if (!configuredSecret) {
    return Response.json(
      { ok: false, error: "Missing ADMIN_SECRET/CRON_SECRET in runtime" },
      { status: 500 },
    );
  }

  if (!isAuthorized(request)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const maxFreeRaw = process.env.MAX_FREE_REPORTS;
  const maxFreeParsed = parseInt(maxFreeRaw ?? "14", 10);
  const adminEmails = parseEmailList(process.env.ADMIN_EMAILS);
  const knownTestEmails = parseEmailList(process.env.KNOWN_TEST_EMAILS);
  const excludedEmails = Array.from(new Set([...adminEmails, ...knownTestEmails]));

  let fullCheckUsageTableExists = true;
  let fullCheckUsageError: string | null = null;
  try {
    await db
      .select({ id: fullCheckUsage.id })
      .from(fullCheckUsage)
      .where(eq(fullCheckUsage.id, 1))
      .limit(1);
  } catch (error) {
    fullCheckUsageTableExists = !isMissingRelationError(error, "full_check_usage");
    fullCheckUsageError = error instanceof Error ? error.message : "Unknown error";
  }

  const rows = await prisma.userReport.findMany({
    where: { source: "full_check" },
    select: {
      email: true,
      isUnlocked: true,
      paymentStatus: true,
      unlockMethod: true,
    },
  });

  const consumedUsers = new Set<string>();
  for (const row of rows) {
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
      nextPublicIsFreeBeta: process.env.NEXT_PUBLIC_IS_FREE_BETA ?? null,
      maxFreeReportsRaw: maxFreeRaw ?? null,
      maxFreeReportsParsed: Number.isFinite(maxFreeParsed) ? maxFreeParsed : null,
      adminEmails,
      knownTestEmails,
      excludedEmails,
      databaseIdentity: getDatabaseIdentity(),
    },
    fullCheckUsageTable: {
      exists: fullCheckUsageTableExists,
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

export async function POST(request: NextRequest) {
  const configuredSecret = getConfiguredSecret();

  if (!configuredSecret) {
    return Response.json(
      { ok: false, error: "Missing ADMIN_SECRET/CRON_SECRET in runtime" },
      { status: 500 },
    );
  }

  if (!isAuthorized(request)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  revalidateTag("public-full-check-usage", "max");

  return Response.json({
    ok: true,
    tag: "public-full-check-usage",
    revalidatedAt: new Date().toISOString(),
  });
}
