CREATE TABLE "agent_referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"country_of_passport" text NOT NULL,
	"current_country" text NOT NULL,
	"preferred_language" text NOT NULL,
	"visa_interest" text NOT NULL,
	"short_message" text NOT NULL,
	"consent" boolean NOT NULL,
	"status" text DEFAULT 'new',
	"assigned_agent_id" uuid,
	"assigned_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"business_name" text,
	"email" text NOT NULL,
	"phone" text,
	"marn" text,
	"languages" jsonb,
	"specialties" jsonb,
	"locations" jsonb,
	"active" boolean DEFAULT true,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "full_check_usage" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"free_reports_used" integer DEFAULT 0,
	"free_limit" integer DEFAULT 50,
	"is_free_active" boolean DEFAULT true,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "full_check_waitlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"visa_interest" text,
	"preferred_language" text,
	"current_country" text,
	"passport_country" text,
	"age" text,
	"occupation" text,
	"english_level" text,
	"english_test_taken" text,
	"occupation_confirmed" text,
	"estimated_budget_range" text,
	"timeline" text,
	"sponsor_or_family" text,
	"biggest_concern" text,
	"main_goal" text,
	"lead_score" integer,
	"lead_tier" text,
	"source" text DEFAULT 'full_check',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text DEFAULT 'full_check',
	"full_name" text,
	"email" text NOT NULL,
	"preferred_language" text,
	"current_country" text,
	"passport_country" text,
	"age" text,
	"occupation" text,
	"english_level" text,
	"english_test_taken" text,
	"occupation_confirmed" text,
	"estimated_budget_range" text,
	"timeline" text,
	"sponsor_or_family" text,
	"biggest_concern" text,
	"main_goal" text,
	"selected_visa" text,
	"system_score" integer,
	"lead_score" integer,
	"lead_tier" text,
	"report_id" uuid,
	"report_locale" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "saved_calculations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"visa_subclass" text,
	"total_points" integer NOT NULL,
	"breakdown" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "saved_quiz_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"score" integer,
	"readiness_level" text,
	"answers" jsonb,
	"recommendations" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "saved_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"report_type" text DEFAULT 'full_check' NOT NULL,
	"report_url" text,
	"report_data" jsonb,
	"language" text DEFAULT 'en',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_profiles_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE "visa_tracking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"visa_subclass" text NOT NULL,
	"status" text DEFAULT 'planning' NOT NULL,
	"notes" text,
	"target_date" date,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "agent_referrals" ADD CONSTRAINT "agent_referrals_assigned_agent_id_agents_id_fk" FOREIGN KEY ("assigned_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "saved_calculations_clerk_user_id_idx" ON "saved_calculations" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "saved_quiz_results_clerk_user_id_idx" ON "saved_quiz_results" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "saved_reports_clerk_user_id_idx" ON "saved_reports" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "user_profiles_clerk_user_id_idx" ON "user_profiles" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "visa_tracking_clerk_user_id_idx" ON "visa_tracking" USING btree ("clerk_user_id");