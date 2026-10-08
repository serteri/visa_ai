import { inArray, notInArray, and, count } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { db } from "@/db";
import { pdfDownloads } from "@/db/schema";
import { FREE_LIMIT as PDF_FREE_LIMIT, PDF_SLUGS } from "@/app/api/pdf-download/route";
import { getUniqueOccupations } from "@/lib/occupations/seo";
import { prisma } from "@/lib/prisma";

// Strips surrounding quote characters in addition to whitespace: if an env
// var value like ADMIN_EMAILS="a@b.com,c@d.com" gets pasted verbatim
// (quotes included) into a dashboard UI, trim() alone won't remove the
// quotes, silently breaking every email in the list.
function parseEmailList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((item) => item.trim().replace(/^["']+|["']+$/g, "").trim().toLowerCase())
    .filter(Boolean);
}

function getKnownTestEmailSet(): Set<string> {
  return new Set(parseEmailList(process.env.KNOWN_TEST_EMAILS));
}

function getExcludedEmailSet(): Set<string> {
  const adminEmails = new Set(parseEmailList(process.env.ADMIN_EMAILS));
  return new Set([...adminEmails, ...getKnownTestEmailSet()]);
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


export const getCachedSeoOccupations = unstable_cache(
  async () => {
    return getUniqueOccupations();
  },
  ["public-seo-occupations"],
  { revalidate: 86400, tags: ["public-seo-occupations"] },
);
