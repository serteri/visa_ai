import type { Metadata } from "next";

import { PricingPlans } from "./pricing-plans";

export const metadata: Metadata = {
  title: "Pricing — LogiVisa",
  description: "Premium AI vize danışmanlığı kredi paketleri.",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="mx-auto max-w-4xl px-4 pt-16 pb-10 text-center sm:pt-24">
        <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">Premium Kredi Paketleri</h1>
        <p className="mt-3 text-sm text-slate-600 sm:text-base">
          Ücretsiz mesaj limitinizi aştıysanız, ihtiyacınıza uygun kredi paketiyle LogiVisa AI Asistan&apos;ı
          kullanmaya devam edin.
        </p>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-20">
        <PricingPlans />
      </main>
    </div>
  );
}
