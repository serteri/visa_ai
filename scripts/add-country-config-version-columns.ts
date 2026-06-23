import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  await sql`ALTER TABLE saved_calculations ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'AU'`;
  await sql`ALTER TABLE saved_calculations ADD COLUMN IF NOT EXISTS config_version TEXT`;
  console.log("✅ country and config_version columns added to saved_calculations");
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
