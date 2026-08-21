import { prisma } from "@/lib/prisma";
import { isMissingRelationError } from "@/lib/db/missing-relation";
import { getTranslations, t } from "@/lib/i18n/get-translations";
import { isValidLocale } from "@/lib/i18n/config";
import { EOI_CATEGORIES, type EoiCategory, type OccupationStatRow } from "@/lib/constants/eoi-queue";
import { EoiQueueClient } from "./EoiQueueClient";

export const revalidate = 300;

function isEoiCategory(value: string): value is Exclude<EoiCategory, "ALL"> {
  return (EOI_CATEGORIES as readonly string[]).includes(value) && value !== "ALL";
}

// OccupationStat (see prisma/schema.prisma) has no admin-write path yet --
// the table may not exist in the live database at all (until `npx prisma
// db push` is run) or may exist but be empty. Both degrade to an empty
// array here rather than 500ing, same isMissingRelationError pattern used
// throughout this app for not-yet-migrated tables.
async function getOccupationStats(): Promise<OccupationStatRow[]> {
  try {
    const rows = await prisma.occupationStat.findMany({ orderBy: { title: "asc" } });
    return rows
      .filter((row) => isEoiCategory(row.tier))
      .map((row) => ({
        id: row.id,
        anzscoCode: row.anzscoCode,
        title: row.title,
        tier: row.tier as Exclude<EoiCategory, "ALL">,
        pool189: row.pool189,
        pool190: row.pool190,
        cutoff189: row.cutoff189,
        avgWaitMonths: row.avgWaitMonths,
        trend: row.trend as OccupationStatRow["trend"],
      }));
  } catch (error) {
    if (isMissingRelationError(error, "occupation_stats")) return [];
    throw error;
  }
}

type PageProps = { params: Promise<{ locale: string }> };

export default async function EoiQueuePage({ params }: PageProps) {
  const { locale } = await params;
  const translations = await getTranslations(isValidLocale(locale) ? locale : "en");
  const rows = await getOccupationStats();

  return (
    <main className="ambient-bg flex-1 py-12">
      <section className="section-shell space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            {t(translations, "nav.eoiQueue", "EOI Queue")}
          </p>
          <h1 className="text-3xl font-bold text-slate-900">{t(translations, "eoiQueue.title", "EOI Queue")}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {t(
              translations,
              "eoiQueue.subtitle",
              "See how many Expressions of Interest are sitting in the pool for each occupation, the latest 189 cutoff, and whether the trend is improving or worsening."
            )}
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              {t(translations, "eoiQueue.noDataYet", "No data available yet.")}
            </p>
          </div>
        ) : (
          <EoiQueueClient rows={rows} />
        )}
      </section>
    </main>
  );
}
