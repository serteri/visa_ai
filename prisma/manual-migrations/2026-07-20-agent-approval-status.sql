-- Agent self-registration approval workflow. Default 'APPROVED' so every
-- existing row (admin-created agents, all other roles) keeps working
-- unchanged; the self-registration action explicitly writes 'PENDING'.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "approval_status" TEXT DEFAULT 'APPROVED';
