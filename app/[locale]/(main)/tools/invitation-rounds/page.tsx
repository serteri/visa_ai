import { pageAlternates, publicUrl, SITE_ORIGIN } from "@/lib/seo/urls";
import type { Metadata } from "next";
import { InvitationRoundsClient } from "./InvitationRoundsClient";
import { SeoContentSection } from "@/components/SeoContentSection";
import { getInvitationRoundsSeoContent, buildInvitationRoundsSchema } from "@/lib/seo/invitation-rounds-content";
import eoiRounds from "@/src/data/eoi-rounds.json";
import occupationPointsCutoff from "@/src/data/occupation-points-cutoff.json";
import { getCachedInvitationRounds } from "@/lib/cache/public-read-models";
import { normaliseDbRounds, type RoundView } from "@/lib/invitation-rounds/normalise";

const BASE_URL = SITE_ORIGIN;

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = new URL(BASE_URL);

  return {
    metadataBase: siteUrl,
    title: "Australia SkillSelect Invitation Rounds | Points Tracker",
    description:
      "Track Australian skilled migration invitation rounds. See historical points cutoffs for subclass 189, 190 and 491 visas.",
    alternates: pageAlternates(locale, `/tools/invitation-rounds`),
    openGraph: {
      title: "Australia SkillSelect Invitation Rounds | Points Tracker",
      description:
        "Track Australian skilled migration invitation rounds. See historical points cutoffs for subclass 189, 190 and 491 visas.",
      type: "website",
      url: publicUrl(locale, `/tools/invitation-rounds`),
      images: [{ url: "/og/default-og.png", width: 1200, height: 630 }],
    },
  };
}

export default async function InvitationRoundsPage({ params }: PageProps) {
  const { locale } = await params;

  let dbRounds: Awaited<ReturnType<typeof getCachedInvitationRounds>> = [];
  try {
    dbRounds = await getCachedInvitationRounds();
  } catch (error) {
    console.error("Failed to load EOI rounds from database, using fallback JSON", error);
  }

  // unstable_cache returns JSON on a cache hit (Dates become strings), so the rows are normalised, never assumed to be Dates.
  const db = normaliseDbRounds(dbRounds);
  const rounds: RoundView[] =
    db.rounds.length > 0
      ? db.rounds
      : eoiRounds.rounds.map((round) => ({
          ...round,
          poolSize: round.poolSize ?? null,
          notes: round.notes ?? null,
          isEstimated: round.isEstimated ?? false,
          source: round.source ?? "DoHA Official",
        }));

  const latestScraped = db.rounds.length > 0 ? db.latestScraped : null;

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
      <div className="mx-auto max-w-5xl px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-[#53917E]/10 px-3 py-1 text-xs font-semibold text-[#53917E]">
              SkillSelect Data
            </span>
            <span className="text-xs text-slate-600">Last scraped {lastScrapedLabel}</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Invitation Round Tracker</h1>
          <p className="mt-2 max-w-2xl text-base text-slate-600">
            Historical points cutoffs and invitation volumes for Australian skilled migration
            (subclasses 189 and 491 Family Sponsored).
          </p>
          <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            Data sourced from official DoHA SkillSelect invitation rounds page. Last verified: November 2025.
          </p>
        </div>

        <InvitationRoundsClient rounds={rounds} occupationPoints={occupationPointsCutoff} />
      </div>
      <SeoContentSection {...seoContent} schemaJson={schemaJson} />
    </>
  );
}
