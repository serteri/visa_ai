/**
 * GST is calculated by us, not by Stripe Tax: every checkout session sets automatic_tax disabled, prices stay GST-inclusive, the local GST / net
 * figures travel in the session metadata, and nothing in the code reads Stripe's tax amount.
 *
 *   npx tsx scripts/test-no-stripe-tax.ts
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

process.env.DATABASE_URL ??= "postgresql://u:p@localhost:5432/d?sslmode=disable";
process.env.STRIPE_SECRET_KEY = "sk_test_stub_not_a_real_key";
process.env.NEXT_PUBLIC_BASE_URL = "https://example.test";
delete process.env.READINESS_REPORT_PAID_CHECKOUT_ENABLED;

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else {
    failures++;
    console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`);
  }
};

async function main() {
  const { cookieJar } = await import("./lib/stub-request-context");
  void cookieJar;
  (globalThis as { prisma?: unknown }).prisma = {
    $queryRawUnsafe: async () => [{ id: "r1", email: "a@example.org", locale: "en", report_json: {}, input_json: {}, agent_id: null, is_unlocked: false, full_name: "A", preview_data: null, created_at: "2026-10-01T00:00:00Z" }],
    user: { findFirst: async () => null },
    $disconnect: async () => undefined,
  };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Stripe = (require("stripe") as { default?: typeof import("stripe").default }).default ?? (require("stripe") as typeof import("stripe").default);
  const probe = new Stripe("sk_test_stub");
  const created: Array<Record<string, unknown>> = [];
  (Object.getPrototypeOf(probe.checkout.sessions) as { create: unknown }).create = async (p: Record<string, unknown>) => {
    created.push(p);
    return { id: "cs_test", url: "https://checkout.stripe.test/c/pay" };
  };
  const { NextRequest } = await import("next/server");
  const { POST } = await import("../app/api/checkout/route");

  console.log("1. report checkout (real route)");
  const res = await POST(new NextRequest("http://localhost/api/checkout", { method: "POST", body: JSON.stringify({ productType: "premium", reportId: "r1", email: "a@example.org" }), headers: { "content-type": "application/json" } }));
  const s = created[0] as { automatic_tax?: { enabled: boolean }; metadata?: Record<string, string>; line_items?: Array<{ price_data: { unit_amount: number; tax_behavior: string } }> };
  check(res.status === 200 && !!s, "a session is created", String(res.status));
  check(s.automatic_tax?.enabled === false, "automatic_tax is disabled");
  check(s.line_items?.[0].price_data.unit_amount === 3999 && s.line_items?.[0].price_data.tax_behavior === "inclusive", "the price stays GST-inclusive (A$39.99)");
  check(s.metadata?.priceInclGstCents === "3999" && s.metadata?.gstCents === "364" && s.metadata?.netCents === "3635" && s.metadata?.gstSource === "local", "metadata carries the local figures: 3999 incl, 364 GST, 3635 net", JSON.stringify(s.metadata));
  created.length = 0;
  await POST(new NextRequest("http://localhost/api/checkout", { method: "POST", body: JSON.stringify({ productType: "pdf_book_global", email: "a@example.org" }), headers: { "content-type": "application/json" } }));
  const e = created[0] as typeof s;
  check(e?.automatic_tax?.enabled === false && e?.metadata?.gstCents === "100" && e?.metadata?.netCents === "999", "ebook: tax disabled, GST 100 / net 999", JSON.stringify(e?.metadata));

  console.log("\n2. chat credits and campaign checkouts, and every other place a session is created");
  const files = ["app/api/stripe/checkout/route.ts", "app/actions/stripeActions.ts", "app/api/checkout/route.ts"];
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    check(/automatic_tax:\s*\{\s*enabled:\s*false\s*\}/.test(src) && !/enabled:\s*true/.test(src) && /localTaxMetadata/.test(src), `${f}: automatic_tax disabled, local figures in metadata`);
  }
  const { PRODUCT_PRICE_AUD_CENTS, localTaxMetadata } = await import("../lib/pricing");
  check(localTaxMetadata(PRODUCT_PRICE_AUD_CENTS.credits_starter).gstCents === "100" && localTaxMetadata(PRODUCT_PRICE_AUD_CENTS.credits_comprehensive).gstCents === "200", "credit packages: GST 100 (A$10.99) and 200 (A$21.99)");

  console.log("\n3. nothing reads Stripe's tax amount, and no session turns Stripe Tax on");
  const hits: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (["node_modules", ".next", ".git"].includes(name)) continue;
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(name)) {
        readFileSync(full, "utf8").split("\n").forEach((line, i) => {
          if (/\bamount_tax\b|total_details\??\.amount_tax|automatic_tax:\s*\{\s*enabled:\s*true/.test(line) && !line.trim().startsWith("//") && !line.trim().startsWith("*")) hits.push(`${full}:${i + 1}`);
        });
      }
    }
  };
  for (const d of ["app", "lib", "src", "components"]) walk(d);
  check(hits.length === 0, "no read of amount_tax and no automatic_tax enabled in app / lib / src / components", hits.join(", "));

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
