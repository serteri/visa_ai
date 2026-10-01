/**
 * Creates chat_visitor_profiles (prisma/schema.prisma: ChatVisitorProfile), the in-chat quick profile card's store.
 * Idempotent (CREATE TABLE IF NOT EXISTS) and additive: touches no existing table.
 *
 * DATABASE_URL is production (docs/database-environments.md), so running this is a production write: it needs an
 * explicit go-ahead. Until it has run, the card's save returns "profile_unavailable" and chat answers are unaffected
 * (lib/chat/quick-profile.ts treats a missing table as "no profile").
 *
 *   npx tsx scripts/add-chat-profile-table.ts
 */
import { PrismaClient } from "@prisma/client";

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS chat_visitor_profiles (
     visitor_id TEXT PRIMARY KEY,
     input_json JSONB NOT NULL,
     report_json JSONB NOT NULL,
     created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP(3) NOT NULL
   )`,
];

async function main() {
  const db = new PrismaClient();
  try {
    for (const sql of STATEMENTS) await db.$executeRawUnsafe(sql);
    console.log(`Applied ${STATEMENTS.length} idempotent statement(s).`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
