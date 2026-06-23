/**
 * Quick live test for the Canada EOI scraper.
 * Run: npx tsx scripts/test-ca-eoi-scraper.ts
 */
import { scrapeCaEoiRounds } from "@/lib/scrapers/ca-eoi-scraper";

async function main() {
  console.log("=== Canada EOI Scraper – Live Test ===\n");
  const result = await scrapeCaEoiRounds();
  console.log("\nResult:", JSON.stringify(result, null, 2));

  if (result.error) {
    console.error("\n❌ Scraper returned an error:", result.error);
    process.exit(1);
  }

  console.log(`\n✅ Success – inserted: ${result.inserted}, skipped: ${result.skipped}, latestDraw: #${result.latestDrawNumber ?? "?"}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
