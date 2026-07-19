"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

const IDLE_LIMIT_MS = 5 * 60 * 1000;
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;

/**
 * Belt-and-suspenders for the 5-minute session (see auth.ts's maxAge/updateAge).
 * The server-side JWT expiry already blocks a stale cookie on the *next*
 * request, but a tab left open with no navigation would otherwise sit on a
 * dead session until the user clicks something. This watches for real
 * interaction and force-signs-out client-side the moment the idle window
 * closes, redirecting straight to /login instead of waiting for a request.
 */
export function IdleLogout({ locale }: { locale: string }) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function reset() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const loginPath = locale === "en" ? "/login" : `/${locale}/login`;
        signOut({ redirect: false }).finally(() => router.push(loginPath));
      }, IDLE_LIMIT_MS);
    }

    reset();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, reset, { passive: true }));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [locale, router]);

  return null;
}
