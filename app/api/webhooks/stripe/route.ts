// Stripe's dashboard endpoint for this app is configured as
// /api/webhooks/stripe (plural "webhooks", "stripe" last) -- a different
// path than this app's actual handler at app/api/stripe/webhook/route.ts.
// Re-exporting instead of duplicating the handler keeps signature
// verification and event handling in one place; see the comment at the top
// of that file for why a second, independent route was previously removed.
export { POST, dynamic } from "@/app/api/stripe/webhook/route";
