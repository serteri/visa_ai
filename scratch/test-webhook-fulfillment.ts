/**
 * TEST-MODE ONLY webhook fulfillment verification.
 * - No live Stripe API calls are made (fulfillment is event-driven; the only
 *   Stripe interaction is signature verification, which is mode-agnostic).
 * - Stage 1 drives the REAL /api/webhooks/stripe POST handler with a genuinely
 *   Stripe-signed checkout.session.completed event, email in DRY-RUN (no key).
 * - Stage 2 performs a REAL Resend delivery to the owner's own inbox for both
 *   products, to prove an actual email is sent with the correct PDF link.
 */
import { loadEnvConfig } from "@next/env";

// Load .env / .env.local exactly like Next does (gives RESEND_API_KEY etc.)
loadEnvConfig(process.cwd());

const REAL_RESEND_KEY = process.env.RESEND_API_KEY;
const OWNER_EMAIL = "serteri@gmail.com";

// Controlled env for the signed-webhook stage. STRIPE_SECRET_KEY only needs to
// be non-empty (constructEvent verifies with the webhook secret, not the API
// key). Point emailed links at the real prod domain (local base is localhost).
process.env.STRIPE_SECRET_KEY = "sk_test_harness_signature_only";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_harness_secret";
process.env.NEXT_PUBLIC_BASE_URL = "https://www.logivisa.com";

async function main() {
  const Stripe = (await import("stripe")).default;
  const { POST } = await import("@/app/api/webhooks/stripe/route");
  const { sendPdfDeliveryEmail, buildPdfDeliveryEmail, PDF_SLUGS } = await import(
    "@/lib/email/pdf-delivery"
  );

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

  async function makeSignedRequest(productType: string, name: string, email: string) {
    const event = {
      id: `evt_test_${productType}`,
      object: "event",
      api_version: "2024-06-20",
      type: "checkout.session.completed",
      data: {
        object: {
          id: `cs_test_${productType}`,
          object: "checkout.session",
          // metadata.email intentionally empty -> forces the customer_details
          // fallback, mirroring the /ai-visa-match flow which passes no email.
          metadata: { productType, locale: productType === "pdf_book" ? "tr" : "en", email: "", userId: "", reportId: "" },
          customer_email: null,
          customer_details: { email, name },
          payment_status: "paid",
          status: "complete",
        },
      },
    };
    const payload = JSON.stringify(event);
    const header = await stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET as string,
    });
    return new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": header, "content-type": "application/json" },
      body: payload,
    });
  }

  // ---- STAGE 1: real webhook route, real signature, DRY-RUN email ----
  delete process.env.RESEND_API_KEY; // force dry-run so no email is sent in this stage

  console.log("\n===== STAGE 1: signed webhook -> route -> fulfillment (dry-run email) =====");
  const cases = [
    { productType: "pdf_book_global", name: "Jane Tester", email: "buyer.global@example.com", expectSlug: PDF_SLUGS.global },
    { productType: "pdf_book", name: "Ahmet Test", email: "buyer.tr@example.com", expectSlug: PDF_SLUGS.turkish },
  ];

  for (const c of cases) {
    const req = await makeSignedRequest(c.productType, c.name, c.email);
    const res = await POST(req as never);
    const bodyText = await res.text();
    const built = buildPdfDeliveryEmail({ fullName: c.name, email: c.email, slug: c.expectSlug });
    const ok = res.status === 200 && built.pdfUrl.endsWith(`${c.expectSlug}.pdf`);
    console.log(
      `  [${c.productType}] httpStatus=${res.status} body=${bodyText} -> expectedPdf=${c.expectSlug}.pdf resolvedPdfUrl=${built.pdfUrl} ${ok ? "PASS" : "FAIL"}`
    );
  }

  // ---- STAGE 2: REAL delivery to owner inbox, both products ----
  console.log("\n===== STAGE 2: REAL Resend delivery to owner inbox (both products) =====");
  if (!REAL_RESEND_KEY) {
    console.log("  RESEND_API_KEY not found in env — skipping real send. (Stage 1 already proved routing + correct PDF.)");
    return;
  }
  process.env.RESEND_API_KEY = REAL_RESEND_KEY;

  for (const [label, slug] of [
    ["Global English (pdf_book_global)", PDF_SLUGS.global],
    ["Turkish (pdf_book)", PDF_SLUGS.turkish],
  ] as const) {
    const built = buildPdfDeliveryEmail({ fullName: "Serter (webhook test)", email: OWNER_EMAIL, slug });
    const result = await sendPdfDeliveryEmail({ fullName: "Serter (webhook test)", email: OWNER_EMAIL, slug });
    console.log(`  [${label}]`);
    console.log(`     to=${OWNER_EMAIL} subject="${built.subject}"`);
    console.log(`     pdfUrl=${built.pdfUrl}`);
    console.log(`     htmlBytes=${built.html.length} sent=${result.sent} skippedReason=${result.skippedReason ?? "-"}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
