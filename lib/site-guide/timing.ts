/** When the guide's proactive prompt may appear, and the 7-day dismissal cap. Pure decisions; the component owns the timers and storage. */
export const NUDGE_DELAY_MS = 13_000;
export const NUDGE_SCROLL_RATIO = 0.35;
export const DISMISS_DAYS = 7;
export const DISMISS_KEY = "lv_site_guide_nudge_until";

export function dismissUntil(now: number): number {
  return now + DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

/** True when the proactive prompt is suppressed: a dismissal earlier than seven days ago. */
export function nudgeSuppressed(storedUntil: string | number | null | undefined, now: number): boolean {
  const until = Number(storedUntil);
  return Number.isFinite(until) && until > now;
}

/** The prompt shows after about 13 seconds on the page or at 35% scroll, whichever comes first, never on a hidden route and never when suppressed. */
export function shouldNudge(input: { hidden: boolean; suppressed: boolean; elapsedMs: number; scrollRatio: number; panelOpen: boolean; alreadyShown: boolean }): boolean {
  if (input.hidden || input.suppressed || input.panelOpen || input.alreadyShown) return false;
  return input.elapsedMs >= NUDGE_DELAY_MS || input.scrollRatio >= NUDGE_SCROLL_RATIO;
}

export function readSuppression(now: number): boolean {
  try {
    return nudgeSuppressed(window.localStorage.getItem(DISMISS_KEY), now);
  } catch {
    return false;
  }
}

export function writeDismissal(now: number): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(dismissUntil(now)));
  } catch {
    // Storage can be unavailable (private window); the prompt then simply may show again on the next page.
  }
}
