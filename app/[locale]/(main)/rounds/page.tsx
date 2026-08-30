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
  /** Null when the source file had no valid date cell for this row -- never a fabricated "today". */
  dateOfEffect: string | null;
};

type VolumeRow = {
  id: string;
  stream: string;
  subclass: string;
  year: string;
  month: string;
  count: number;
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
      dateOfEffect: row.dateOfEffect ? row.dateOfEffect.toISOString() : null,
    }));
  } catch (error) {
    if (isMissingRelationError(error, "invitation_feed_items")) return [];
    throw error;
  }
}

// InvitationVolume (see prisma/schema.prisma) is newer still than
// InvitationFeedItem -- same missing-table fallback.
async function getInvitationVolumes(): Promise<VolumeRow[]> {
  try {
    const rows = await prisma.invitationVolume.findMany({ orderBy: [{ stream: "asc" }, { month: "asc" }] });
    return rows.map((row) => ({
      id: row.id,
      stream: row.stream,
      subclass: row.subclass,
      year: row.year,
      month: row.month,
      count: row.count,
    }));
  } catch (error) {
    if (isMissingRelationError(error, "invitation_volumes")) return [];
    throw error;
  }
}

/** Groups volume rows by `year`, most recent program year first ("Unknown" always last since it isn't a real, sortable year). */
function groupVolumesByYear(volumes: VolumeRow[]): Array<{ year: string; rows: VolumeRow[] }> {
  const byYear = new Map<string, VolumeRow[]>();
  for (const row of volumes) {
    const existing = byYear.get(row.year) ?? [];
    existing.push(row);
    byYear.set(row.year, existing);
  }

  return Array.from(byYear.entries())
    .map(([year, rows]) => ({ year, rows }))
    .sort((a, b) => {
      if (a.year === "Unknown") return 1;
      if (b.year === "Unknown") return -1;
      return b.year.localeCompare(a.year);
    });
}

function locationBadgeClass(location: string): string {
  return location === "Onshore"
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
    : "border-[#53917E]/30 bg-[#53917E]/10 text-[#53917E]";
}

/** DD/MM/YYYY, per this task's explicit example format ("16/05/2026") -- not locale-dependent Intl formatting. */
function formatDateOfEffect(iso: string): string {
  const date = new Date(iso);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getUTCFullYear()}`;
}

type PageProps = { params: Promise<{ locale: string }> };

export default async function InvitationRoundsPage({ params }: PageProps) {
  const { locale } = await params;
  const translations = await getTranslations(isValidLocale(locale) ? locale : "en");
  const [rounds, volumes] = await Promise.all([getInvitationFeed(), getInvitationVolumes()]);
  const volumesByYear = groupVolumesByYear(volumes);

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
          <div className="rounded-xl border border-slate-200 bg-card px-6 py-16 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-600">
              {t(translations, "rounds.empty", "No recent rounds found.")}
            </p>
          </div>
        ) : (
          <ol className="space-y-4">
            {rounds.map((round) => (
              <li
                key={round.id}
                className="flex items-start gap-4 rounded-xl border border-slate-200 bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#53917E]/10 text-slate-500">
                  <Send className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold leading-snug text-slate-900">{round.occupation}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#53917E]/30 bg-[#53917E]/10 px-2 py-0.5 text-xs font-medium text-slate-500">
                      {t(translations, `visas.subclass.${round.subclass}`, `Subclass ${round.subclass}`)}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${locationBadgeClass(round.location)}`}>
                      {round.location === "Onshore"
                        ? t(translations, "rounds.onshore", "Onshore")
                        : t(translations, "rounds.offshore", "Offshore")}
                    </span>
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {round.state}
                  </p>
                  {round.dateOfEffect && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                      <Calendar className="h-3.5 w-3.5" />
                      {t(translations, "rounds.dateOfEffectLabel", "Latest Submission Date")}: {formatDateOfEffect(round.dateOfEffect)}
                    </p>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-2xl font-bold text-slate-900">{round.points}</p>
                  <p className="text-xs font-medium text-slate-600">
                    {t(translations, "rounds.cutoffLabel", "Cut-off")}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}

        {volumesByYear.length > 0 && (
          <div className="space-y-6 pt-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">
                {t(translations, "rounds.volumeTitle", "State Invitation Volumes")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t(translations, "rounds.volumeSubtitle", "Monthly invitations issued by stream and visa subclass.")}
              </p>
            </div>

            {volumesByYear.map(({ year, rows }) => (
              <div key={year} className="space-y-3">
                <h3 className="text-base font-semibold text-slate-900">
                  {year === "Unknown"
                    ? t(translations, "rounds.yearUnknown", "Program Year Unknown")
                    : t(translations, "rounds.programYear", "{{year}} Program Year").replace("{{year}}", year)}
                </h3>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-card shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-[#EEF5DB] text-left">
                          <th className="px-4 py-3 font-semibold text-slate-600">
                            {t(translations, "rounds.table.stream", "Stream")}
                          </th>
                          <th className="px-4 py-3 font-semibold text-slate-600">
                            {t(translations, "rounds.table.subclass", "Visa Subclass")}
                          </th>
                          <th className="px-4 py-3 font-semibold text-slate-600">
                            {t(translations, "rounds.table.month", "Month")}
                          </th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-600">
                            {t(translations, "rounds.table.invitationsIssued", "Invitations Issued")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((volume) => (
                          <tr key={volume.id} className="border-b border-slate-200 last:border-0 hover:bg-[#53917E]/10">
                            <td className="px-4 py-3 text-slate-600">{volume.stream}</td>
                            <td className="px-4 py-3">
                              <span className="rounded-full border border-[#53917E]/30 bg-[#53917E]/10 px-2 py-0.5 text-xs font-medium text-slate-500">
                                {t(translations, `visas.subclass.${volume.subclass}`, `Subclass ${volume.subclass}`)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{volume.month}</td>
                            <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900">
                              {volume.count.toLocaleString(locale)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
