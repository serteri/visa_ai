import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  await sql`ALTER TABLE user_reports ADD COLUMN IF NOT EXISTS ip_address TEXT`;
  console.log("✅ ip_address column added to user_reports");
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
