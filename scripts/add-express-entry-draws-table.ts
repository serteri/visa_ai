import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS "express_entry_draws" (
      "id" TEXT NOT NULL,
      "draw_date" TIMESTAMP(3) NOT NULL,
      "program_type" TEXT NOT NULL,
      "crs_score_cutoff" INTEGER,
      "invitations_issued" INTEGER NOT NULL,
      "tie_break_rule" TIMESTAMP(3),
      "is_estimated" BOOLEAN NOT NULL DEFAULT false,
      "source" TEXT NOT NULL DEFAULT 'scraper',
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "express_entry_draws_pkey" PRIMARY KEY ("id")
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS "express_entry_draws_draw_date_program_type_key" ON "express_entry_draws"("draw_date", "program_type")`;
  console.log("✅ express_entry_draws table created");
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
