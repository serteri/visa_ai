CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slots_remaining" integer DEFAULT 20 NOT NULL,
	"price" integer DEFAULT 999 NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "campaigns_name_unique" UNIQUE("name")
);
--> statement-breakpoint
DROP TABLE "accounts" CASCADE;--> statement-breakpoint
DROP TABLE "saved_calculations" CASCADE;--> statement-breakpoint
DROP TABLE "saved_quiz_results" CASCADE;--> statement-breakpoint
DROP TABLE "saved_reports" CASCADE;--> statement-breakpoint
DROP TABLE "sessions" CASCADE;--> statement-breakpoint
DROP TABLE "user_profiles" CASCADE;--> statement-breakpoint
DROP TABLE "users" CASCADE;--> statement-breakpoint
DROP TABLE "verification_tokens" CASCADE;--> statement-breakpoint
DROP TABLE "visa_tracking" CASCADE;--> statement-breakpoint
ALTER TABLE "full_check_waitlist" ADD COLUMN "qualification_awarded_in_australia" boolean;--> statement-breakpoint
ALTER TABLE "full_check_waitlist" ADD COLUMN "qualification_regional_australia" boolean;--> statement-breakpoint
ALTER TABLE "full_check_waitlist" ADD COLUMN "specialist_education_stem_response" text;--> statement-breakpoint
ALTER TABLE "full_check_waitlist" ADD COLUMN "offshore_experience_years" real;--> statement-breakpoint
ALTER TABLE "full_check_waitlist" ADD COLUMN "onshore_experience_years" real;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "qualification_awarded_in_australia" boolean;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "qualification_regional_australia" boolean;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "specialist_education_stem_response" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "offshore_experience_years" real;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "onshore_experience_years" real;