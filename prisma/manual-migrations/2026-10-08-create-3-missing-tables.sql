-- Creates the three tables production lacks: full_check_waitlist, leads, full_check_usage.
-- Definitions are copied from db/schema.ts (they are Drizzle-owned; there is no Prisma model for them).
-- db/schema.ts declares NO indexes, unique constraints or foreign keys on these three tables, so there are none to add.
-- Touches nothing else: every statement is CREATE TABLE IF NOT EXISTS on one of these three names. One transaction: all or nothing.
BEGIN;

CREATE TABLE IF NOT EXISTS full_check_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  full_name text,
  visa_interest text,
  preferred_language text,
  current_country text,
  passport_country text,
  age text,
  occupation text,
  english_level text,
  english_test_taken text,
  occupation_confirmed text,
  estimated_budget_range text,
  timeline text,
  qualification_awarded_in_australia boolean,
  qualification_regional_australia boolean,
  specialist_education_stem_response text,
  offshore_experience_years real,
  onshore_experience_years real,
  sponsor_or_family text,
  biggest_concern text,
  main_goal text,
  lead_score integer,
  lead_tier text,
  source text DEFAULT 'full_check',
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text DEFAULT 'full_check',
  full_name text,
  email text NOT NULL,
  preferred_language text,
  current_country text,
  passport_country text,
  age text,
  occupation text,
  english_level text,
  english_test_taken text,
  occupation_confirmed text,
  estimated_budget_range text,
  timeline text,
  qualification_awarded_in_australia boolean,
  qualification_regional_australia boolean,
  specialist_education_stem_response text,
  offshore_experience_years real,
  onshore_experience_years real,
  sponsor_or_family text,
  biggest_concern text,
  main_goal text,
  selected_visa text,
  system_score integer,
  lead_score integer,
  lead_tier text,
  report_id uuid,
  report_locale text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS full_check_usage (
  id integer PRIMARY KEY DEFAULT 1,
  free_reports_used integer DEFAULT 0,
  free_limit integer DEFAULT 50,
  is_free_active boolean DEFAULT true,
  updated_at timestamp DEFAULT now()
);

COMMIT;
