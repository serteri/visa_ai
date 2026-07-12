import { eq, inArray, notInArray, and, count } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { db } from "@/db";
import { fullCheckUsage, pdfDownloads } from "@/db/schema";
import { FREE_LIMIT as PDF_FREE_LIMIT, PDF_SLUGS } from "@/app/api/pdf-download/route";
import { getUniqueOccupations } from "@/lib/occupations/seo";
import { prisma } from "@/lib/prisma";

const FALLBACK_FREE_LIMIT = 50;

function getKnownTestEmailSet(): Set<string> {
  return new Set(
    (process.env.KNOWN_TEST_EMAILS ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
}

function getExcludedEmailSet(): Set<string> {
  const adminEmails = new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
  return new Set([...adminEmails, ...getKnownTestEmailSet()]);
}

async function countFallbackConsumedFreeUsers(excludedEmails: Set<string>): Promise<number> {
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
    if (excludedEmails.has(email)) continue;

    const hasClaimedFreeSlot =
      row.isUnlocked === true ||
      row.paymentStatus === "beta_free" ||
      row.unlockMethod === "beta_free";

    if (hasClaimedFreeSlot) {
      consumedUsers.add(email);
    }
  }

  return consumedUsers.size;
}

export const getCachedInvitationRounds = unstable_cache(
  async () => {
    return prisma.eoiRound.findMany({
      orderBy: [{ roundDate: "desc" }, { visaSubclass: "asc" }],
    });
  },
  ["public-invitation-rounds"],
  { revalidate: 3600, tags: ["public-invitation-rounds"] },
);

export const getCachedGuideDownloadStats = unstable_cache(
  async () => {
    const [guideConfig, currentDownloads] = await Promise.all([
      prisma.guideConfig.findUnique({
        where: { id: "main" },
        select: { maxDownloads: true },
      }),
      prisma.guideDownload.count(),
    ]);

    const maxDownloads = guideConfig?.maxDownloads || 20;
    const remainingDownloads = Math.max(0, maxDownloads - currentDownloads);

    return {
      maxDownloads,
      currentDownloads,
      remainingDownloads,
    };
  },
  ["public-guide-download-stats"],
  { revalidate: 3600, tags: ["public-guide-download-stats"] },
);

// Backs the "free download slots left" counter on the homepage
// (components/home-content.tsx). Computed server-side and passed in as the
// initial prop so SSR output already matches the real count — this is what
// prevents the 18 -> 17 hydration flicker that used to happen when the
// client re-fetched the live value after mount.
export const getCachedPdfLeadDownloadStats = unstable_cache(
  async () => {
    const allSlugs = Object.values(PDF_SLUGS);
    // Excludes admin/known-test emails so internal testing never depletes the
    // public-facing "free slots left" counter — same exclusion set already
    // used by getCachedFullCheckUsage below.
    const excludedEmails = Array.from(getExcludedEmailSet());
    const where =
      excludedEmails.length > 0
        ? and(inArray(pdfDownloads.pdf_slug, allSlugs), notInArray(pdfDownloads.email, excludedEmails))
        : inArray(pdfDownloads.pdf_slug, allSlugs);
    const [totalRow] = await db
      .select({ value: count() })
      .from(pdfDownloads)
      .where(where);

    const totalDownloads = Number(totalRow?.value ?? 0);
    const freeRemaining = Math.max(0, PDF_FREE_LIMIT - totalDownloads);

    return {
      totalDownloads,
      freeRemaining,
      isFree: totalDownloads < PDF_FREE_LIMIT,
    };
  },
  ["public-pdf-lead-download-stats"],
  { revalidate: 60, tags: ["public-guide-download-stats"] },
);

export const getCachedFullCheckUsage = unstable_cache(
  async () => {
    const maxFree = parseInt(process.env.MAX_FREE_REPORTS ?? "14", 10);
    const excludedEmails = getExcludedEmailSet();
    let usageRows: Array<{ freeReportsUsed: number | null; isFreeActive: boolean | null }> = [];

    try {
      usageRows = await db
        .select({
          freeReportsUsed: fullCheckUsage.free_reports_used,
          isFreeActive: fullCheckUsage.is_free_active,
        })
        .from(fullCheckUsage)
        .where(eq(fullCheckUsage.id, 1))
        .limit(1);
    } catch {
      const consumed = await countFallbackConsumedFreeUsers(excludedEmails);

      const remainingSpots = Math.max(0, maxFree - consumed);

      return {
        maxFree,
        remainingSpots,
        isFreeActive: remainingSpots > 0,
      };
    }

    const used = usageRows[0]?.freeReportsUsed ?? 0;
    const remainingSpots = Math.max(0, maxFree - used);
    const dbFreeActive = usageRows[0]?.isFreeActive !== false;

    return {
      maxFree,
      remainingSpots,
      isFreeActive: dbFreeActive && remainingSpots > 0,
    };
  },
  ["public-full-check-usage"],
  { revalidate: 300, tags: ["public-full-check-usage"] },
);

export const getCachedSeoOccupations = unstable_cache(
  async () => {
    return getUniqueOccupations();
  },
  ["public-seo-occupations"],
  { revalidate: 86400, tags: ["public-seo-occupations"] },
);
