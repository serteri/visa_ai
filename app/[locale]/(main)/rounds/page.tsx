import { Calendar, MapPin, Send } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { isMissingRelationError } from "@/lib/db/missing-relation";
import { getTranslations, t } from "@/lib/i18n/get-translations";
import { isValidLocale } from "@/lib/i18n/config";

export const revalidate = 300;

type FeedRound = {
  id: string;
  occupation: string;
  subclass: string;
  state: string;
  location: string;
  points: number;
  dateOfEffect: string;
  roundDate: string;
};

// InvitationFeedItem (see prisma/schema.prisma) has no admin-write path yet
// -- may not exist live at all (until `npx prisma db push` is run) or may
// exist but be empty. Both degrade to an empty array here, same pattern
// used throughout this app for not-yet-migrated/not-yet-seeded tables.
async function getInvitationFeed(): Promise<FeedRound[]> {
  try {
    const rows = await prisma.invitationFeedItem.findMany({ orderBy: { roundDate: "desc" } });
    return rows.map((row) => ({
      id: row.id,
      occupation: row.occupation,
      subclass: row.subclass,
      state: row.state,
      location: row.location,
      points: row.points,
      dateOfEffect: row.dateOfEffect.toISOString(),
      roundDate: row.roundDate.toISOString(),
    }));
  } catch (error) {
    if (isMissingRelationError(error, "invitation_feed_items")) return [];
    throw error;
  }
}

function locationBadgeClass(location: string): string {
  return location === "Onshore"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-sky-200 bg-sky-50 text-sky-700";
}

type PageProps = { params: Promise<{ locale: string }> };

export default async function InvitationRoundsPage({ params }: PageProps) {
  const { locale } = await params;
  const translations = await getTranslations(isValidLocale(locale) ? locale : "en");
  const rounds = await getInvitationFeed();

  const dateFormatter = new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" });

  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell max-w-3xl space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            {t(translations, "nav.invitationRounds", "Invitation Rounds")}
          </p>
          <h1 className="text-3xl font-bold text-slate-900">{t(translations, "rounds.title", "Invitation Rounds")}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {t(
              translations,
              "rounds.subtitle",
              "The latest skilled migration invitation rounds, most recent first."
            )}
          </p>
        </div>

        {rounds.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              {t(translations, "rounds.empty", "No recent rounds found.")}
            </p>
          </div>
        ) : (
          <ol className="space-y-4">
            {rounds.map((round) => (
              <li
                key={round.id}
                className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                  <Send className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{round.occupation}</p>
                    <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                      {t(translations, `visas.subclass.${round.subclass}`, `Subclass ${round.subclass}`)}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${locationBadgeClass(round.location)}`}>
                      {round.location === "Onshore"
                        ? t(translations, "rounds.onshore", "Onshore")
                        : t(translations, "rounds.offshore", "Offshore")}
                    </span>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {round.state}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {t(translations, "rounds.roundDateLabel", "Round Date")}: {dateFormatter.format(new Date(round.roundDate))}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {t(translations, "rounds.dateOfEffectLabel", "Date of Effect")}: {dateFormatter.format(new Date(round.dateOfEffect))}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-2xl font-bold text-slate-900">{round.points}</p>
                  <p className="text-xs font-medium text-slate-400">
                    {t(translations, "rounds.pointsLabel", "Points")}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
