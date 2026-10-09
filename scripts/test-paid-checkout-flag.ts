/**
 * The paid Visa Information Report checkout is behind READINESS_REPORT_PAID_CHECKOUT_ENABLED (lib/readiness/paid-checkout.ts):
 * ON by default; only the exact string "false" switches the sale off.
 *
 *   1. The flag: ON for unset, "", "true", "TRUE", "0", "1"; OFF only for "false" (trimmed).
 *   2. The REAL /api/checkout route, flag OFF: the "premium" product is refused with 403 paid_checkout_disabled BEFORE any report lookup
 *      or Stripe call; the ebooks are not affected.
 *   3. The same route with the variable UNSET (production default): the request passes the gate and reaches the payment code. No Stripe key is
 *      configured here, so it stops at "Stripe keys are missing" -- nothing can be charged. The checkout line item is the
 *      "Visa Information Report" at the unchanged price.
 *   4. The unlock decision a non-admin visitor gets: Stripe checkout by default, free open only when switched off.
 *   5. The "report is ready" email: paid wording unchanged in substance (payment confirmed); no "beta", "Readiness" or "Premium" wording anywhere.
 *   6. The source: the unlock action asks /api/checkout for a session only on the "stripe_checkout" branch; the unlock UI defaults to payment.
 *
 * No network, no database, no Stripe.   npx tsx scripts/test-paid-checkout-flag.ts
 */
import { readFileSync } from "node:fs";
import path from "node:path";

process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/d?sslmode=disable"; // never connects
delete process.env.STRIPE_SECRET_KEY; // no key: the payment path cannot create a session
process.env.NEXT_PUBLIC_BASE_URL = "https://example.test";

import { NextRequest } from "next/server";

import { isPaidReportCheckoutEnabled, nonAdminUnlockMode, PAID_CHECKOUT_FLAG } from "../lib/readiness/paid-checkout";
import { reportReadyEmailCopy, type ReportEmailLocale } from "../lib/services/report-email-copy";

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else {
    failures++;
    console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`);
  }
};

const post = (POST: (req: NextRequest) => Promise<Response>, body: unknown) =>
  POST(new NextRequest("http://localhost/api/checkout", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } }));

async function main() {
  console.log("1. the flag");
  check(PAID_CHECKOUT_FLAG === "READINESS_REPORT_PAID_CHECKOUT_ENABLED", "the variable name");
  for (const v of [undefined, "", "true", "TRUE", "True", "0", "1", "yes", "off"]) check(isPaidReportCheckoutEnabled({ [PAID_CHECKOUT_FLAG]: v }), `ON for ${JSON.stringify(v)}`);
  for (const v of ["false", " false ", "false "]) check(!isPaidReportCheckoutEnabled({ [PAID_CHECKOUT_FLAG]: v }), `OFF for ${JSON.stringify(v)}`);
  check(isPaidReportCheckoutEnabled({}), "ON when the variable is not set at all (the production default)");

  const { POST } = await import("../app/api/checkout/route");

  console.log("\n2. /api/checkout, flag OFF");
  process.env[PAID_CHECKOUT_FLAG] = "false";
  for (const locale of ["en", "tr", "zh-Hans"]) {
    const res = await post(POST, { productType: "premium", reportId: "rep-1", email: "a@example.test", locale });
    const json = (await res.json()) as { error?: string };
    check(res.status === 403 && json.error === "paid_checkout_disabled", `premium is refused (${locale}): ${res.status} ${json.error}`);
  }
  const ebook = await post(POST, { productType: "pdf_book_global", email: "a@example.test" });
  const ebookJson = (await ebook.json()) as { error?: string };
  check(ebook.status !== 403 && ebookJson.error !== "paid_checkout_disabled", `the ebooks are not gated by this flag (status ${ebook.status}: ${ebookJson.error})`);

  console.log("\n3. /api/checkout, variable UNSET (the default), no Stripe key");
  delete process.env[PAID_CHECKOUT_FLAG];
  const on = await post(POST, { productType: "premium", email: "a@example.test" });
  const onJson = (await on.json()) as { error?: string };
  check(on.status !== 403 && onJson.error !== "paid_checkout_disabled", "the gate is open by default");
  check(on.status === 500 && /Stripe keys are missing/.test(onJson.error ?? ""), `...and the request reaches the payment code, which stops without a key (${on.status}: ${onJson.error})`);
  const { getCheckoutLineItem } = await import("../lib/stripe/line-items");
  const { PREMIUM_PRICE_AUD_CENTS } = await import("../lib/pricing");
  const item = getCheckoutLineItem("premium");
  check(item.price_data.product_data.name === "Visa Information Report" && item.price_data.unit_amount === PREMIUM_PRICE_AUD_CENTS && PREMIUM_PRICE_AUD_CENTS === 3999 && item.price_data.currency === "aud", "the Stripe line item is the Visa Information Report at the unchanged price (A$39.99 GST-inclusive)");

  console.log("\n4. the unlock decision for a non-admin visitor");
  check(nonAdminUnlockMode({}) === "stripe_checkout" && nonAdminUnlockMode({ [PAID_CHECKOUT_FLAG]: "true" }) === "stripe_checkout", "default / true -> Stripe checkout");
  check(nonAdminUnlockMode({ [PAID_CHECKOUT_FLAG]: "false" }) === "free_beta", 'switched off -> the report opens without payment');

  console.log("\n5. the report-ready email");
  for (const l of ["en", "tr", "zh-Hans"] as ReportEmailLocale[]) {
    const unpaid = reportReadyEmailCopy(l, true);
    const paid = reportReadyEmailCopy(l, false);
    const all = `${unpaid.subject} ${unpaid.intro} ${paid.subject} ${paid.intro}`;
    check(!/payment|ödeme|付款/i.test(`${unpaid.subject} ${unpaid.intro}`), `${l}: without a payment the email never says one was confirmed`, `${unpaid.subject} | ${unpaid.intro}`);
    check(/payment|ödeme|付款/i.test(paid.intro) && /Visa Information Report|Vize Bilgi Raporu|签证信息报告/.test(paid.subject), `${l}: the paid email confirms the payment and names the Visa Information Report`);
    check(!/beta|测试版|Readiness|Hazırlık|准备度|Premium|高级/i.test(all), `${l}: no beta / Readiness / Premium wording`);
  }

  console.log("\n6. source checks");
  const read = (f: string) => readFileSync(path.join(__dirname, "..", f), "utf8");
  const actions = read("app/[locale]/(main)/full-check/actions.ts");
  const freeAt = actions.indexOf('nonAdminUnlockMode() === "free_beta"');
  const sessionAt = actions.indexOf("await createCheckoutSession({ reportId");
  check(freeAt > 0 && sessionAt > freeAt, "the unlock action returns the free-beta branch before it can ask /api/checkout for a session");
  const freeBlock = actions.slice(freeAt, sessionAt);
  check(!/redirectUrl|createCheckoutSession/.test(freeBlock.slice(0, freeBlock.indexOf("// ── Checkout gate"))), "the free-beta branch never returns a Stripe redirect or asks /api/checkout for a session");
  const sbAt = freeBlock.indexOf("if (sameBrowser) {");
  const afterSession = freeBlock.slice(sbAt, freeBlock.indexOf("// ── Checkout gate"));
  const outsideSession = freeBlock.slice(0, sbAt) + afterSession.slice(afterSession.indexOf("if (!firstUnlock)"));
  check(sbAt > 0 && /accessToken/.test(afterSession) && !/accessToken|report:/.test(outsideSession), "the report and its access token are returned only inside the creating-browser (session) branch");
  check(/generateAndSendReport\(reportId, record\.email, fullName \|\| undefined, \{ freeBeta: true \}\)/.test(actions), "the unpaid unlock sends the no-payment email wording");
  const gate = read("components/premium-feature-gate.tsx");
  check(/paidCheckoutEnabled = true/.test(gate), "the unlock UI defaults to payment");
  const result = read("app/[locale]/(main)/full-check/result/page.tsx");
  const fcPage = read("app/[locale]/(main)/full-check/page.tsx");
  check(result.includes("isPaidReportCheckoutEnabled()") && fcPage.includes("isPaidReportCheckoutEnabled()"), "both report pages read the server-side flag");

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nAll checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
