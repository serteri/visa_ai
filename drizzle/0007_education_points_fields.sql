ALTER TABLE "full_check_waitlist" ADD COLUMN "qualification_awarded_in_australia" boolean;
--> statement-breakpoint
ALTER TABLE "full_check_waitlist" ADD COLUMN "qualification_regional_australia" boolean;
--> statement-breakpoint
ALTER TABLE "full_check_waitlist" ADD COLUMN "specialist_education_stem_response" text;
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "qualification_awarded_in_australia" boolean;
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "qualification_regional_australia" boolean;
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "specialist_education_stem_response" text;