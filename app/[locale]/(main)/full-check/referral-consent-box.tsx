"use client";

import { useEffect, useState } from "react";

type Offer = { show: true; agentName: string; version: string; text: string; notice: string };

/**
 * The consent checkbox for a client who arrived through an agent's link. The server decides whether it is shown and writes the wording (naming the
 * agent from the database); nothing is shown otherwise. Unticked by default; buying never depends on it.
 */
export function ReferralConsentBox({ locale }: { locale: string }) {
  const [offer, setOffer] = useState<Offer | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/referral-consent/prompt?locale=${encodeURIComponent(locale)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.show === true) setOffer(data as Offer);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [locale]);

  if (!offer) return null;
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3" data-testid="referral-consent">
      <label className="flex items-start gap-2 text-sm text-slate-800">
        <input type="checkbox" name="referralConsent" defaultChecked={false} className="mt-1 h-4 w-4 shrink-0" />
        <span>{offer.text}</span>
      </label>
      <p className="text-xs text-slate-600">{offer.notice}</p>
    </div>
  );
}
