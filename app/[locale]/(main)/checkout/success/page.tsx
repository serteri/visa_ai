import { getStripeClient } from "@/lib/stripe";
import { reportAccessToken, reportPdfPath } from "@/lib/reports/report-access";
import { verifiedPurchase, type StripeSessionLike } from "@/lib/analytics/purchase";

import { CheckoutSuccessClient } from "./success-client";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ session_id?: string; reportId?: string }>;
};

/**
 * The download link carries the report's access token, so it is only issued after the server has confirmed with
 * Stripe that THIS Checkout session paid for THIS report (session_id comes from Stripe's redirect; the reportId in
 * the URL alone proves nothing). Otherwise the page still confirms the payment and points to the emailed link.
 */
async function verifiedDownloadHref(sessionId: string | undefined, reportId: string | undefined): Promise<string | null> {
  if (!sessionId || !reportId || !process.env.STRIPE_SECRET_KEY) return null;
  try {
    const session = await getStripeClient().checkout.sessions.retrieve(sessionId);
    const paid = session.payment_status === "paid" || session.payment_status === "no_payment_required";
    if (!paid || session.metadata?.reportId !== reportId) return null;
    const token = reportAccessToken(reportId);
    return token ? reportPdfPath(reportId, token) : null;
  } catch (err) {
    console.warn("[checkout/success] could not verify the Stripe session:", err instanceof Error ? err.message : err);
    return null;
  }
}

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const { session_id, reportId } = await searchParams;
  const sessionId = session_id?.trim();
  // The purchase sent to analytics comes only from the session Stripe says was paid (lib/analytics/purchase.ts), never from this URL.
  const [downloadHref, purchase] = await Promise.all([
    verifiedDownloadHref(sessionId, reportId?.trim()),
    process.env.STRIPE_SECRET_KEY
      ? verifiedPurchase(sessionId, (id) => getStripeClient().checkout.sessions.retrieve(id) as unknown as Promise<StripeSessionLike>)
      : null,
  ]);
  return <CheckoutSuccessClient downloadHref={downloadHref} purchase={purchase} />;
}
