/**
 * Passport country versus destination (en / tr / zh-Hans), shared by the form (client) and the submit action (server). Pure: no server-only imports.
 *
 *  - A passport country equal to the destination (AU -> AU, CA -> CA) is not offered, is cleared if it was chosen before the destination changed, and
 *    is rejected on the server: citizens of a country do not need a visa for that country.
 *  - The current-country list is not filtered (onshore applicants).
 *  - A New Zealand passport on the Australian form is allowed, with one fixed note on the form and in the report's "Your details".
 */
import { INTAKE_COUNTRIES } from "@/lib/intake/fields";

export type PassportLocale = "en" | "tr" | "zh-Hans";
export type Destination = "AU" | "CA";

export const toPassportLocale = (locale: string | null | undefined): PassportLocale => (locale === "tr" ? "tr" : locale === "zh-Hans" ? "zh-Hans" : "en");

export const isDestination = (value: unknown): value is Destination => value === "AU" || value === "CA";

/** The destination named by a ?country= value (any letter case), or "" when it names none. */
export const destinationFromParam = (value: unknown): Destination | "" => {
  const upper = String(value ?? "").trim().toUpperCase();
  return isDestination(upper) ? upper : "";
};

/** The passport-country choices for a destination: every intake country except the destination itself (all of them while no destination is chosen). */
export function passportCountryOptions(destination: string | null | undefined): ReadonlyArray<(typeof INTAKE_COUNTRIES)[number]> {
  const d = String(destination ?? "").toUpperCase();
  return isDestination(d) ? INTAKE_COUNTRIES.filter((c) => c.code !== d) : INTAKE_COUNTRIES;
}

export const countryName = (code: string, locale: PassportLocale): string => {
  const c = INTAKE_COUNTRIES.find((x) => x.code === code.toUpperCase());
  return c ? c.label[locale] : code;
};

/** True when the passport country is the destination (AU -> AU, CA -> CA). */
export function passportIsDestination(passport: string | null | undefined, destination: string | null | undefined): boolean {
  const p = String(passport ?? "").trim().toUpperCase();
  const d = String(destination ?? "").trim().toUpperCase();
  return isDestination(d) && p === d;
}

/** The server's rejection: "Citizens of X do not need a visa for X. If you hold another passport, select that one." */
export function passportSameAsDestinationMessage(destination: Destination, locale: PassportLocale): string {
  const c = countryName(destination, locale);
  if (locale === "tr") return `${c} vatandaşlarının ${c} için vizeye ihtiyacı yoktur. Başka bir pasaportunuz varsa onu seçin.`;
  if (locale === "zh-Hans") return `${c}公民前往${c}无需签证。如果您持有其他护照，请选择该护照。`;
  return `Citizens of ${c} do not need a visa for ${c}. If you hold another passport, select that one.`;
}

/** The short note shown when changing the destination cleared a passport country that had been chosen. */
export function passportClearedNote(destination: Destination, locale: PassportLocale): string {
  const c = countryName(destination, locale);
  if (locale === "tr") return `Pasaport ülkesi temizlendi: ${c} vatandaşlarının ${c} için vizeye ihtiyacı yoktur. Başka bir pasaportunuz varsa onu seçin.`;
  if (locale === "zh-Hans") return `护照国家已清除：${c}公民前往${c}无需签证。如果您持有其他护照，请选择该护照。`;
  return `Passport country cleared: citizens of ${c} do not need a visa for ${c}. If you hold another passport, select that one.`;
}

/** New Zealand passport, Australian destination: shown on the form and as a line in the report's "Your details". */
export function newZealandAustraliaNote(locale: PassportLocale): string {
  if (locale === "tr") return "Yeni Zelanda vatandaşları genellikle Özel Kategori Vizesi (subclass 444) ile Avustralya'da yaşayabilir ve çalışabilir ve kalıcı oturum için ayrı bir yolları vardır; bu rapor yalnızca diğer vizeleri kapsar.";
  if (locale === "zh-Hans") return "新西兰公民通常可凭特殊类别签证（444 子类）在澳大利亚生活和工作，并有单独的永久居留途径；本报告仅涵盖其他签证。";
  return "New Zealand citizens can generally live and work in Australia on a Special Category visa (subclass 444) and have a separate pathway to permanent residence; this report covers other visas only.";
}

const NZ_VALUES = new Set(["nz", "new zealand", "yeni zelanda", "新西兰"]);
export const isNewZealandPassport = (passport: string | null | undefined): boolean => NZ_VALUES.has(String(passport ?? "").trim().toLowerCase());

/** Choosing (or changing) the destination: the passport country is cleared, with a short note, when it equals the new destination. */
export function applyDestination(passport: string, destination: Destination, locale: PassportLocale): { passport: string; note: string | null } {
  return passportIsDestination(passport, destination) ? { passport: "", note: passportClearedNote(destination, locale) } : { passport, note: null };
}
