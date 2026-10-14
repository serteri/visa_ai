-- Part 1 + 2 of the admin-data design (docs/admin-data-design.md): the tables behind the CRM admin "State nomination" page.
--   state_programs            one row per state per program year (exactly one is_current per state)
--   state_program_subclasses  per subclass: availability, allocation, nomination fee excl./incl. GST
--   admin_audit_log           who changed what, when (old -> new), shared with the authorities page (Part 3, later)
-- New names only: CREATE TABLE / INDEX IF NOT EXISTS. Nothing existing is altered or dropped (the four Drizzle-owned @@ignore tables are untouched).
-- Safe to run twice. One transaction: all or nothing.
-- Rollback:  DROP TABLE admin_audit_log; DROP TABLE state_program_subclasses; DROP TABLE state_programs;
-- Until the seed (scripts/seed-admin-data.ts --execute) has run, the readers use the bundled seed, so reports and the chat are unchanged.
BEGIN;

CREATE TABLE IF NOT EXISTS state_programs (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  state_code text NOT NULL,
  program_year text NOT NULL,
  is_current boolean NOT NULL DEFAULT true,
  state_name text NOT NULL,
  status text NOT NULL,
  status_changed_at timestamptz,
  opening_date date,
  closing_date date,
  official_url text,
  extra_urls text[] NOT NULL DEFAULT '{}',
  exceptions jsonb,
  notes jsonb NOT NULL,
  ai_summary jsonb NOT NULL,
  conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  scoring jsonb NOT NULL,
  source_text text NOT NULL DEFAULT '',
  last_verified_at timestamptz NOT NULL,
  last_verified_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text,
  UNIQUE (state_code, program_year)
);

CREATE UNIQUE INDEX IF NOT EXISTS state_programs_one_current_idx ON state_programs (state_code) WHERE is_current;

CREATE TABLE IF NOT EXISTS state_program_subclasses (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  state_program_id text NOT NULL REFERENCES state_programs (id) ON DELETE CASCADE,
  subclass text NOT NULL,
  availability text NOT NULL DEFAULT 'inherit',
  allocation integer,
  allocation_used integer,
  fee_excl_gst numeric(10, 2),
  fee_incl_gst numeric(10, 2),
  gst_basis text NOT NULL DEFAULT 'not_stated',
  fee_note jsonb,
  effective_from date,
  UNIQUE (state_program_id, subclass)
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  at timestamptz NOT NULL DEFAULT now(),
  actor_id text,
  actor_email text,
  actor_label text NOT NULL,
  entity_type text NOT NULL,
  entity_key text NOT NULL,
  field_path text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  action text NOT NULL,
  document_id text,
  note text
);

CREATE INDEX IF NOT EXISTS admin_audit_log_entity_idx ON admin_audit_log (entity_type, entity_key, at DESC);

COMMIT;
