/**
 * AI-assistant credit packages sold on app/[locale]/pricing, resolved SERVER-SIDE only.
 *
 * The browser sends only the package id ("starter" | "comprehensive"); never a price or a NEXT_PUBLIC_* price
 * id (when those were missing from the Vercel build they were inlined as undefined and Buy Now silently did
 * nothing). The Checkout line item is inline price_data with the GST-inclusive amount from lib/pricing.ts and
 * tax_behavior "inclusive", like the Premium report: the advertised price is the total the customer pays.
 * No Stripe Price object is used, so nothing has to be created or edited in the Stripe dashboard.
 */
import { PRODUCT_PRICE_AUD_CENTS } from "@/lib/pricing";

export type CreditPackageId = "starter" | "comprehensive";

type CreditPackage = {
  credits: number;
  /** Product name shown on the Checkout page (the same names the former live Stripe products used). */
  name: string;
};

export const CREDIT_PACKAGES: Readonly<Record<CreditPackageId, CreditPackage>> = {
  starter: { credits: 50, name: "LogiVisa Starter - 50 Credits" },
  comprehensive: { credits: 150, name: "LogiVisa Pro - 150 Credits" },
};

export function isCreditPackageId(value: unknown): value is CreditPackageId {
  return value === "starter" || value === "comprehensive";
}

export function getCreditPackagePriceCents(id: CreditPackageId): number {
  return PRODUCT_PRICE_AUD_CENTS[id === "starter" ? "credits_starter" : "credits_comprehensive"];
}

export function getCreditPackageLineItem(id: CreditPackageId) {
  return {
    price_data: {
      currency: "aud",
      product_data: {
        name: CREDIT_PACKAGES[id].name,
        // General - Electronically Supplied Services: the tax code the former Stripe products carried.
        tax_code: "txcd_10000000",
      },
      unit_amount: getCreditPackagePriceCents(id),
      tax_behavior: "inclusive" as const,
    },
    quantity: 1,
  };
}
