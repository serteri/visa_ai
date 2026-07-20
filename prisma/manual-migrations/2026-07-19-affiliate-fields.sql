-- B2B Affiliate/Partner architecture: agent profile fields + referral-based
-- auto-assignment flag. Additive-only, IF NOT EXISTS keeps this safe to re-run.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "company_name" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "user_reports" ADD COLUMN IF NOT EXISTS "assigned_via_ref" BOOLEAN DEFAULT false;
