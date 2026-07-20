"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

const REF_COOKIE = "logivisa_ref";
const REF_COOKIE_MAX_AGE_DAYS = 30;

/**
 * Affiliate/partner link capture: if the visitor arrived via
 * ?ref=<agentUserId>, stash it in a cookie so the assessment form's server
 * action (full-check/actions.ts) can read it at submit time -- potentially
 * several pages and minutes later -- and auto-assign the resulting lead to
 * that agent instead of dropping it in the manual pool. Cookie over
 * localStorage since the value needs to be readable server-side via
 * next/headers' cookies(), which localStorage can't do.
 *
 * Mounted in the root (main) layout rather than only on /full-check, since a
 * referral link can land a visitor on any page before they navigate to the
 * assessment.
 */
export function RefCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (!ref) return;

    const maxAge = REF_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
    document.cookie = `${REF_COOKIE}=${encodeURIComponent(ref)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }, [searchParams]);

  return null;
}

export { REF_COOKIE };
