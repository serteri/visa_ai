"use client";

import { useState } from "react";
import { AlertCircle, Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/contexts/language-context";
import { getProductPriceDisplay, type GstInclusiveProduct } from "@/lib/pricing";
import { cn } from "@/lib/utils";

interface Plan {
  // Sent to /api/stripe/checkout, which resolves the Stripe price id server-side (lib/stripe/credit-packages.ts).
  // Never a NEXT_PUBLIC_* price id here: when those are missing from the Vercel build they are inlined as
  // undefined and the button silently did nothing.
  id: "starter" | "comprehensive";
  nameKey: string;
  descriptionKey: string;
  /** GST-inclusive price from lib/pricing.ts -- the same amount Checkout charges. */
  priceProduct: GstInclusiveProduct;
  featureKeys: string[];
  highlighted?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "starter",
    nameKey: "pricing.starter.name",
    descriptionKey: "pricing.starter.description",
    priceProduct: "credits_starter",
    featureKeys: ["pricing.starter.feature1", "pricing.starter.feature2", "pricing.starter.feature3"],
  },
  {
    id: "comprehensive",
    nameKey: "pricing.comprehensive.name",
    descriptionKey: "pricing.comprehensive.description",
    priceProduct: "credits_comprehensive",
    featureKeys: [
      "pricing.comprehensive.feature1",
      "pricing.comprehensive.feature2",
      "pricing.comprehensive.feature3",
    ],
    highlighted: true,
  },
];

export function PricingPlans({ locale }: { locale: string }) {
  const { t } = useTranslation();
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  async function handleBuyNow(plan: Plan) {
    setCheckoutError(null);
    setLoadingPlanId(plan.id);
    try {
      // The AI assistant's upgrade prompt links here as /pricing?email=...; pass it on as a Checkout prefill.
      // The server validates it and ignores anything malformed.
      const email = new URLSearchParams(window.location.search).get("email") ?? undefined;
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: plan.id, email }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        throw new Error(data.error || `Checkout session could not be created (HTTP ${res.status}).`);
      }

      window.location.assign(data.url);
    } catch (error) {
      console.error("[pricing] checkout failed", error);
      setCheckoutError(t("pricing.checkoutError", "We couldn't start the checkout. Please try again in a moment."));
      setLoadingPlanId(null);
    }
  }

  return (
    <div className="space-y-6">
      {checkoutError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{checkoutError}</span>
        </div>
      )}
      <div className="grid gap-8 sm:grid-cols-2">
        {PLANS.map((plan) => {
          const isLoading = loadingPlanId === plan.id;

          return (
            <Card
              key={plan.id}
              className={cn(
                "flex flex-col",
                plan.highlighted && "border-primary shadow-[0_10px_40px_-15px_rgba(99,102,241,0.5)] ring-1 ring-primary/40",
              )}
            >
              <CardHeader>
                {plan.highlighted && (
                  <span className="mb-2 inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {t("pricing.mostPopular", "Most Popular")}
                  </span>
                )}
                <CardTitle className="text-xl">{t(plan.nameKey)}</CardTitle>
                <p className="text-sm text-muted-foreground">{t(plan.descriptionKey)}</p>
                <p className="pt-2 text-4xl font-bold text-foreground">
                  {getProductPriceDisplay(plan.priceProduct, locale)}
                  <span className="text-base font-normal text-muted-foreground">
                    {t("pricing.perOneTime", " / one-time")}
                  </span>
                </p>
              </CardHeader>

              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {plan.featureKeys.map((featureKey) => (
                    <li key={featureKey} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {t(featureKey)}
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  onClick={() => handleBuyNow(plan)}
                  disabled={loadingPlanId !== null}
                  variant={plan.highlighted ? "default" : "outline"}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("pricing.redirecting", "Redirecting...")}
                    </>
                  ) : (
                    t("pricing.buyNow", "Buy Now")
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
