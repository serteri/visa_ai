/**
 * The Visa Information Report costs A$39.99 including GST (A$36.35 + A$3.64 GST, worked out in lib/pricing.ts, not by Stripe Tax):
 * one source (lib/pricing.ts), the Stripe line item charges exactly that inclusive amount inline (no Stripe Price id), every display string and
 * locale bundle says A$39.99, and no "21.99" remains for the report anywhere in the customer-facing code (the chat credit package that costs
 * A$21.99 is the only allowed use of that number, and it lives in lib/pricing.ts as cents).
 *
 *   npx tsx scripts/test-report-price.ts
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

process.env.DATABASE_URL ??= "postgresql://u:p@localhost:5432/d?sslmode=disable";

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else {
    failures++;
    console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`);
  }
};

async function main() {
  const pricing = await import("../lib/pricing");
  console.log("1. one source: lib/pricing.ts");
  check(pricing.PREMIUM_PRICE_AUD_CENTS === 3999 && pricing.PREMIUM_PRICE_AUD === 39.99, "the report is 3999 cents = A$39.99 inclusive of GST");
  check(pricing.PREMIUM_PRICE_GST_AUD_CENTS === 364 && pricing.PREMIUM_PRICE_NET_AUD_CENTS === 3635, "GST component A$3.64 (one eleventh, rounded), net A$36.35", `${pricing.PREMIUM_PRICE_GST_AUD_CENTS} / ${pricing.PREMIUM_PRICE_NET_AUD_CENTS}`);
  check(pricing.PREMIUM_PRICE_GST_AUD_CENTS + pricing.PREMIUM_PRICE_NET_AUD_CENTS === pricing.PREMIUM_PRICE_AUD_CENTS, "net + GST = the inclusive total");
  check(pricing.PREMIUM_PRICE_DISPLAY.en === "A$39.99 inc. GST" && pricing.PREMIUM_PRICE_DISPLAY.tr === "GST dahil A$39.99" && pricing.PREMIUM_PRICE_DISPLAY["zh-Hans"] === "A$39.99（含GST）", "display strings (en / tr / zh-Hans)");
  check(["en", "tr", "zh-Hans", "zh"].every((l) => pricing.getPremiumPriceDisplay(l).includes("39.99")), "getPremiumPriceDisplay for every locale");
  check(pricing.PRODUCT_PRICE_AUD_CENTS.credits_starter === 1099 && pricing.PRODUCT_PRICE_AUD_CENTS.credits_comprehensive === 2199 && pricing.PRODUCT_PRICE_AUD_CENTS.pdf_book === 1099, "chat credit packages and the ebooks are unchanged");

  console.log("\n2. the Stripe line item (inline price_data: no Stripe Price id to create, none hard-coded)");
  const { getCheckoutLineItem } = await import("../lib/stripe/line-items");
  const item = getCheckoutLineItem("premium");
  check(item.price_data.unit_amount === 3999 && item.price_data.currency === "aud" && item.price_data.tax_behavior === "inclusive", "premium charges 3999 AUD, tax behaviour inclusive");
  check(item.price_data.product_data.name === "Visa Information Report", "product name");
  const lineItems = readFileSync("lib/stripe/line-items.ts", "utf8") + readFileSync("app/api/checkout/route.ts", "utf8");
  check(!/price_[A-Za-z0-9]{8,}|prod_[A-Za-z0-9]{8,}|STRIPE_PRICE|price:\s*["'`]/.test(lineItems), "no Stripe price / product id in the checkout code");
  check(getCheckoutLineItem("pdf_book").price_data.unit_amount === 1099 && getCheckoutLineItem("pdf_book_global").price_data.unit_amount === 1099, "the ebooks keep their price");

  console.log("\n3. site copy: every locale bundle says A$39.99 for the report");
  for (const l of ["en", "tr", "zh-Hans"]) {
    const bundle = JSON.parse(readFileSync(`public/locales/${l}.json`, "utf8")) as Record<string, string>;
    const keys = ["hero.pricingBadgePrice", "hero.scarcityText", "quiz.result.cta", "home.reportShowcase.eyebrow"];
    check(keys.every((k) => String(bundle[k] ?? "").includes("39.99")), `[${l}] ${keys.join(", ")} carry 39.99`, keys.filter((k) => !String(bundle[k] ?? "").includes("39.99")).join(", "));
  }

  console.log("\n4. no 21.99 / 2199 left for the report in customer-facing code, data and tests");
  const SKIP = new Set(["node_modules", ".next", ".git", "temp_tests", "dist"]);
  const hits: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (SKIP.has(name)) continue;
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx|json|md|yml)$/.test(name) && !/anzsco|skilled|occupation|osca|scratch|state-occupation|translate|i18n\//i.test(full)) {
        const file = readFileSync(full, "utf8");
        file.split("\n").forEach((line, i) => {
          if (!/21\.99|\b2199\b|21,99/.test(line)) return;
          // The chat credit package (A$21.99 = 2199 cents) and its arithmetic comment are the only allowed uses.
          if (full === path.join("lib", "pricing.ts") && /credits_comprehensive|2199|1999 \* 1\.10/.test(line)) return;
          if (full.startsWith("scripts") && /credits|comprehensive|PRICE = /.test(line)) return;
          if (full.startsWith("docs") || name === "test-report-price.ts") return;
          hits.push(`${full}:${i + 1}: ${line.trim().slice(0, 110)}`);
        });
      }
    }
  };
  for (const d of ["app", "lib", "components", "emails", "public/locales", "src/lib", "scripts"]) walk(d);
  check(hits.length === 0, "no \"21.99\" / 2199 for the report", hits.slice(0, 5).join(" | "));

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
