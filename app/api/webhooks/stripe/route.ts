// Stripe's dashboard endpoint for this app is configured as
// /api/webhooks/stripe (plural "webhooks", "stripe" last) -- a different
// path than this app's actual handler at app/api/stripe/webhook/route.ts.
// Re-exporting instead of duplicating the handler keeps signature
// verification and event handling in one place; see the comment at the top
// of that file for why a second, independent route was previously removed.
export { POST } from "@/app/api/stripe/webhook/route";

// Next.js requires route config exports to be defined literally in each
// route file -- re-exporting `dynamic` from the other file (as done above
// for POST) fails the build, so it's duplicated here.
export const dynamic = "force-dynamic";
