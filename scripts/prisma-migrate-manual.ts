import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

const STATEMENTS = [
  // Drop old tables
  `DROP TABLE IF EXISTS "saved_calculations" CASCADE`,
  `DROP TABLE IF EXISTS "saved_quiz_results" CASCADE`,
  `DROP TABLE IF EXISTS "saved_reports" CASCADE`,
  `DROP TABLE IF EXISTS "visa_tracking" CASCADE`,
  `DROP TABLE IF EXISTS "user_profiles" CASCADE`,
  `DROP TABLE IF EXISTS "sessions" CASCADE`,
  `DROP TABLE IF EXISTS "accounts" CASCADE`,
  `DROP TABLE IF EXISTS "verification_tokens" CASCADE`,
  `DROP TABLE IF EXISTS "users" CASCADE`,

  // users
  `CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "email_verified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX "users_email_key" ON "users"("email")`,

  // accounts
  `CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id")`,
  `ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,

  // sessions
  `CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token")`,
  `ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,

  // verification_tokens
  `CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
  )`,
  `CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token")`,
  `CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token")`,

  // saved_calculations
  `CREATE TABLE "saved_calculations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "visa_subclass" TEXT,
    "total_points" INTEGER NOT NULL,
    "breakdown" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "saved_calculations_pkey" PRIMARY KEY ("id")
  )`,
  `ALTER TABLE "saved_calculations" ADD CONSTRAINT "saved_calculations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,

  // saved_quiz_results
  `CREATE TABLE "saved_quiz_results" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "score" INTEGER,
    "readiness_level" TEXT,
    "answers" JSONB,
    "recommendations" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "saved_quiz_results_pkey" PRIMARY KEY ("id")
  )`,
  `ALTER TABLE "saved_quiz_results" ADD CONSTRAINT "saved_quiz_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,

  // saved_reports
  `CREATE TABLE "saved_reports" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "report_type" TEXT NOT NULL DEFAULT 'full_check',
    "report_url" TEXT,
    "report_data" JSONB,
    "language" TEXT NOT NULL DEFAULT 'en',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "saved_reports_pkey" PRIMARY KEY ("id")
  )`,
  `ALTER TABLE "saved_reports" ADD CONSTRAINT "saved_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,

  // visa_tracking
  `CREATE TABLE "visa_tracking" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "visa_subclass" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planning',
    "notes" TEXT,
    "target_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "visa_tracking_pkey" PRIMARY KEY ("id")
  )`,
  `ALTER TABLE "visa_tracking" ADD CONSTRAINT "visa_tracking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,

  // Prisma migration history
  `CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" VARCHAR(36) NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
  )`,
  `INSERT INTO "_prisma_migrations" ("id","checksum","finished_at","migration_name","logs","rolled_back_at","started_at","applied_steps_count")
   VALUES (gen_random_uuid()::text,'manual-20250512',now(),'20250512000000_add_auth_and_dashboard_tables',NULL,NULL,now(),1)
   ON CONFLICT DO NOTHING`,
];

async function run() {
  console.log(`Running ${STATEMENTS.length} statements...`);
  for (let i = 0; i < STATEMENTS.length; i++) {
    const stmt = STATEMENTS[i].trim();
    const preview = stmt.split("\n")[0].slice(0, 60);
    try {
      await sql.query(stmt);
      console.log(`  [${i + 1}/${STATEMENTS.length}] ✓  ${preview}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("already exists") || msg.includes("does not exist")) {
        console.log(`  [${i + 1}/${STATEMENTS.length}] ⚠  ${preview} (skipped: ${msg.split("\n")[0]})`);
      } else {
        console.error(`  [${i + 1}/${STATEMENTS.length}] ✗  ${preview}`);
        throw err;
      }
    }
  }
  console.log("\n✓ Migration complete.");
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
