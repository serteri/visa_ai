import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

// Idempotent AGENT seed for manual QA of the /agent portal, driven entirely
// by TEST_AGENT_EMAIL / TEST_AGENT_PASSWORD (set in Vercel/​.env, never
// hardcoded here). Only ever CREATES -- if the email already exists, this
// intentionally leaves it untouched rather than overwriting a real
// password/role, and just confirms its current state.
async function main() {
  const email = process.env.TEST_AGENT_EMAIL?.trim();
  const password = process.env.TEST_AGENT_PASSWORD?.trim();

  if (!email || !password) {
    console.log("[seed-test-agent] TEST_AGENT_EMAIL/TEST_AGENT_PASSWORD not set -- skipping.");
    return;
  }

  const prisma = new PrismaClient();
  try {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true },
    });

    if (existing) {
      console.log(
        `[seed-test-agent] ${email} already exists (role=${existing.role}) -- leaving password/role untouched.`
      );
      return;
    }

    const hash = await bcrypt.hash(password, 12);
    const agent = await prisma.user.create({
      data: { email, password: hash, role: "AGENT", market: "GLOBAL", name: "Test Agent" },
      select: { id: true, email: true, role: true },
    });
    console.log("[seed-test-agent] created:", JSON.stringify(agent));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[seed-test-agent] failed:", err.message);
  process.exit(1);
});
