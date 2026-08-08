/**
 * Centralized thresholds for Australian immigration rules.
 *
 * CSIT (Core Skills Income Threshold) is re-indexed annually based on
 * AWOTE (Average Weekly Ordinary Time Earnings). This file is the single
 * source of truth — no other file should hardcode these numbers.
 *
 * History:
 *   - effectiveFrom 2026-07-01: AUD 79,423 (AWOTE-based increase from 76,515)
 */
export const CSIT_HISTORY: ReadonlyArray<{
  /** Threshold value in AUD. */
  value: number;
  /** ISO date from which this threshold applies. */
  effectiveFrom: string;
  /** Human-readable label for PDF/UI display. */
  label: string;
}> = [
  {
    value: 79_423,
    effectiveFrom: "2026-07-01",
    label: "AUD $79,423",
  },
];

/**
 * The current (most recent) CSIT threshold.
 * For any real user applying today (after 1 July 2026), this is the
 * operative value. Historical values remain in CSIT_HISTORY above.
 */
export const CURRENT_CSIT = CSIT_HISTORY[CSIT_HISTORY.length - 1];
