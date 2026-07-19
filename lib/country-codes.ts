export type CountryCode = {
  code: string; // ISO alpha-2
  dial: string; // e.g. "+90"
  label: string;
};

// Curated list covering the site's active locales plus common visa
// source/destination countries. Not exhaustive by design -- an "Other"-style
// long tail isn't needed for this lead form.
export const COUNTRY_CODES: CountryCode[] = [
  { code: "TR", dial: "+90", label: "Türkiye (+90)" },
  { code: "AU", dial: "+61", label: "Australia (+61)" },
  { code: "US", dial: "+1", label: "United States (+1)" },
  { code: "GB", dial: "+44", label: "United Kingdom (+44)" },
  { code: "CN", dial: "+86", label: "China (+86)" },
  { code: "CA", dial: "+1", label: "Canada (+1)" },
  { code: "DE", dial: "+49", label: "Germany (+49)" },
  { code: "FR", dial: "+33", label: "France (+33)" },
  { code: "IN", dial: "+91", label: "India (+91)" },
  { code: "PH", dial: "+63", label: "Philippines (+63)" },
  { code: "PK", dial: "+92", label: "Pakistan (+92)" },
  { code: "NZ", dial: "+64", label: "New Zealand (+64)" },
  { code: "AE", dial: "+971", label: "UAE (+971)" },
  { code: "SG", dial: "+65", label: "Singapore (+65)" },
];

export function defaultDialForLocale(locale: string): string {
  if (locale === "tr") return "+90";
  if (locale === "zh-Hans") return "+86";
  return "+61";
}

// ISO code, not dial code -- dial codes aren't unique (US/CA both "+1"), so
// anything used as a unique selection key (e.g. a <Select> item value) must
// key off `code`, not `dial`.
export function defaultCountryCodeForLocale(locale: string): string {
  if (locale === "tr") return "TR";
  if (locale === "zh-Hans") return "CN";
  return "AU";
}

export function dialForCountryCode(iso: string): string {
  return COUNTRY_CODES.find((c) => c.code === iso)?.dial ?? "+61";
}
