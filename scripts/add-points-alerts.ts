import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS points_alerts (
      id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
      email         TEXT        NOT NULL,
      target_points INT         NOT NULL,
      visa_subclass TEXT        NOT NULL,
      is_active     BOOLEAN     NOT NULL DEFAULT true,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_triggered TIMESTAMPTZ
    )
  `;
  console.log("Created points_alerts table");

  // Baseline the migration so Prisma stops complaining
  await sql`
    INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
    VALUES (
      gen_random_uuid()::text,
      'baseline_points_alerts',
      now(),
      '20250512010000_add_points_alerts',
      NULL,
      NULL,
      now(),
      1
    )
    ON CONFLICT DO NOTHING
  `;
  console.log("Registered migration");
}

main().catch(console.error);
