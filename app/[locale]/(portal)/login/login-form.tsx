"use client";

import { useActionState, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, type LoginState } from "./actions";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm({ locale, callbackUrl }: { locale: string; callbackUrl?: string }) {
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(loginAction, {});
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Client-side validation runs before the server action fires -- action={}
  // submits automatically on a native form submit event, so preventDefault()
  // here is what actually blocks an invalid submission from reaching it.
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    const fd = new FormData(e.currentTarget);
    const email = ((fd.get("email") as string) ?? "").trim();
    const password = (fd.get("password") as string) ?? "";
    let hasError = false;

    if (!email) {
      setEmailError("Please enter your email.");
      hasError = true;
    } else if (!EMAIL_PATTERN.test(email)) {
      setEmailError("Please enter a valid email address.");
      hasError = true;
    } else {
      setEmailError("");
    }

    if (!password) {
      setPasswordError("Please enter your password.");
      hasError = true;
    } else {
      setPasswordError("");
    }

    if (hasError) e.preventDefault();
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} noValidate className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      {callbackUrl ? <input type="hidden" name="callbackUrl" value={callbackUrl} /> : null}

      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          onChange={() => emailError && setEmailError("")}
          aria-invalid={emailError ? true : undefined}
          className={emailError ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500" : undefined}
        />
        {emailError ? <p className="text-sm text-red-500 mt-1.5">{emailError}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="login-password">Password</Label>
        <Input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          onChange={() => passwordError && setPasswordError("")}
          aria-invalid={passwordError ? true : undefined}
          className={passwordError ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500" : undefined}
        />
        {passwordError ? <p className="text-sm text-red-500 mt-1.5">{passwordError}</p> : null}
      </div>

      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" className="h-11 w-full rounded-lg text-sm font-semibold" disabled={isPending}>
        {isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
