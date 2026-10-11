-- Creates the two tables of the state-page change monitor (lib/state-monitor): one row per monitored official page, and one row per run.
-- Nothing else is touched: CREATE TABLE / INDEX IF NOT EXISTS on names that are new. Safe to run twice. One transaction: all or nothing.
-- Until this runs the monitor cannot store anything (its runs fail and say so); reports fall back to the date the state data was last verified by hand.
BEGIN;

CREATE TABLE IF NOT EXISTS state_page_monitor (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  state_code text NOT NULL,
  url text NOT NULL,
  content_hash text,
  snippet text,
  normalized_text text,
  content_length integer,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_checked_at timestamptz,
  last_success_at timestamptz,
  change_detected_at timestamptz,
  change_summary text,
  change_alerted_at timestamptz,
  change_applied_at timestamptz,
  consecutive_failures integer NOT NULL DEFAULT 0,
  last_error text,
  failure_alerted_at timestamptz,
  UNIQUE (state_code, url)
);

CREATE TABLE IF NOT EXISTS state_monitor_runs (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  trigger text NOT NULL,
  pages_checked integer NOT NULL DEFAULT 0,
  pages_changed integer NOT NULL DEFAULT 0,
  pages_failed integer NOT NULL DEFAULT 0,
  alerts_sent integer NOT NULL DEFAULT 0,
  detail text,
  error text
);

CREATE INDEX IF NOT EXISTS state_monitor_runs_started_idx ON state_monitor_runs (started_at DESC);

COMMIT;
