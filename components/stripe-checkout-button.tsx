"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type ProductType = "premium" | "pdf_book";

type Props = {
  productType: ProductType;
  locale?: string;
  email?: string;
  userId?: string;
  reportId?: string;
  className?: string;
};

export function StripeCheckoutButton({
  productType,
  locale = "en",
  email,
  userId,
  reportId,
  className,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buttonText =
    productType === "premium" ? "Upgrade to Premium" : "Buy Turkish PDF E-Book";

  async function startCheckout() {
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
