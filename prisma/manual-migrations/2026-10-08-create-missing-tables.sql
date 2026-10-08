-- Idempotent creation of every table the code expects. Safe to re-run: nothing is dropped, altered or overwritten;
-- tables, indexes and constraints that already exist are skipped. Run it once against production (see docs/missing-tables.md).
--
-- Part 1: Drizzle-owned tables declared in db/schema.ts (the live database does not have them yet, per CLAUDE.md).
-- Part 2: every Prisma model in prisma/schema.prisma (generated with `prisma migrate diff --from-empty`, then made idempotent).
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector; -- pgvector (Neon: supported); needed by the embedding column below

CREATE TABLE IF NOT EXISTS visa_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subclass text NOT NULL UNIQUE,
  visa_name text NOT NULL,
  category text NOT NULL,
  purpose text,
  stay_period text,
  cost text,
  work_rights text,
  source_url text,
  last_checked date,
  reviewed_status text DEFAULT 'needs_review',
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS visa_structured_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visa_type_id uuid NOT NULL REFERENCES visa_types(id),
  key_requirements jsonb,
  documents_required jsonb,
  application_steps jsonb,
  visa_conditions jsonb,
  risks jsonb,
  english_requirements jsonb,
  financial_requirements jsonb,
  raw_json jsonb,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS source_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visa_type_id uuid NOT NULL REFERENCES visa_types(id),
  source_url text NOT NULL,
  pdf_snapshot_url text,
  raw_text text,
  captured_at timestamp DEFAULT now(),
  content_hash text,
  notes text
);

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
INSERT INTO full_check_usage (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Part 2: Prisma models
-- CreateSchema

-- CreateExtension

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_reports" (
    "id" TEXT NOT NULL,
    "full_name" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "preferred_path" TEXT,
    "source" TEXT NOT NULL DEFAULT 'full_check',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "lead_score" INTEGER,
    "lead_tier" TEXT,
    "payment_status" TEXT NOT NULL DEFAULT 'pending',
    "unlock_method" TEXT,
    "is_unlocked" BOOLEAN NOT NULL DEFAULT false,
    "pdf_sent" BOOLEAN NOT NULL DEFAULT false,
    "report_json" JSONB NOT NULL,
    "input_json" JSONB NOT NULL,
    "agent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlocked_at" TIMESTAMP(3),
    "ip_address" TEXT,
    "points_tier" TEXT,
    "internal_lead_email_sent" BOOLEAN DEFAULT false,
    "doc_status" TEXT DEFAULT 'New',
    "agent_notes" TEXT,
    "market" TEXT DEFAULT 'GLOBAL',
    "assigned_via_ref" BOOLEAN DEFAULT false,
    "is_free_promo" BOOLEAN NOT NULL DEFAULT false,
    "preview_data" JSONB,

    CONSTRAINT "user_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "transactions" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT,
    "agent_id" TEXT,
    "buyer_email" TEXT,
    "stripe_session_id" TEXT NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "commission_rate" DECIMAL(5,4),
    "commission_amount" DECIMAL(10,2),
    "total_cents" INTEGER,
    "gst_cents" INTEGER,
    "currency" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "lead_notes" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "email_verified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "market" TEXT,
    "phone" TEXT,
    "company_name" TEXT,
    "address" TEXT,
    "commission_rate" DOUBLE PRECISION,
    "approval_status" TEXT NOT NULL DEFAULT 'APPROVED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "saved_calculations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "visa_subclass" TEXT,
    "total_points" INTEGER NOT NULL,
    "breakdown" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "country" TEXT NOT NULL DEFAULT 'AU',
    "config_version" TEXT,

    CONSTRAINT "saved_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "guide_downloads" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'tr',
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guide_downloads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "guide_config" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "max_downloads" INTEGER NOT NULL DEFAULT 20,

    CONSTRAINT "guide_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "saved_quiz_results" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "score" INTEGER,
    "readiness_level" TEXT,
    "answers" JSONB,
    "recommendations" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_quiz_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "saved_reports" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "report_type" TEXT NOT NULL DEFAULT 'full_check',
    "report_url" TEXT,
    "report_data" JSONB,
    "language" TEXT NOT NULL DEFAULT 'en',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "visa_tracking" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "visa_subclass" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planning',
    "notes" TEXT,
    "target_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visa_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "visa_journeys" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "visa_type" TEXT NOT NULL,
    "current_stage" TEXT NOT NULL DEFAULT 'PREPARATION',
    "progress_percentage" INTEGER NOT NULL DEFAULT 0,
    "stage_timestamps" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visa_journeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "visa_documents" (
    "id" TEXT NOT NULL,
    "journey_id" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "file_key" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "ai_feedback" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visa_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "occupation_stats" (
    "id" TEXT NOT NULL,
    "anzsco_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "pool_189" INTEGER NOT NULL DEFAULT 0,
    "pool_190" INTEGER NOT NULL DEFAULT 0,
    "cutoff_189" INTEGER,
    "avg_wait_months" INTEGER,
    "trend" TEXT NOT NULL DEFAULT 'STABLE',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "occupation_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "points_alerts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "target_points" INTEGER NOT NULL,
    "visa_subclass" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_triggered" TIMESTAMP(3),

    CONSTRAINT "points_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "eoi_rounds" (
    "id" TEXT NOT NULL,
    "round_date" TIMESTAMP(3) NOT NULL,
    "visa_subclass" TEXT NOT NULL,
    "visa_name" TEXT NOT NULL,
    "lowest_points" INTEGER,
    "invitations" INTEGER NOT NULL,
    "pool_size" INTEGER,
    "notes" TEXT,
    "is_estimated" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'scraper',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuing_authority" TEXT NOT NULL DEFAULT 'FEDERAL',
    "state" TEXT,
    "pathway" TEXT,
    "tier_breakdown" JSONB,

    CONSTRAINT "eoi_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "invitation_feed_items" (
    "id" TEXT NOT NULL,
    "occupation" TEXT NOT NULL,
    "subclass" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "date_of_effect" TIMESTAMP(3),
    "round_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitation_feed_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "scraper_sync_logs" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "last_run_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scraper_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "invitation_volumes" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "stream" TEXT NOT NULL,
    "subclass" TEXT NOT NULL,
    "year" TEXT NOT NULL DEFAULT 'Unknown',
    "month" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitation_volumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "express_entry_draws" (
    "id" TEXT NOT NULL,
    "draw_date" TIMESTAMP(3) NOT NULL,
    "program_type" TEXT NOT NULL,
    "crs_score_cutoff" INTEGER,
    "invitations_issued" INTEGER NOT NULL,
    "tie_break_rule" TIMESTAMP(3),
    "is_estimated" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'scraper',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "express_entry_draws_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ca_eoi_rounds" (
    "id" TEXT NOT NULL,
    "draw_number" INTEGER NOT NULL,
    "round_date" TIMESTAMP(3) NOT NULL,
    "draw_name" TEXT NOT NULL,
    "crs_score" INTEGER NOT NULL,
    "invitations" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'scraper',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ca_eoi_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "invitation_rounds" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "visaSubclass" TEXT NOT NULL,
    "totalInvited" INTEGER NOT NULL,
    "tieBreakDate" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitation_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "occupations" (
    "id" TEXT NOT NULL,
    "anzsco_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "occupations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "round_cutoffs" (
    "id" TEXT NOT NULL,
    "round_id" TEXT NOT NULL,
    "occupation_id" TEXT NOT NULL,
    "minimum_score" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "round_cutoffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "state_allocations" (
    "id" TEXT NOT NULL,
    "program_year" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "visa_subclass" TEXT NOT NULL,
    "allocation" INTEGER NOT NULL,
    "nominations_used" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "state_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "state_intelligence" (
    "id" TEXT NOT NULL,
    "state_code" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "official_note" TEXT,
    "source_url" TEXT,
    "last_verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "state_intelligence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "state_nomination_configs" (
    "id" TEXT NOT NULL,
    "state_code" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "supported_visas" TEXT[],
    "fee_aud" DOUBLE PRECISION,
    "custom_ai_note" TEXT,
    "official_website" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "state_nomination_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "state_occupation_list_entries" (
    "id" TEXT NOT NULL,
    "state_code" TEXT NOT NULL,
    "anzsco_code" TEXT,
    "occupation_title" TEXT NOT NULL,
    "visa_subclasses" TEXT[],
    "metadata" JSONB,
    "source_file" TEXT NOT NULL,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "state_occupation_list_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "chat_visitors" (
    "id" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "fingerprint" TEXT,
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "premium_credits" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_visitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "chat_credit_purchases" (
    "id" TEXT NOT NULL,
    "stripe_session_id" TEXT NOT NULL,
    "email" TEXT,
    "visitor_id" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_credit_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "chat_credit_links" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "visitor_id" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_credit_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "chat_visitor_profiles" (
    "visitor_id" TEXT NOT NULL,
    "input_json" JSONB NOT NULL,
    "report_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_visitor_profiles_pkey" PRIMARY KEY ("visitor_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "chat_restore_tokens" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_restore_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "chat_restore_requests" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_restore_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "chat_sessions" (
    "id" TEXT NOT NULL,
    "visitor_id" TEXT NOT NULL,
    "title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "chat_messages" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "document_chunks" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "embedding" vector(1536),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "campaigns" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slots_remaining" INTEGER NOT NULL DEFAULT 20,
    "price" INTEGER NOT NULL DEFAULT 999,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "contact_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "pdf_downloads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "pdf_slug" TEXT NOT NULL DEFAULT 'avustralya-pr-rehberi-2026',
    "is_paid" BOOLEAN DEFAULT false,
    "terms_accepted_at" TIMESTAMP(6) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pdf_downloads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "visa_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subclass" TEXT NOT NULL,
    "visa_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "purpose" TEXT,
    "stay_period" TEXT,
    "cost" TEXT,
    "work_rights" TEXT,
    "source_url" TEXT,
    "last_checked" DATE,
    "reviewed_status" TEXT DEFAULT 'needs_review',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visa_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "visa_structured_data" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "visa_type_id" UUID NOT NULL,
    "key_requirements" JSONB,
    "documents_required" JSONB,
    "application_steps" JSONB,
    "visa_conditions" JSONB,
    "risks" JSONB,
    "english_requirements" JSONB,
    "financial_requirements" JSONB,
    "raw_json" JSONB,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visa_structured_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "source_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "visa_type_id" UUID NOT NULL,
    "source_url" TEXT NOT NULL,
    "pdf_snapshot_url" TEXT,
    "raw_text" TEXT,
    "captured_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "content_hash" TEXT,
    "notes" TEXT,

    CONSTRAINT "source_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_reports_agent_id_points_tier_idx" ON "user_reports"("agent_id", "points_tier");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_reports_created_at_idx" ON "user_reports"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "transactions_stripe_session_id_key" ON "transactions"("stripe_session_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "transactions_agent_id_idx" ON "transactions"("agent_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "transactions_lead_id_idx" ON "transactions"("lead_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "transactions_buyer_email_idx" ON "transactions"("buyer_email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "lead_notes_lead_id_created_at_idx" ON "lead_notes"("lead_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "visa_journeys_user_id_idx" ON "visa_journeys"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "visa_documents_journey_id_idx" ON "visa_documents"("journey_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "occupation_stats_anzsco_code_key" ON "occupation_stats"("anzsco_code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "occupation_stats_tier_idx" ON "occupation_stats"("tier");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "eoi_rounds_round_date_visa_subclass_key" ON "eoi_rounds"("round_date", "visa_subclass");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "invitation_feed_items_round_date_idx" ON "invitation_feed_items"("round_date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "scraper_sync_logs_source_id_key" ON "scraper_sync_logs"("source_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "invitation_volumes_state_idx" ON "invitation_volumes"("state");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "invitation_volumes_year_idx" ON "invitation_volumes"("year");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "express_entry_draws_draw_date_program_type_key" ON "express_entry_draws"("draw_date", "program_type");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ca_eoi_rounds_draw_number_key" ON "ca_eoi_rounds"("draw_number");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "invitation_rounds_visaSubclass_date_idx" ON "invitation_rounds"("visaSubclass", "date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "invitation_rounds_date_visaSubclass_key" ON "invitation_rounds"("date", "visaSubclass");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "occupations_anzsco_code_key" ON "occupations"("anzsco_code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "occupations_title_idx" ON "occupations"("title");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "round_cutoffs_occupation_id_round_id_idx" ON "round_cutoffs"("occupation_id", "round_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "round_cutoffs_round_id_occupation_id_key" ON "round_cutoffs"("round_id", "occupation_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "state_allocations_program_year_state_idx" ON "state_allocations"("program_year", "state");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "state_allocations_program_year_state_visa_subclass_key" ON "state_allocations"("program_year", "state", "visa_subclass");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "state_intelligence_state_code_key" ON "state_intelligence"("state_code");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "state_nomination_configs_state_code_key" ON "state_nomination_configs"("state_code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "state_occupation_list_entries_state_code_idx" ON "state_occupation_list_entries"("state_code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "state_occupation_list_entries_anzsco_code_idx" ON "state_occupation_list_entries"("anzsco_code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "chat_visitors_ip_address_user_agent_idx" ON "chat_visitors"("ip_address", "user_agent");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "chat_visitors_fingerprint_idx" ON "chat_visitors"("fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "chat_credit_purchases_stripe_session_id_key" ON "chat_credit_purchases"("stripe_session_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "chat_credit_purchases_email_idx" ON "chat_credit_purchases"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "chat_credit_links_visitor_id_idx" ON "chat_credit_links"("visitor_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "chat_credit_links_email_visitor_id_key" ON "chat_credit_links"("email", "visitor_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "chat_restore_tokens_token_hash_key" ON "chat_restore_tokens"("token_hash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "chat_restore_requests_email_created_at_idx" ON "chat_restore_requests"("email", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "chat_restore_requests_ip_address_created_at_idx" ON "chat_restore_requests"("ip_address", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "chat_sessions_visitor_id_idx" ON "chat_sessions"("visitor_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "chat_messages_session_id_created_at_idx" ON "chat_messages"("session_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "campaigns_name_key" ON "campaigns"("name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "contact_messages_email_idx" ON "contact_messages"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pdf_downloads_email_idx" ON "pdf_downloads"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pdf_downloads_ip_idx" ON "pdf_downloads"("ip_address");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "visa_types_subclass_key" ON "visa_types"("subclass");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_reports_agent_id_fkey') THEN
    ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN others THEN RAISE NOTICE 'skipped constraint user_reports_agent_id_fkey: %', SQLERRM;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_lead_id_fkey') THEN
    ALTER TABLE "transactions" ADD CONSTRAINT "transactions_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "user_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN others THEN RAISE NOTICE 'skipped constraint transactions_lead_id_fkey: %', SQLERRM;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_agent_id_fkey') THEN
    ALTER TABLE "transactions" ADD CONSTRAINT "transactions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN others THEN RAISE NOTICE 'skipped constraint transactions_agent_id_fkey: %', SQLERRM;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lead_notes_author_id_fkey') THEN
    ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN others THEN RAISE NOTICE 'skipped constraint lead_notes_author_id_fkey: %', SQLERRM;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lead_notes_lead_id_fkey') THEN
    ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "user_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN others THEN RAISE NOTICE 'skipped constraint lead_notes_lead_id_fkey: %', SQLERRM;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'accounts_user_id_fkey') THEN
    ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN others THEN RAISE NOTICE 'skipped constraint accounts_user_id_fkey: %', SQLERRM;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_user_id_fkey') THEN
    ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN others THEN RAISE NOTICE 'skipped constraint sessions_user_id_fkey: %', SQLERRM;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'saved_calculations_user_id_fkey') THEN
    ALTER TABLE "saved_calculations" ADD CONSTRAINT "saved_calculations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN others THEN RAISE NOTICE 'skipped constraint saved_calculations_user_id_fkey: %', SQLERRM;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'saved_quiz_results_user_id_fkey') THEN
    ALTER TABLE "saved_quiz_results" ADD CONSTRAINT "saved_quiz_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN others THEN RAISE NOTICE 'skipped constraint saved_quiz_results_user_id_fkey: %', SQLERRM;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'saved_reports_user_id_fkey') THEN
    ALTER TABLE "saved_reports" ADD CONSTRAINT "saved_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN others THEN RAISE NOTICE 'skipped constraint saved_reports_user_id_fkey: %', SQLERRM;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'visa_tracking_user_id_fkey') THEN
    ALTER TABLE "visa_tracking" ADD CONSTRAINT "visa_tracking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN others THEN RAISE NOTICE 'skipped constraint visa_tracking_user_id_fkey: %', SQLERRM;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'visa_journeys_user_id_fkey') THEN
    ALTER TABLE "visa_journeys" ADD CONSTRAINT "visa_journeys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN others THEN RAISE NOTICE 'skipped constraint visa_journeys_user_id_fkey: %', SQLERRM;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'visa_documents_journey_id_fkey') THEN
    ALTER TABLE "visa_documents" ADD CONSTRAINT "visa_documents_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "visa_journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN others THEN RAISE NOTICE 'skipped constraint visa_documents_journey_id_fkey: %', SQLERRM;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'round_cutoffs_round_id_fkey') THEN
    ALTER TABLE "round_cutoffs" ADD CONSTRAINT "round_cutoffs_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "invitation_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN others THEN RAISE NOTICE 'skipped constraint round_cutoffs_round_id_fkey: %', SQLERRM;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'round_cutoffs_occupation_id_fkey') THEN
    ALTER TABLE "round_cutoffs" ADD CONSTRAINT "round_cutoffs_occupation_id_fkey" FOREIGN KEY ("occupation_id") REFERENCES "occupations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN others THEN RAISE NOTICE 'skipped constraint round_cutoffs_occupation_id_fkey: %', SQLERRM;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_sessions_visitor_id_fkey') THEN
    ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_visitor_id_fkey" FOREIGN KEY ("visitor_id") REFERENCES "chat_visitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN others THEN RAISE NOTICE 'skipped constraint chat_sessions_visitor_id_fkey: %', SQLERRM;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_messages_session_id_fkey') THEN
    ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN others THEN RAISE NOTICE 'skipped constraint chat_messages_session_id_fkey: %', SQLERRM;
END $$;


COMMIT;
