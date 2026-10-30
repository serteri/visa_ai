"use client";

import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { isQaCookie, QA_COOKIE, readCookie } from "@/lib/analytics/policy";
import { disableQaModeAction, enableQaModeAction } from "./actions";

/** Enable, verify and disable QA mode for this browser. The status is read from the cookie the browser actually holds, not from the server's last reply. */
export function QaModeControls() {
  const [active, setActive] = useState<boolean | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const refresh = () => setActive(isQaCookie(readCookie(document.cookie, QA_COOKIE)));
  useEffect(refresh, []);

  const run = (action: () => Promise<unknown>) =>
    start(async () => {
      setError("");
      try {
        await action();
      } catch {
        setError("Not allowed: only a signed-in admin can change QA mode.");
      }
      refresh();
    });

  return (
    <div className="space-y-4">
      <p className="text-sm" data-qa-status>
        QA mode in this browser: <strong>{active === null ? "checking…" : active ? "ON (analytics suppressed)" : "OFF (analytics normal)"}</strong>
      </p>
      <div className="flex flex-wrap gap-3">
        <Button type="button" disabled={pending || active === true} onClick={() => run(enableQaModeAction)}>
          Enable QA mode (8 hours)
        </Button>
        <Button type="button" variant="outline" disabled={pending || active === false} onClick={() => run(disableQaModeAction)}>
          Disable QA mode
        </Button>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
