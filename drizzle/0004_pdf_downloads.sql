CREATE TABLE IF NOT EXISTS "pdf_downloads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "full_name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text NOT NULL,
  "ip_address" text NOT NULL,
  "pdf_slug" text NOT NULL DEFAULT 'avustralya-pr-rehberi-2026',
  "is_paid" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "pdf_downloads_ip_idx" ON "pdf_downloads" ("ip_address");
CREATE INDEX IF NOT EXISTS "pdf_downloads_email_idx" ON "pdf_downloads" ("email");
