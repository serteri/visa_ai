CREATE TABLE "pdf_downloads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"ip_address" text NOT NULL,
	"pdf_slug" text DEFAULT 'avustralya-pr-rehberi-2026' NOT NULL,
	"is_paid" boolean DEFAULT false,
	"terms_accepted_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "pdf_downloads_ip_idx" ON "pdf_downloads" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "pdf_downloads_email_idx" ON "pdf_downloads" USING btree ("email");
