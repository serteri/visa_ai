import type { Metadata } from "next";
import { InvitationRoundsClient } from "./InvitationRoundsClient";
import eoiRounds from "@/src/data/eoi-rounds.json";

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
  await params;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 pt-28">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
            SkillSelect Data
          </span>
          <span className="text-xs text-slate-400">Last updated {eoiRounds.lastUpdated}</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Invitation Round Tracker</h1>
        <p className="mt-2 max-w-2xl text-base text-slate-500">
          Historical points cutoffs and invitation volumes for Australian skilled migration
          (subclasses 189, 190 &amp; 491). Data is indicative — verify with the Department of
          Home Affairs.
        </p>
      </div>

      <InvitationRoundsClient rounds={eoiRounds.rounds} />
    </div>
  );
}
