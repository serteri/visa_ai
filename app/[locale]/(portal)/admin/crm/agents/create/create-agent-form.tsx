"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAgentAction, type CreateAgentState } from "../../actions";

export function CreateAgentForm({ locale }: { locale: string }) {
  const action = createAgentAction.bind(null, locale);
  const [state, formAction, isPending] = useActionState<CreateAgentState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="create-agent-first-name">First name</Label>
          <Input id="create-agent-first-name" name="firstName" required autoComplete="given-name" placeholder="Jane" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-agent-last-name">Last name</Label>
          <Input id="create-agent-last-name" name="lastName" required autoComplete="family-name" placeholder="Doe" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="create-agent-email">Email</Label>
        <Input
          id="create-agent-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="agent@example.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="create-agent-password">Password</Label>
        <Input
          id="create-agent-password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="create-agent-commission-rate">Commission rate (%)</Label>
        <Input
          id="create-agent-commission-rate"
          name="commissionRate"
          type="number"
          required
          min={0}
          max={100}
          step="0.1"
          placeholder="20"
        />
      </div>

      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <Button type="submit" className="h-11 w-full rounded-lg text-sm font-semibold" disabled={isPending}>
        {isPending ? "Creating agent…" : "Create Agent"}
      </Button>
    </form>
  );
}
