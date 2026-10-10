-- Creates referral_consents: the client's consent to share their details with the referring agent.
-- APPEND-ONLY: a database trigger rejects UPDATE and DELETE. A withdrawal is a new row (event = 'withdrawn'); the current state of a
-- (report, agent) pair is its newest row. Nothing else is touched: CREATE ... IF NOT EXISTS / CREATE OR REPLACE on names that are new.
-- Safe to run twice. One transaction: all or nothing.
-- Until this runs, no agent can see any client's details (fail closed) and the consent checkbox is not shown on the form.
BEGIN;

CREATE TABLE IF NOT EXISTS referral_consents (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  report_id text NOT NULL,
  agent_id text NOT NULL,
  event text NOT NULL CHECK (event IN ('granted', 'withdrawn')),
  consent_text_version text NOT NULL,
  consent_text text NOT NULL,
  locale text NOT NULL,
  ip_hash text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS referral_consents_report_agent_idx ON referral_consents (report_id, agent_id, created_at DESC);

CREATE OR REPLACE FUNCTION referral_consents_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'referral_consents is append-only (% is not allowed)', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS referral_consents_no_update_delete ON referral_consents;
CREATE TRIGGER referral_consents_no_update_delete
  BEFORE UPDATE OR DELETE ON referral_consents
  FOR EACH ROW EXECUTE FUNCTION referral_consents_append_only();

COMMIT;
