"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerAgentAction, type RegisterState } from "./actions";

export function AgentRegisterForm({ locale }: { locale: string }) {
  const action = registerAgentAction.bind(null, locale);
  const [state, formAction, isPending] = useActionState<RegisterState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="register-name">Full name</Label>
        <Input id="register-name" name="name" required autoComplete="name" placeholder="Ahmet Yilmaz" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-email">Email</Label>
        <Input
          id="register-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-password">Password</Label>
        <Input
          id="register-password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="register-phone">Phone</Label>
          <Input id="register-phone" name="phone" type="tel" autoComplete="tel" placeholder="+61 412 345 678" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="register-company">Company name</Label>
          <Input id="register-company" name="companyName" placeholder="Yilmaz Migration Services" />
        </div>
      </div>

      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <Button type="submit" className="h-11 w-full rounded-lg text-sm font-semibold" disabled={isPending}>
        {isPending ? "Creating account…" : "Apply as an agent"}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Already have an account?{" "}
        <a href={`${locale === "en" ? "" : `/${locale}`}/login`} className="font-medium text-indigo-600 hover:underline">
          Sign in
        </a>
      </p>
    </form>
  );
}
