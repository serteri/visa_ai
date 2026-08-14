"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/contexts/language-context";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  nameKey: string;
  descriptionKey: string;
  price: string;
  featureKeys: string[];
  highlighted?: boolean;
  priceId?: string;
}

const PLANS: Plan[] = [
  {
    id: "starter",
    nameKey: "pricing.starter.name",
    descriptionKey: "pricing.starter.description",
    price: "$9.99",
    featureKeys: ["pricing.starter.feature1", "pricing.starter.feature2", "pricing.starter.feature3"],
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_CREDITS_PRICE_ID,
  },
  {
    id: "comprehensive",
    nameKey: "pricing.comprehensive.name",
    descriptionKey: "pricing.comprehensive.description",
    price: "$19.99",
    featureKeys: [
      "pricing.comprehensive.feature1",
      "pricing.comprehensive.feature2",
      "pricing.comprehensive.feature3",
    ],
    highlighted: true,
    priceId: process.env.NEXT_PUBLIC_STRIPE_COMPREHENSIVE_CREDITS_PRICE_ID,
  },
];

export function PricingPlans() {
  const { t } = useTranslation();
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  async function handleBuyNow(plan: Plan) {
    if (!plan.priceId) {
      console.error(`No Stripe price id configured for plan "${plan.id}".`);
      return;
    }

    setLoadingPlanId(plan.id);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: plan.priceId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        throw new Error(data.error || "Checkout session could not be created.");
      }

      window.location.assign(data.url);
    } catch (error) {
      console.error("[pricing] checkout failed", error);
      setLoadingPlanId(null);
    }
  }

  return (
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
                {plan.price}
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
  );
}
