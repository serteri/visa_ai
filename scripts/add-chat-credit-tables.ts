/**
 * Creates the four chat-credit tables (prisma/schema.prisma: ChatCreditPurchase, ChatCreditLink, ChatRestoreToken,
 * ChatRestoreRequest). Idempotent (CREATE TABLE IF NOT EXISTS) and additive: touches no existing table.
 *
 * DATABASE_URL is production (docs/database-environments.md), so running this is a production write: it needs an
 * explicit go-ahead. Run it BEFORE deploying the code that reads these tables.
 *
 *   npx tsx scripts/add-chat-credit-tables.ts
 */
import { PrismaClient } from "@prisma/client";

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS chat_credit_purchases (
     id TEXT PRIMARY KEY,
     stripe_session_id TEXT NOT NULL UNIQUE,
     email TEXT,
     visitor_id TEXT NOT NULL,
     credits INTEGER NOT NULL,
     created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE INDEX IF NOT EXISTS chat_credit_purchases_email_idx ON chat_credit_purchases (email)`,
  `CREATE TABLE IF NOT EXISTS chat_credit_links (
     id TEXT PRIMARY KEY,
     email TEXT NOT NULL,
     visitor_id TEXT NOT NULL,
     verified BOOLEAN NOT NULL DEFAULT false,
     created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS chat_credit_links_email_visitor_id_key ON chat_credit_links (email, visitor_id)`,
  `CREATE INDEX IF NOT EXISTS chat_credit_links_visitor_id_idx ON chat_credit_links (visitor_id)`,
  `CREATE TABLE IF NOT EXISTS chat_restore_tokens (
     id TEXT PRIMARY KEY,
     token_hash TEXT NOT NULL UNIQUE,
     email TEXT NOT NULL,
     expires_at TIMESTAMP(3) NOT NULL,
     used_at TIMESTAMP(3),
     created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE TABLE IF NOT EXISTS chat_restore_requests (
     id TEXT PRIMARY KEY,
     email TEXT NOT NULL,
     ip_address TEXT,
     created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE INDEX IF NOT EXISTS chat_restore_requests_email_created_at_idx ON chat_restore_requests (email, created_at)`,
  `CREATE INDEX IF NOT EXISTS chat_restore_requests_ip_address_created_at_idx ON chat_restore_requests (ip_address, created_at)`,
];

async function main() {
  const db = new PrismaClient();
  try {
    for (const sql of STATEMENTS) await db.$executeRawUnsafe(sql);
    console.log(`Applied ${STATEMENTS.length} idempotent statements.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
