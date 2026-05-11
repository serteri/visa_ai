import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { join } from "path";

const sql = neon(process.env.DATABASE_URL!);

const migrationSql = readFileSync(
  join(process.cwd(), "drizzle", "0003_mute_raza.sql"),
  "utf-8"
);

// Split on drizzle's statement separator
const statements = migrationSql
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean);

async function run() {
  console.log(`Applying ${statements.length} statements...`);
  for (const statement of statements) {
    console.log(`Running: ${statement.slice(0, 60)}...`);
    try {
      await sql.query(statement);
      console.log("  ✓");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("already exists")) {
        console.log("  ⚠ Already exists, skipping");
      } else {
        throw err;
      }
    }
  }
  console.log("Migration complete.");
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
