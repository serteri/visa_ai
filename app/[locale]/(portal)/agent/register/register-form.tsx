"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerAgentAction, type RegisterState } from "./actions";

export function AgentRegisterForm({ locale }: { locale: string }) {
  const action = registerAgentAction.bind(null, locale);
  const [state, formAction, isPending] = useActionState<RegisterState, FormData>(action, {});
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);

  const passwordsMismatch = confirmTouched && confirmPassword.length > 0 && password !== confirmPassword;

  // Client-side gate only -- the server action re-checks password ===
  // confirmPassword itself (never trust client validation alone).
  // confirmPassword is read here purely for this comparison; it's never
  // sent anywhere beyond this form and the server never persists it.
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (password !== confirmPassword) {
      e.preventDefault();
      setConfirmTouched(true);
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="register-name">Full name</Label>
        <Input id="register-name" name="name" required autoComplete="name" placeholder="John Doe" />
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-confirm-password">Confirm password</Label>
        <Input
          id="register-confirm-password"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onBlur={() => setConfirmTouched(true)}
          aria-invalid={passwordsMismatch}
          className={passwordsMismatch ? "border-red-500 focus-visible:ring-red-500" : ""}
        />
        {passwordsMismatch && <p className="text-xs text-red-600">Passwords do not match.</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="register-phone">Phone</Label>
          <Input id="register-phone" name="phone" type="tel" autoComplete="tel" placeholder="+61 400 000 000" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="register-company">Company name</Label>
          <Input id="register-company" name="companyName" placeholder="Acme Corporation" />
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
