-- Affiliate commission ledger. New table, additive-only.
CREATE TABLE IF NOT EXISTS "transactions" (
  "id" TEXT PRIMARY KEY,
  "lead_id" TEXT NOT NULL REFERENCES "user_reports"("id") ON DELETE CASCADE,
  "agent_id" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "stripe_session_id" TEXT NOT NULL UNIQUE,
  "total_amount" DECIMAL(10,2) NOT NULL,
  "commission_rate" DECIMAL(5,4),
  "commission_amount" DECIMAL(10,2),
  "created_at" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "transactions_agent_id_idx" ON "transactions" ("agent_id");
CREATE INDEX IF NOT EXISTS "transactions_lead_id_idx" ON "transactions" ("lead_id");
