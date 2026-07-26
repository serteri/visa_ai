"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { claimLeadMagnetSlot, getRemainingSlots } from "@/app/actions/leadMagnetActions";

export interface LeadMagnetCampaignFormProps {
  /** Must match campaigns.name in the database exactly. */
  campaignName: string;
  /** Locale prefix for the checkout redirect -- required because this app has no locale-detection middleware, so a bare "/checkout/..." path (no locale segment) 404s. */
  locale: string;
  /** Extra CSS classes applied to the root element. */
  className?: string;
}

type ViewState = "loading" | "form" | "paywall" | "success";

export function LeadMagnetCampaignForm({
  campaignName,
  locale,
  className,
}: LeadMagnetCampaignFormProps) {
  const router = useRouter();
  const checkoutPath = `/${locale}/checkout/${campaignName}`;

  const [view, setView] = useState<ViewState>("loading");
  const [slotsRemaining, setSlotsRemaining] = useState(0);
  const [form, setForm] = useState({ name: "", email: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Fetch the current slot count once on mount so the initial UI reflects
  // real state instead of assuming slots are available.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const remaining = await getRemainingSlots(campaignName);
      if (cancelled) return;
      setSlotsRemaining(remaining);
      setView(remaining > 0 ? "form" : "paywall");
    })();
    return () => {
      cancelled = true;
    };
  }, [campaignName]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }

    setSubmitting(true);
    setError("");

    const result = await claimLeadMagnetSlot(campaignName);

    if (!result.success) {
      // Someone else claimed the last slot between page load and this
      // submit — the atomic action is the source of truth, not the
      // slotsRemaining value already in state.
      router.push(checkoutPath);
      return;
    }

    setSlotsRemaining(result.slotsRemaining);
    setView("success");
    setSubmitting(false);
  }

  if (view === "loading") {
    return (
      <div className={cn("flex items-center justify-center gap-2 py-8 text-sm text-slate-500", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading availability…
      </div>
    );
  }

  if (view === "paywall") {
    return (
      <div
        className={cn(
          "rounded-xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-900/50 dark:bg-amber-950/20",
          className
        )}
      >
        <p className="text-base font-semibold text-amber-900 dark:text-amber-200">
          All free slots claimed. Get your copy instantly for $9.99.
        </p>
        <Button
          className="mt-4 w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 hover:opacity-90"
          onClick={() => router.push(checkoutPath)}
        >
          Get Instant Access — $9.99
        </Button>
      </div>
    );
  }

  if (view === "success") {
    return (
      <div className={cn("flex flex-col items-center gap-3 py-8 text-center", className)}>
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </span>
        <p className="text-lg font-semibold text-slate-900 dark:text-white">
          You&apos;re in! Your free slot has been reserved for <strong>{form.email}</strong>.
        </p>
      </div>
    );
  }

  // view === "form"
  return (
    <form onSubmit={handleSubmit} noValidate className={cn("space-y-4", className)}>
      <p className="text-center text-sm font-medium text-indigo-600 dark:text-indigo-400">
        Only {slotsRemaining} free {slotsRemaining === 1 ? "slot" : "slots"} remaining
      </p>

      <div className="space-y-1">
        <Label htmlFor="lmcf-name">
          Name<span className="ml-1 text-red-500">*</span>
        </Label>
        <Input
          id="lmcf-name"
          name="name"
          autoComplete="name"
          placeholder="Jane Smith"
          value={form.name}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="lmcf-email">
          Email<span className="ml-1 text-red-500">*</span>
        </Label>
        <Input
          id="lmcf-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="jane@example.com"
          value={form.email}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 hover:opacity-90"
        disabled={submitting}
      >
        {submitting ? "Claiming your slot…" : "Claim My Free Slot"}
      </Button>
    </form>
  );
}
