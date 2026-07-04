"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type ProductType = "premium" | "pdf_book" | "pdf_book_global";

type Props = {
  productType: ProductType;
  locale?: string;
  email?: string;
  userId?: string;
  reportId?: string;
  className?: string;
  /** Optional override for the button label (e.g. to reflect a scarcity-driven CTA copy). */
  label?: string;
  /**
   * Optional gate run before starting checkout. Return false to block the
   * redirect (e.g. an unchecked Terms checkbox) -- the caller is responsible
   * for surfacing its own error state. Omit for unguarded checkout (default,
   * matches all existing call sites).
   */
  onBeforeCheckout?: () => boolean;
};

const DEFAULT_LABEL: Record<ProductType, string> = {
  premium: "Upgrade to Premium",
  pdf_book: "Buy Now — $9.99",
  pdf_book_global: "Buy Now — $9.99",
};

export function StripeCheckoutButton({
  productType,
  locale = "en",
  email,
  userId,
  reportId,
  className,
  label,
  onBeforeCheckout,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buttonText = label ?? DEFAULT_LABEL[productType];

  async function startCheckout() {
    if (onBeforeCheckout && !onBeforeCheckout()) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productType,
          locale,
          email,
          userId,
          reportId,
        }),
      });

      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        throw new Error(data.error || "Unable to start checkout.");
      }

      window.location.href = data.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Checkout failed.";
      setError(message);
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        onClick={startCheckout}
        disabled={isLoading}
        className={className}
      >
        {isLoading ? "Redirecting..." : buttonText}
      </Button>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
