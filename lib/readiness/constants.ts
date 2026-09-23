import visaFeesData from "../../src/data/visa-fees.json";

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

/**
 * Base Visa Application Charge (VAC) per subclass, post-1 July 2026
 * schedule. Matches src/data/visa-fees.json and src/data/visa-details.json
 * exactly -- this is the single source every surface that quotes a base
 * charge (engine.ts's Financial Roadmap / GOV_FEES tables, next-steps.ts,
 * the chat system prompt, the personalized FAQ and application guide) must
 * read from, instead of each hardcoding its own copy of the number.
 */
export const BASE_VAC_AUD: Readonly<Record<string, number>> = {
  "482": 4015,
  "189": 6135,
  "190": 6140,
  "491": 6140,
};

/**
 * Additional-applicant VAC for one subclass, read straight from
 * src/data/visa-fees.json (the same file BASE_VAC_AUD mirrors): `adult` is
 * the charge for each partner/dependant aged 18+, `child` for each child
 * under 18. Returns null when the file has no such figures for the subclass
 * (callers must then omit the line, never invent a number).
 */
export function resolveAdditionalApplicantVac(subclass: string): { adult: number; child: number } | null {
  const visas = (visaFeesData as unknown as {
    visas: Record<string, { vac?: { partner_18_plus?: number; child_under_18?: number } }>;
  }).visas;
  const vac = visas[subclass]?.vac;
  if (!vac || typeof vac.partner_18_plus !== "number" || typeof vac.child_under_18 !== "number") return null;
  return { adult: vac.partner_18_plus, child: vac.child_under_18 };
}

/**
 * Returns the base VAC for the first applicable subclass found in
 * `subclasses` (in the order given), or null if none of them have a known
 * charge in {@link BASE_VAC_AUD}.
 */
export function resolveBaseVac(
  subclasses: readonly string[]
): { subclass: string; amount: number } | null {
  for (const subclass of subclasses) {
    if (subclass in BASE_VAC_AUD) {
      return { subclass, amount: BASE_VAC_AUD[subclass] };
    }
  }
  return null;
}

/**
 * Second-instalment English surcharge, per subclass -- 189/190 and 491 are
 * NOT the same figure (src/data/visa-fees.json's own vac_note text states
 * "AUD 4,885.00" for 189/190 and "AUD 4,890.00" for 491). A single flat
 * constant applied to all three subclasses was a real bug (Phase 1 report
 * consistency audit, item D6) -- always resolve through
 * {@link resolveSecondInstalmentAud} instead of hardcoding one number.
 */
export const SECOND_INSTALMENT_AUD: Readonly<Record<string, number>> = {
  "189": 4885,
  "190": 4885,
  "491": 4890,
};

/**
 * Resolves the second-instalment charge for whichever subclass(es) are
 * relevant. When both the 4,885 group (189/190) and 491 are simultaneously
 * relevant, returns a { min, max } range rather than guessing one number --
 * callers must render both figures explicitly in that case.
 */
export function resolveSecondInstalmentAud(
  subclasses: readonly string[]
): number | { min: number; max: number } {
  const has189or190 = subclasses.some((s) => s === "189" || s === "190");
  const has491 = subclasses.includes("491");
  if (has189or190 && has491) return { min: 4885, max: 4890 };
  if (has491) return SECOND_INSTALMENT_AUD["491"];
  return SECOND_INSTALMENT_AUD["189"];
}

// (INCOME_THRESHOLD_491_TO_191_AUD, a AUD 53,900/year taxable-income threshold for the 491 -> 191 transition,
// was removed on 2026-09-23: the subclass 191 document in data/knowledge states "There is no minimum income
// requirement" -- the requirement is ATO notices of assessment for three income years out of the five years of
// the eligible visa. See the 491 -> 191 item in engine.ts and fee-provenance.json "income_requirement_491_to_191".)

/**
 * How long an English-test score remains valid, per country's own skilled-
 * migration program. Australia and Canada (Express Entry) genuinely differ
 * here -- this is NOT a single shared number, and the generic "2-3 years"
 * disclaimer some report copy used is exactly the kind of blended, imprecise
 * figure this constant exists to replace.
 */
export const ENGLISH_TEST_VALIDITY_YEARS: Readonly<Record<"AU" | "CA", number>> = {
  AU: 3,
  CA: 2,
};
