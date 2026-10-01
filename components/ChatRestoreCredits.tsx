"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage, useTranslation } from "@/contexts/language-context";

/**
 * "Restore my credits": the visitor enters the email they bought with; the server answers the same way whether or
 * not that email has credits (and emails a one-time link only if it does), so this UI says "if this email has
 * credits" and never confirms either way.
 */
export function ChatRestoreCredits() {
  const { t } = useTranslation();
  const { language: locale } = useLanguage();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function submit() {
    setMessage(null);
    if (!email.trim()) {
      setMessage({ kind: "error", text: t("chat.restore.invalidEmail", "Please enter a valid email address.") });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/chat/restore/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), locale }),
      });
      if (res.status === 400) {
        setMessage({ kind: "error", text: t("chat.restore.invalidEmail", "Please enter a valid email address.") });
      } else if (res.status === 429) {
        setMessage({ kind: "error", text: t("chat.restore.rateLimited", "Too many requests. Please try again in an hour.") });
      } else if (res.ok) {
        setMessage({
          kind: "ok",
          text: t(
            "chat.restore.sent",
            "If this email has credits, we have sent a restore link to it. The link works once and expires in 30 minutes.",
          ),
        });
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch {
      setMessage({ kind: "error", text: t("chat.restore.error", "Something went wrong. Please try again.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-muted-foreground underline-offset-2 hover:underline"
      >
        {t("chat.restore.link", "Restore my credits")}
      </button>
      {open && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {t("chat.restore.prompt", "Enter the email you used when you bought credits. We will email you a one-time link.")}
          </p>
          <Input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setMessage(null);
            }}
            placeholder={t("chat.emailPlaceholder", "Enter your email address")}
            disabled={busy}
            className="text-center"
          />
          <Button variant="outline" onClick={submit} disabled={busy} className="w-full px-6">
            {busy ? t("chat.restore.sending", "Sending...") : t("chat.restore.send", "Email me a restore link")}
          </Button>
          {message && (
            <p role="status" className={message.kind === "ok" ? "text-xs text-foreground" : "text-xs text-red-600"}>
              {message.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
