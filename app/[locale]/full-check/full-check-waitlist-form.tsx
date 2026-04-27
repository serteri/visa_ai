"use client";

import { useActionState } from "react";
import { LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function ReportSection({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-primary">-</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function LockedSection({ title }: { title: string }) {
  return (
    <Card className="relative overflow-hidden border-dashed">
      <CardHeader className="opacity-45 blur-[1px]">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="opacity-45 blur-[1px]">
        <p className="text-sm text-muted-foreground">
          A deeper section will be available in the more detailed version.
        </p>
      </CardContent>
      <div className="absolute inset-0 flex items-center justify-center bg-background/65 p-4 backdrop-blur-[1px]">
        <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-2 text-sm font-medium shadow-sm">
          <LockKeyhole className="size-4 text-primary" />
          <span>Locked</span>
        </div>
      </div>
    </Card>
  );
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
    <div className="space-y-6">
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
          {isPending ? "Generating..." : "Get free basic report"}
        </Button>
      </form>

      {state.status === "success" && state.report && (
        <section className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-xl font-bold">Your basic readiness report</h3>
            <p className="text-sm text-muted-foreground">
              This limited report provides general information only and uses the details you submitted.
            </p>
          </div>

          <ReportSection title="Possible pathways" items={state.report.possiblePathways} />
          <ReportSection title="Basic risk indicators" items={state.report.riskIndicators} />
          <ReportSection title="Basic document checklist" items={state.report.documentChecklist} />

          <div className="grid gap-3">
            <LockedSection title="Detailed risk breakdown" />
            <LockedSection title="Step-by-step plan" />
            <LockedSection title="Downloadable report" />
          </div>
        </section>
      )}
    </div>
  );
}
