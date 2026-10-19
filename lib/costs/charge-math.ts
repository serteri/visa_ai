/**
 * The pure arithmetic of the cost calculator (no data imports, so the client component can use it without bundling the fee files).
 * It adds the published charges for the numbers entered; it does not say whether anyone needs to pay a charge or may lodge a visa.
 */
export type ChargeSubclass = "189" | "190" | "491" | "482";

export type ChargeSource = { name: string; url: string; verified: string; effectiveFrom: string | null };
export type ChargeFigure = { amount: number; source: ChargeSource };
export type SubclassCharges = {
  subclass: ChargeSubclass;
  main: ChargeFigure;
  additionalAdult: ChargeFigure;
  child: ChargeFigure;
  /** The second instalment per applicant, where the visa has one. */
  secondInstalment: ChargeFigure | null;
};

export type ChargeLine = { id: "main" | "adult" | "child" | "second"; count: number; unit: number; total: number; source: ChargeSource };
export type ChargeResult = { subclass: ChargeSubclass; lines: ChargeLine[]; total: number };

export const MAX_PEOPLE = 20;
const clamp = (n: number) => (Number.isFinite(n) ? Math.min(MAX_PEOPLE, Math.max(0, Math.floor(n))) : 0);

/** `secondInstalments` is how many applicants the visa page's second-instalment rule covers (only for visas that have one). */
export function computeFromCharges(c: SubclassCharges, input: { additionalAdults: number; children: number; secondInstalments: number }): ChargeResult {
  const lines: ChargeLine[] = [{ id: "main", count: 1, unit: c.main.amount, total: c.main.amount, source: c.main.source }];
  const adults = clamp(input.additionalAdults);
  const kids = clamp(input.children);
  const seconds = c.secondInstalment ? clamp(input.secondInstalments) : 0;
  if (adults) lines.push({ id: "adult", count: adults, unit: c.additionalAdult.amount, total: adults * c.additionalAdult.amount, source: c.additionalAdult.source });
  if (kids) lines.push({ id: "child", count: kids, unit: c.child.amount, total: kids * c.child.amount, source: c.child.source });
  if (seconds && c.secondInstalment) lines.push({ id: "second", count: seconds, unit: c.secondInstalment.amount, total: seconds * c.secondInstalment.amount, source: c.secondInstalment.source });
  return { subclass: c.subclass, lines, total: lines.reduce((n, l) => n + l.total, 0) };
}

export const formatAud = (n: number) => `AUD ${n.toLocaleString("en-US")}`;
