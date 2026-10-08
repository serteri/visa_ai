/**
 * Backfills full_check_waitlist from user_reports for the period the waitlist table did not exist (every full-check submission since then
 * wrote only to user_reports). Idempotent: each waitlist row reuses the report's id as its primary key and the insert is ON CONFLICT DO NOTHING,
 * so re-running never duplicates.
 *
 *   npx tsx scripts/backfill-full-check-waitlist.ts                        DRY RUN (default): reads production READ ONLY (PROD_DATABASE_URL), writes nothing
 *   npx tsx scripts/backfill-full-check-waitlist.ts --since 2026-07-01     only reports created on/after that date (default: all full_check reports)
 *   npx tsx scripts/backfill-full-check-waitlist.ts --apply                WRITES to production via DATABASE_URL, in one transaction
 *
 * --apply is a production write: run it only when you intend to. Fields the report does not store (english_test_taken) stay NULL; lead_score /
 * lead_tier / visa interest / locale come from the report row. Rows with no email are skipped.
 */
import { Prisma, PrismaClient } from "@prisma/client";
import { withProdReadOnly } from "./lib/prod-db";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const sinceIdx = args.indexOf("--since");
const since = sinceIdx >= 0 ? args[sinceIdx + 1] : undefined;
if (since && !/^\d{4}-\d{2}-\d{2}$/.test(since)) {
  console.error("--since must be YYYY-MM-DD");
  process.exit(2);
}

const num = (k: string) => `CASE WHEN ur.input_json->>'${k}' ~ '^[0-9]+(\\.[0-9]+)?$' THEN (ur.input_json->>'${k}')::real END`;
const bool = (k: string) => `CASE WHEN ur.input_json->>'${k}' IN ('true','false') THEN (ur.input_json->>'${k}')::boolean END`;
const txt = (k: string) => `NULLIF(ur.input_json->>'${k}', '')`;

const WHERE = `ur.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND ur.source = 'full_check' AND ur.email <> '' AND ($1::date IS NULL OR ur.created_at >= $1::date)`;

const SELECT_SQL = `
  SELECT ur.id::uuid AS id, ur.email, ur.full_name, COALESCE(${txt("preferredPathway")}, ur.preferred_path) AS visa_interest, ur.locale AS preferred_language,
    ${txt("currentCountry")} AS current_country, ${txt("passportCountry")} AS passport_country, ${txt("age")} AS age, ${txt("occupation")} AS occupation,
    ${txt("englishLevel")} AS english_level, ${txt("occupationConfirmed")} AS occupation_confirmed, ${txt("estimatedBudgetRange")} AS estimated_budget_range,
    ${txt("timeline")} AS timeline, ${bool("qualificationAwardedInAustralia")} AS qualification_awarded_in_australia,
    ${bool("qualificationRegionalAustralia")} AS qualification_regional_australia, ${txt("specialistEducationStemResponse")} AS specialist_education_stem_response,
    ${num("offshoreExperienceYears")} AS offshore_experience_years, ${num("onshoreExperienceYears")} AS onshore_experience_years,
    ${txt("sponsorOrFamily")} AS sponsor_or_family, ${txt("biggestConcern")} AS biggest_concern, ${txt("mainGoal")} AS main_goal,
    ur.lead_score, ur.lead_tier, ur.source, ur.created_at
  FROM user_reports ur
  WHERE ${WHERE}`;

const INSERT_SQL = `
  INSERT INTO full_check_waitlist (id, email, full_name, visa_interest, preferred_language, current_country, passport_country, age, occupation, english_level,
    occupation_confirmed, estimated_budget_range, timeline, qualification_awarded_in_australia, qualification_regional_australia,
    specialist_education_stem_response, offshore_experience_years, onshore_experience_years, sponsor_or_family, biggest_concern, main_goal,
    lead_score, lead_tier, source, created_at)
  SELECT * FROM (${SELECT_SQL}) s
  ON CONFLICT (id) DO NOTHING`;

async function dryRun() {
  await withProdReadOnly(async (tx) => {
    const exists = await tx.$queryRawUnsafe<{ t: string | null }[]>(`SELECT to_regclass('public.full_check_waitlist')::text AS t`);
    const candidates = await tx.$queryRawUnsafe<{ n: number | bigint; first: Date | null; last: Date | null }[]>(
      `SELECT COUNT(*) AS n, MIN(created_at) AS first, MAX(created_at) AS last FROM (${SELECT_SQL}) s`,
      since ?? null,
    );
    const already = exists[0]?.t
      ? await tx.$queryRawUnsafe<{ n: number | bigint }[]>(`SELECT COUNT(*) AS n FROM full_check_waitlist w WHERE w.id IN (SELECT id FROM (${SELECT_SQL}) s)`, since ?? null)
      : [{ n: 0 }];
    console.log("DRY RUN (nothing written)");
    console.log(`full_check_waitlist table: ${exists[0]?.t ? "exists" : "MISSING (create it first)"}`);
    console.log(`reports to consider${since ? ` since ${since}` : ""}: ${candidates[0].n}  (${candidates[0].first?.toISOString() ?? "-"} .. ${candidates[0].last?.toISOString() ?? "-"})`);
    console.log(`already in the waitlist (would be skipped): ${already[0].n}`);
    console.log(`would insert: ${Number(candidates[0].n) - Number(already[0].n)}`);
    console.log("Re-run with --apply to write.");
  });
}

async function applyBackfill() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const db = new PrismaClient({ datasources: { db: { url } } });
  try {
    const inserted = await db.$transaction(async (tx: Prisma.TransactionClient) => tx.$executeRawUnsafe(INSERT_SQL, since ?? null));
    console.log(`APPLIED: inserted ${inserted} row(s) into full_check_waitlist (existing rows untouched; re-running inserts 0).`);
  } finally {
    await db.$disconnect();
  }
}

(apply ? applyBackfill() : dryRun()).catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
