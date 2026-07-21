import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  const sql = neon(process.env.DATABASE_URL);
  const result = await sql`SELECT current_database(), current_user, now()`;
  console.log("Connection OK:", result);

  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('full_check_waitlist', 'user_reports', 'full_check_usage')
    ORDER BY table_name
  `;
  console.log("Relevant tables present:", tables);
}

main().catch((err) => {
  console.error("Connection FAILED:", err);
  process.exit(1);
});
