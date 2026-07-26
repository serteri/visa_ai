"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { createCheckoutSession } from "@/app/actions/stripeActions";

export function CheckoutButton({
  campaignSlug,
  locale,
}: {
  campaignSlug: string;
  locale: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setLoading(true);
    setError("");

    const result = await createCheckoutSession(campaignSlug, locale);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    window.location.href = result.url;
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-purple-600/20 transition-all hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Redirecting to secure checkout…
          </>
        ) : (
          "Proceed to Payment"
        )}
      </button>
      {error && (
        <p className="mt-3 text-center text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
