/**
 * READ-ONLY report: visitors with isPremium = true and their credit balances. Goes through withProdReadOnly
 * (PROD_DATABASE_URL, READ ONLY transaction), so it cannot write. Prints counts and balances only -- no IPs or
 * user agents.
 *
 *   PROD_DATABASE_URL=... npx tsx scripts/report-premium-visitors.ts
 */
import { withProdReadOnly } from "./lib/prod-db";

async function main() {
  await withProdReadOnly(async (tx) => {
    const rows = await tx.chatVisitor.findMany({
      where: { isPremium: true },
      select: { id: true, premiumCredits: true, messageCount: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    const total = rows.length;
    const zero = rows.filter((r) => r.premiumCredits <= 0).length;
    const sum = rows.reduce((a, r) => a + r.premiumCredits, 0);
    console.log(`isPremium = true: ${total} visitors (${zero} with 0 credits; ${total - zero} with credits; ${sum} credits in total)`);
    for (const r of rows) {
      console.log(`${r.id}  credits=${r.premiumCredits}  messages=${r.messageCount}  since=${r.createdAt.toISOString().slice(0, 10)}`);
    }
  });
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
