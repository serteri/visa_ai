"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  type FullCheckWaitlistState,
  submitFullCheckWaitlist,
} from "@/app/[locale]/full-check/actions";

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600">{message}</p>;
}

export function FullCheckWaitlistForm({ locale }: { locale: string }) {
  const initialState: FullCheckWaitlistState = {
    status: "idle",
  };

  const [state, formAction, isPending] = useActionState(
    submitFullCheckWaitlist,
    initialState
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="preferredLanguage" value={locale} />
      <input type="hidden" name="source" value="full_check" />

      <div className="space-y-2">
        <Label htmlFor="waitlist-full-name">Full name</Label>
        <Input
          id="waitlist-full-name"
          name="fullName"
          autoComplete="name"
          placeholder="Your name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="waitlist-email">Email address</Label>
        <Input
          id="waitlist-email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
        />
        <ErrorText message={state.errors?.email} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="waitlist-visa-interest">Visa interest</Label>
        <Input
          id="waitlist-visa-interest"
          name="visaInterest"
          placeholder="Student, skilled, partner, or not sure"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="waitlist-current-country">Current country</Label>
        <Input
          id="waitlist-current-country"
          name="currentCountry"
          autoComplete="country-name"
          placeholder="Australia, Turkiye, India, or elsewhere"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="waitlist-main-goal">Main goal</Label>
        <Textarea
          id="waitlist-main-goal"
          name="mainGoal"
          placeholder="Tell us what you want the report to help with"
          rows={3}
        />
      </div>

      {state.status === "success" && state.message && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {state.message}
        </p>
      )}

      {state.status === "error" && state.message && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Joining..." : "Get early access"}
      </Button>
    </form>
  );
}
