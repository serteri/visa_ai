import { eq } from "drizzle-orm";

import { db } from "@/db";
import { campaigns } from "@/db/schema";
import { CheckoutButton } from "./checkout-button";

type Props = {
  params: Promise<{ locale: string; campaignSlug: string }>;
};

export default async function CampaignCheckoutPage({ params }: Props) {
  const { locale, campaignSlug } = await params;

  const rows = await db
    .select({ name: campaigns.name, price: campaigns.price })
    .from(campaigns)
    .where(eq(campaigns.name, campaignSlug))
    .limit(1);

  const campaign = rows[0];

  if (!campaign) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
        <p className="text-slate-400">This offer is no longer available.</p>
      </main>
    );
  }

  const priceLabel = `$${(campaign.price / 100).toFixed(2)}`;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-900 p-8 shadow-2xl shadow-purple-950/30">
        <div className="mb-6 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-600/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-400">
            Instant Access
          </span>
        </div>

        <h1 className="text-center text-2xl font-extrabold tracking-tight text-white">
          The Ultimate Australia Migration Blueprint
        </h1>
        <p className="mt-2 text-center text-sm text-slate-400">
          All free slots for this guide have been claimed. Get instant access to the
          full guide right now.
        </p>

        <div className="my-8 flex items-baseline justify-center gap-1">
          <span className="text-5xl font-extrabold text-white">{priceLabel}</span>
          <span className="text-sm text-slate-500">one-time</span>
        </div>

        <ul className="mb-8 space-y-3 text-sm text-slate-300">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-purple-400">✓</span>
            Full PDF guide delivered instantly to your email
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-purple-400">✓</span>
            Up-to-date 2026 points and eligibility criteria
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-purple-400">✓</span>
            Secure payment via Stripe
          </li>
        </ul>

        <CheckoutButton campaignSlug={campaign.name} locale={locale} />

        <p className="mt-4 text-center text-xs text-slate-500">
          You will be redirected to Stripe&apos;s secure checkout page.
        </p>
      </div>
    </main>
  );
}
