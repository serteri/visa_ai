/**
 * Visa application charge arithmetic (the cost calculator), built only from src/data/visa-fees.json and the verification records in
 * src/data/fee-provenance.json. A subclass is offered only when the main-applicant charge, the additional-applicant charges and (where it exists) the
 * second instalment each have a provenance record with a verified date; a figure without one is not shown. Estimates (medical checks, police
 * certificates, translations, Professional Year ...) are never included: they are not sourced.
 *
 * The calculator adds the published charges for the numbers entered. It does not say whether anyone needs to pay a charge or may lodge a visa.
 */
import feeProvenance from "@/src/data/fee-provenance.json";
import visaFees from "@/src/data/visa-fees.json";
import { OFFICIAL_PAGES } from "@/lib/visas/comparison-content";
import { computeFromCharges, formatAud, type ChargeFigure, type ChargeResult, type ChargeSubclass, type SubclassCharges } from "./charge-math";

export { formatAud, type ChargeResult, type ChargeSubclass, type SubclassCharges };

export const CHARGE_SUBCLASSES: ChargeSubclass[] = ["189", "190", "491", "482"];
export const isChargeSubclass = (v: string): v is ChargeSubclass => (CHARGE_SUBCLASSES as string[]).includes(v);
/** Subclasses deliberately not offered, with the reason (shown on the page). */
export const EXCLUDED_SUBCLASSES: Record<string, string> = {
  "485": "main-applicant charge has no verification record in the fee provenance yet",
  "500": "main-applicant charge has no verification record in the fee provenance yet",
  "186": "no verified charge in the fee provenance",
};

type Fact = { id: string; value: number | null; effective_from: string | null; last_verified: string | null; source: string };
const FACTS = (feeProvenance as unknown as { facts: Fact[] }).facts;
const FEES = (visaFees as unknown as { visas: Record<string, { vac: { main: number; partner_18_plus: number; child_under_18: number; secondInstalmentEnglish?: number } }> }).visas;

const OFFICIAL_482 = "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skills-in-demand-visa-subclass-482/core-skills-stream";
export const officialPageFor = (s: ChargeSubclass) => (s === "482" ? OFFICIAL_482 : OFFICIAL_PAGES[s]);

function figure(subclass: ChargeSubclass, factId: string, amount: number): ChargeFigure {
  const fact = FACTS.find((f) => f.id === factId);
  if (!fact || fact.value !== amount || !fact.last_verified) throw new Error(`fee-provenance.json has no verified fact "${factId}" equal to ${amount} (visa-fees.json): re-verify before showing this charge`);
  return { amount, source: { name: `Home Affairs, subclass ${subclass} visa page ("Cost")`, url: officialPageFor(subclass), verified: fact.last_verified, effectiveFrom: fact.effective_from } };
}

export function chargesFor(subclass: ChargeSubclass): SubclassCharges {
  const v = FEES[subclass].vac;
  const second = v.secondInstalmentEnglish;
  const secondFact = subclass === "491" ? "second_instalment_491" : "second_instalment_189_190";
  return {
    subclass,
    main: figure(subclass, `vac_${subclass}`, v.main),
    additionalAdult: figure(subclass, `vac_additional_adult_${subclass}`, v.partner_18_plus),
    child: figure(subclass, `vac_additional_child_${subclass}`, v.child_under_18),
    secondInstalment: second != null && subclass !== "482" ? figure(subclass, secondFact, second) : null,
  };
}

/** Adds the published charges for the numbers entered (see charge-math.ts). */
export const computeCharges = (subclass: ChargeSubclass, input: { additionalAdults: number; children: number; secondInstalments: number }): ChargeResult => computeFromCharges(chargesFor(subclass), input);
