/** How a page fetch failed, in three classes the admin can act on (plus "other" for server errors and empty pages). Stored as a prefix of last_error. */
export type FailureClass = "blocked" | "not_found" | "network" | "other";

export const FAILURE_CLASS_LABEL: Record<FailureClass, string> = {
  blocked: "blocked by site",
  not_found: "not found",
  network: "network / timeout",
  other: "other",
};

export function classifyStatus(status: number): FailureClass {
  if (status === 403 || status === 429) return "blocked";
  if (status === 404 || status === 410) return "not_found";
  return "other";
}

/** A thrown fetch error (DNS, connection reset, abort, timeout) is a network / timeout failure. */
export const classifyThrown = (): FailureClass => "network";

export type PageFailure = { cls: FailureClass; message: string };

export const encodeFailure = (f: PageFailure) => `${f.cls}: ${f.message}`.slice(0, 300);

export function decodeFailure(lastError: string | null): { cls: FailureClass; label: string; message: string } | null {
  if (!lastError) return null;
  const m = /^(blocked|not_found|network|other): ([\s\S]*)$/.exec(lastError);
  const cls = (m?.[1] as FailureClass | undefined) ?? "other";
  return { cls, label: FAILURE_CLASS_LABEL[cls], message: m ? m[2] : lastError };
}
