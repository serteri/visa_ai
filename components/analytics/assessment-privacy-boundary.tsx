"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Report links carry access credentials. Never initialise GA on those documents or their client-side continuations. */
export function AssessmentPrivacyBoundary({ gaId, children }: { gaId: string; children: ReactNode }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const path = pathname.replace(/^\/(en|tr|zh-Hans)(?=\/|$)/, "");
  const privatePage = path.startsWith("/full-check/result") || (path === "/full-check" && ["goal", "occupation", "biggestConcern", "currentCountry", "visaInterest", "preferredPathway", "email", "name", "reportId", "t"].some(key => search.has(key)));
  const [startedPrivate] = useState(privatePage);
  const blocked = privatePage || startedPrivate;
  useEffect(() => {
    (window as unknown as Record<string, unknown>)[`ga-disable-${gaId}`] = blocked;
  }, [blocked, gaId]);
  return blocked ? null : children;
}
