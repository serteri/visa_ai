-- Critical fix: the live "users" table was missing the "role" column that
-- prisma/schema.prisma has always declared (User.role String @default("USER")).
-- Without it, any Prisma query against User (Credentials login, Google OAuth
-- adapter operations, getCurrentUser()) fails with "column does not exist" --
-- discovered while trying to set serteri@gmail.com's ADMIN password hash.
-- IF NOT EXISTS keeps this safe to re-run.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" TEXT DEFAULT 'USER';
