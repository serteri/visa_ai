/**
 * Bootstraps CRM portal accounts. Idempotent (upsert by email). Writes to the
 * database, so run it yourself after applying scripts/sql/2026-07-18-crm-role-agent.sql:
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... \
 *   AGENT_EMAIL=agent@example.com AGENT_PASSWORD=... \
 *   ASSIGN_SAMPLE_LEADS=5 npx tsx scripts/seed-crm-users.ts
 *
 * - Creates/updates an ADMIN and an AGENT user (bcrypt-hashed passwords).
 * - Optionally assigns up to ASSIGN_SAMPLE_LEADS currently-unassigned
 *   user_reports to the agent so the dashboards have data to show.
 */
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

async function upsertUser(email: string, password: string, role: "ADMIN" | "AGENT", name: string) {
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: { role, password: hashed, name },
    create: { email, role, password: hashed, name },
    select: { id: true, email: true, role: true },
  });
  console.log(`✔ ${role} ready: ${user.email} (${user.id})`);
  return user;
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const agentEmail = process.env.AGENT_EMAIL;
  const agentPassword = process.env.AGENT_PASSWORD;

  if (!adminEmail || !adminPassword || !agentEmail || !agentPassword) {
    throw new Error(
      "Set ADMIN_EMAIL, ADMIN_PASSWORD, AGENT_EMAIL, AGENT_PASSWORD env vars before running."
    );
  }

  await upsertUser(adminEmail, adminPassword, "ADMIN", "Admin");
  const agent = await upsertUser(agentEmail, agentPassword, "AGENT", "Sample Agent");

  const assignCount = parseInt(process.env.ASSIGN_SAMPLE_LEADS ?? "0", 10);
  if (assignCount > 0) {
    const unassigned = await prisma.userReport.findMany({
      where: { agentId: null },
      orderBy: { createdAt: "desc" },
      take: assignCount,
      select: { id: true },
    });
    if (unassigned.length > 0) {
      await prisma.userReport.updateMany({
        where: { id: { in: unassigned.map((r) => r.id) } },
        data: { agentId: agent.id },
      });
      console.log(`✔ Assigned ${unassigned.length} lead(s) to ${agentEmail}.`);
    } else {
      console.log("• No unassigned leads available to assign.");
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
