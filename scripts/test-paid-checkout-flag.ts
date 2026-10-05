/**
 * The paid Readiness Report checkout is behind READINESS_REPORT_PAID_CHECKOUT_ENABLED (lib/readiness/paid-checkout.ts):
 * the report is a free beta, production stays OFF unless the variable is exactly "true".
 *
 *   1. The flag: only the exact string "true" is ON (unset, "", "false", "1", "TRUE", " true" are OFF).
 *   2. The REAL /api/checkout route, flag OFF: the "premium" (Readiness Report) product is refused with 403
 *      paid_checkout_disabled BEFORE any report lookup or Stripe call; the ebooks are not affected.
 *   3. The same route, flag ON (test configuration): the request passes the gate and reaches the payment code. No
 *      Stripe key is configured here, so it stops at "Stripe keys are missing" -- nothing can be charged.
 *   4. The unlock decision a non-admin visitor gets: free beta when OFF, Stripe checkout only when ON.
 *   5. The "report is ready" email: in the free beta it never says a payment was confirmed (en / tr / zh-Hans); the paid
 *      wording is unchanged.
 *   6. The source: the unlock action asks /api/checkout for a session only on the "stripe_checkout" branch, and the unlock
 *      UI shows no price unless the flag was passed down as true.
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
  for (const v of [undefined, "", "false", "0", "1", "TRUE", "True", " true", "true ", "yes"]) check(!isPaidReportCheckoutEnabled({ [PAID_CHECKOUT_FLAG]: v }), `OFF for ${JSON.stringify(v)}`);
  check(isPaidReportCheckoutEnabled({ [PAID_CHECKOUT_FLAG]: "true" }), 'ON only for "true"');
  check(!isPaidReportCheckoutEnabled({}), "OFF when the variable is not set at all (the production default)");

  const { POST } = await import("../app/api/checkout/route");

  console.log("\n2. /api/checkout, flag OFF");
  delete process.env[PAID_CHECKOUT_FLAG];
  for (const locale of ["en", "tr", "zh-Hans"]) {
    const res = await post(POST, { productType: "premium", reportId: "rep-1", email: "a@example.test", locale });
    const json = (await res.json()) as { error?: string };
    check(res.status === 403 && json.error === "paid_checkout_disabled", `premium is refused (${locale}): ${res.status} ${json.error}`);
  }
  process.env[PAID_CHECKOUT_FLAG] = "false";
  const off = await post(POST, { productType: "premium", email: "a@example.test" });
  check(off.status === 403, '"false" is refused too');
  const ebook = await post(POST, { productType: "pdf_book_global", email: "a@example.test" });
  const ebookJson = (await ebook.json()) as { error?: string };
  check(ebook.status !== 403 && ebookJson.error !== "paid_checkout_disabled", `the ebooks are not gated by this flag (status ${ebook.status}: ${ebookJson.error})`);

  console.log("\n3. /api/checkout, flag ON (test configuration, no Stripe key)");
  process.env[PAID_CHECKOUT_FLAG] = "true";
  const on = await post(POST, { productType: "premium", email: "a@example.test" });
  const onJson = (await on.json()) as { error?: string };
  check(on.status !== 403 && onJson.error !== "paid_checkout_disabled", "the gate is open");
  check(on.status === 500 && /Stripe keys are missing/.test(onJson.error ?? ""), `...and the request reaches the payment code, which stops without a key (${on.status}: ${onJson.error})`);
  delete process.env[PAID_CHECKOUT_FLAG];

  console.log("\n4. the unlock decision for a non-admin visitor");
  check(nonAdminUnlockMode({}) === "free_beta" && nonAdminUnlockMode({ [PAID_CHECKOUT_FLAG]: "false" }) === "free_beta", "OFF -> free beta");
  check(nonAdminUnlockMode({ [PAID_CHECKOUT_FLAG]: "true" }) === "stripe_checkout", 'ON -> Stripe checkout');

  console.log("\n5. the report-ready email");
  for (const l of ["en", "tr", "zh-Hans"] as ReportEmailLocale[]) {
    const beta = reportReadyEmailCopy(l, true);
    const paid = reportReadyEmailCopy(l, false);
    check(!/payment|premium|ödeme|premium|付款|高级/i.test(`${beta.subject} ${beta.intro}`) && /beta|测试版/i.test(`${beta.subject} ${beta.intro}`), `${l}: free beta wording, no payment or premium claim`, `${beta.subject} | ${beta.intro}`);
    check(/payment|ödeme|付款/i.test(paid.intro) && beta.intro !== paid.intro, `${l}: the paid wording is unchanged`);
  }

  console.log("\n6. source checks");
  const read = (f: string) => readFileSync(path.join(__dirname, "..", f), "utf8");
  const actions = read("app/[locale]/(main)/full-check/actions.ts");
  const freeAt = actions.indexOf('nonAdminUnlockMode() === "free_beta"');
  const sessionAt = actions.indexOf("await createCheckoutSession({ reportId");
  check(freeAt > 0 && sessionAt > freeAt, "the unlock action returns the free-beta branch before it can ask /api/checkout for a session");
  const freeBlock = actions.slice(freeAt, sessionAt);
  check(!/redirectUrl|createCheckoutSession|accessToken|report:/.test(freeBlock.slice(0, freeBlock.indexOf("// ── Checkout gate"))), "the free-beta branch returns no redirect, no access token and no report to the browser (the link is emailed to the report's own address)");
  check(/generateAndSendReport\(reportId, record\.email, fullName \|\| undefined, \{ freeBeta: true \}\)/.test(actions), "the free-beta unlock sends the free-beta email wording");
  const gate = read("components/premium-feature-gate.tsx");
  check(/paidCheckoutEnabled = false/.test(gate), "the unlock UI defaults to free beta");
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
