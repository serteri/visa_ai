"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  priceId?: string;
}

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Başlangıç Paketi",
    price: "$9.99",
    description: "Tek seferlik satın alım",
    features: ["50 Premium AI Mesajı", "Detaylı Vize Analizi", "Çok Dilli Destek"],
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_CREDITS_PRICE_ID,
  },
  {
    id: "comprehensive",
    name: "Kapsamlı Paket",
    price: "$19.99",
    description: "Tek seferlik satın alım",
    features: ["150 Premium AI Mesajı", "Öncelikli Yanıt", "Sınırsız RAG Erişimi"],
    highlighted: true,
    priceId: process.env.NEXT_PUBLIC_STRIPE_COMPREHENSIVE_CREDITS_PRICE_ID,
  },
];

export function PricingPlans() {
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
                  En Popüler
                </span>
              )}
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
              <p className="pt-2 text-4xl font-bold text-foreground">
                {plan.price}
                <span className="text-base font-normal text-muted-foreground"> / tek seferlik</span>
              </p>
            </CardHeader>

            <CardContent className="flex-1">
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {feature}
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
                    Yönlendiriliyor...
                  </>
                ) : (
                  "Satın Al"
                )}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
