import "dotenv/config";

import { prisma } from "@/lib/prisma";

function parseEmails(raw: string | undefined): Set<string> {
  return new Set((raw ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
}

async function consumed(excluded: Set<string>): Promise<string[]> {
  const rows = await prisma.userReport.findMany({
    where: { source: "full_check" },
    select: { email: true, isUnlocked: true, paymentStatus: true, unlockMethod: true },
  });

  const set = new Set<string>();
  for (const row of rows) {
    const email = (row.email ?? "").trim().toLowerCase();
    if (!email || excluded.has(email)) continue;

    const hasClaimed =
      row.isUnlocked === true ||
      row.paymentStatus === "beta_free" ||
      row.unlockMethod === "beta_free";

    if (hasClaimed) {
      set.add(email);
    }
  }

  return Array.from(set).sort();
}

async function main() {
  const adminOnly = parseEmails(process.env.ADMIN_EMAILS);
  const adminPlusKnown = new Set([...adminOnly, ...parseEmails(process.env.KNOWN_TEST_EMAILS)]);

  const c1 = await consumed(adminPlusKnown);
  const c2 = await consumed(adminOnly);

  console.log(
    JSON.stringify(
      {
        adminPlusKnown: {
          consumed: c1,
          count: c1.length,
          remainingAt14: Math.max(0, 14 - c1.length),
          remainingAt20: Math.max(0, 20 - c1.length),
        },
        adminOnly: {
          consumed: c2,
          count: c2.length,
          remainingAt14: Math.max(0, 14 - c2.length),
          remainingAt20: Math.max(0, 20 - c2.length),
        },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
