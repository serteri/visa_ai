"use client";

import { useActionState, useState } from "react";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerAgentAction, type RegisterState } from "./actions";

// Mirrored server-side in actions.ts's registerSchema -- keep both in sync
// if a rule changes. label is what the live checklist shows the user.
const PASSWORD_RULES: { label: string; test: (value: string) => boolean }[] = [
  { label: "En az 10 karakter", test: (v) => v.length >= 10 },
  { label: "En az 1 büyük harf", test: (v) => /[A-Z]/.test(v) },
  { label: "En az 1 küçük harf", test: (v) => /[a-z]/.test(v) },
  { label: "En az 1 rakam", test: (v) => /[0-9]/.test(v) },
  { label: "En az 1 özel karakter", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

function PasswordChecklist({ password }: { password: string }) {
  return (
    <ul className="space-y-1 pt-1">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li
            key={rule.label}
            className={`flex items-center gap-1.5 text-xs ${met ? "text-emerald-600" : "text-slate-400"}`}
          >
            {met ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

export function AgentRegisterForm({ locale }: { locale: string }) {
  const action = registerAgentAction.bind(null, locale);
  const [state, formAction, isPending] = useActionState<RegisterState, FormData>(action, {});
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);

  const passwordsMismatch = confirmTouched && confirmPassword.length > 0 && password !== confirmPassword;
  const passwordValid = PASSWORD_RULES.every((rule) => rule.test(password));
  const canSubmit = passwordValid && confirmPassword.length > 0 && password === confirmPassword;

  // Client-side gate only -- the server action re-checks password ===
  // confirmPassword itself (never trust client validation alone).
  // confirmPassword is read here purely for this comparison; it's never
  // sent anywhere beyond this form and the server never persists it.
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!passwordValid || password !== confirmPassword) {
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
          minLength={10}
          autoComplete="new-password"
          placeholder="At least 10 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordChecklist password={password} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-confirm-password">Confirm password</Label>
        <Input
          id="register-confirm-password"
          name="confirmPassword"
          type="password"
          required
          minLength={10}
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

      <Button
        type="submit"
        className="h-11 w-full rounded-lg text-sm font-semibold"
        disabled={isPending || !canSubmit}
      >
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
