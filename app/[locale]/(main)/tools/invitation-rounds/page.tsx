import type { Metadata } from "next";
import { InvitationRoundsClient } from "./InvitationRoundsClient";
import { SeoContentSection } from "@/components/SeoContentSection";
import { getInvitationRoundsSeoContent, buildInvitationRoundsSchema } from "@/lib/seo/invitation-rounds-content";
import eoiRounds from "@/src/data/eoi-rounds.json";
import occupationPointsCutoff from "@/src/data/occupation-points-cutoff.json";
import { prisma } from "@/lib/prisma";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = new URL(BASE_URL);

  return {
    metadataBase: siteUrl,
    title: "Australia SkillSelect Invitation Rounds | Points Tracker | LogiVisa",
    description:
      "Track Australian skilled migration invitation rounds. See historical points cutoffs for subclass 189, 190 and 491 visas.",
    alternates: {
      canonical: `/${locale}/tools/invitation-rounds`,
      languages: {
        en: `/en/tools/invitation-rounds`,
        tr: `/tr/tools/invitation-rounds`,
        "zh-Hans": `/zh-Hans/tools/invitation-rounds`,
      },
    },
    openGraph: {
      title: "Australia SkillSelect Invitation Rounds | Points Tracker | LogiVisa",
      description:
        "Track Australian skilled migration invitation rounds. See historical points cutoffs for subclass 189, 190 and 491 visas.",
      type: "website",
      url: `/${locale}/tools/invitation-rounds`,
      images: [{ url: "/og/default-og.png", width: 1200, height: 630 }],
    },
  };
}

export default async function InvitationRoundsPage({ params }: PageProps) {
  const { locale } = await params;

  let dbRounds: Awaited<ReturnType<typeof prisma.eoiRound.findMany>> = [];
  try {
    dbRounds = await prisma.eoiRound.findMany({
      orderBy: [{ roundDate: "desc" }, { visaSubclass: "asc" }],
    });
  } catch (error) {
    console.error("Failed to load EOI rounds from database, using fallback JSON", error);
  }

  const rounds =
    dbRounds.length > 0
      ? dbRounds.map((round) => ({
          id: round.id,
          date: round.roundDate.toISOString().slice(0, 10),
          visaSubclass: round.visaSubclass,
          visaName: round.visaName,
          invitations: round.invitations,
          lowestPoints: round.lowestPoints,
          poolSize: round.poolSize,
          notes: round.notes,
          isEstimated: round.isEstimated,
          source: round.source,
        }))
      : eoiRounds.rounds.map((round) => ({
          ...round,
          poolSize: round.poolSize ?? null,
          notes: round.notes ?? null,
          isEstimated: round.isEstimated ?? false,
          source: round.source ?? "DoHA Official",
        }));

  const latestScraped =
    dbRounds.length > 0
      ? dbRounds
          .map((r) => r.createdAt)
          .sort((a, b) => b.getTime() - a.getTime())[0]
      : null;

  const lastScrapedLabel = latestScraped
    ? latestScraped.toLocaleString("en-AU", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : `${eoiRounds.lastUpdated} (seed data)`;

  const seoContent = getInvitationRoundsSeoContent(locale);
  const schemaJson = buildInvitationRoundsSchema(locale);

  return (
    <>
      <div className="mx-auto max-w-5xl px-4 py-10 pt-28">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
              SkillSelect Data
            </span>
            <span className="text-xs text-slate-400">Last scraped {lastScrapedLabel}</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Invitation Round Tracker</h1>
          <p className="mt-2 max-w-2xl text-base text-slate-500">
            Historical points cutoffs and invitation volumes for Australian skilled migration
            (subclasses 189 and 491 Family Sponsored).
          </p>
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Data sourced from official DoHA SkillSelect invitation rounds page. Last verified: November 2025.
          </p>
        </div>

        <InvitationRoundsClient rounds={rounds} occupationPoints={occupationPointsCutoff} />
      </div>
      <SeoContentSection {...seoContent} schemaJson={schemaJson} />
    </>
  );
}
