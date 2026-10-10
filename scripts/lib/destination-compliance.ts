/**
 * Compliance scan of the pages a visitor reaches from an occupation page or a campaign link (the acquisition
 * destinations): the tools, the visa pages, the homepage hero / stats, the full-check heading page, and the locale
 * strings they render. Used by scripts/seo-compliance-scan.ts (report) and scripts/test-seo-occupation.ts (gate).
 *
 * It applies the same banned-phrase list as the occupation pages (lib/seo/banned-phrases.ts) to user-visible copy only:
 * comments are stripped, and a short, reviewable allow-list names the factual or technical uses that are not marketing
 * claims (a data field, an import path, an official list name, a "not migration advice" disclaimer). Every allow-list
 * entry says why. Internal engine code, the report generators and the Canada pages are deliberately not scanned here.
 */
import { readFileSync } from "node:fs";

import { BANNED_INFORMATION_PAGE_PHRASES } from "../../lib/seo/banned-phrases";

export const DESTINATION_CODE_FILES = [
  "app/[locale]/(main)/tools/visa-comparison/page.tsx",
  "app/[locale]/(main)/tools/visa-comparison/VisaComparisonClient.tsx",
  "lib/visas/comparison-content.ts",
  "app/[locale]/(main)/tools/points-calculator/page.tsx",
  "app/[locale]/(main)/tools/points-calculator/australia/page.tsx",
  "app/[locale]/(main)/tools/points-calculator/[slug]/page.tsx",
  "app/[locale]/(main)/tools/anzsco-finder/page.tsx",
  "app/[locale]/(main)/tools/anzsco-finder/AnzscoSearchTool.tsx",
  "app/[locale]/(main)/visas/[subclass]/page.tsx",
  "app/[locale]/(main)/full-check/page.tsx",
  "app/[locale]/(main)/resources/occupation-list/page.tsx",
  "components/landing/Hero.tsx",
  "components/landing/StatsBar.tsx",
  "components/sections/PremiumReportShowcase.tsx",
  "lib/seo/points-calculator-content.ts",
  "lib/seo/anzsco-content.ts",
];

/** Locale-string groups rendered on those pages. home.hero.*.ca belongs to the Canada pages and is out of scope. */
const LOCALE_KEY = /^(pc\.|af\.|visas\.|home\.hero\.|home\.reportShowcase\.|home\.stats)/;
const LOCALE_KEY_EXCLUDED = /\.ca$/;

type Allow = { where: RegExp; text: RegExp; why: string };
const ALLOW: Allow[] = [
  { where: /landing\/Hero\.tsx$/, text: /isEligibleForMigration|titleHasEligible|ineligible|non-eligible/, why: "data field and local variables for the occupation dataset's flag, not copy" },
  { where: /landing\/Hero\.tsx$/, text: /NOC eligibility/, why: "Canada fallback copy: Canada is out of scope for this cleanup (listed as a remaining issue)" },
  { where: /./, text: /checkEligibility(Label|Desc)?|visas\.checkEligibility/, why: "translation key and variable names; the copy behind them is scanned separately" },
  { where: /./, text: /不构成(官方)?移民建议|不作移民建议|向注册移民代理寻求建议/, why: "disclaimer that the page is not migration advice, or a pointer to a registered agent" },
  { where: /anzsco-content\.ts$/, text: /评估您的资格和经验/, why: "'qualifications and experience' assessed by an assessing body, not eligibility" },
  { where: /occupation-list\/page\.tsx$/, text: /kontrol edin/, why: "points the reader to the Department of Home Affairs for the current list" },
  { where: /locales\/en\.json:visas\.eligibleCountriesLabel/, text: /Eligible passport countries/, why: "label of a data field (passport countries under the Pacific concession)" },
  { where: /visas\/\[subclass\]\/page\.tsx$/, text: /eligibleCountries|EligibleCountries|Eligible passport countries/i, why: "data field and its label: passport countries eligible under the Pacific concession" },
  { where: /full-check\/page\.tsx$/, text: /readiness\/(report-mode|paid-checkout)|READINESS_REVIEW_SOURCE|cameFromReadinessReview/, why: "import path and internal identifiers, not copy" },
  { where: /anzsco-content\.ts$/, text: /Medium and Long-term Strategic Skills List/, why: "official name of a Home Affairs list" },
  { where: /locales\/en\.json:pc\.step13b/, text: /eligible relative/i, why: "the official nomination-question wording (sponsor eligibility), not a verdict about the visitor" },
  { where: /locales\/zh-Hans\.json:pc\.education/, text: /资格/, why: "'qualification' (a trade qualification), not eligibility" },
  { where: /locales\/zh-Hans\.json:(pc\.insights\.maraDisclaimer|footer)/, text: /建议/, why: "disclaimer that the page is not migration advice" },
  { where: /points-calculator-content\.ts$/, text: /符合条件的教育资格/, why: "'qualifying education qualifications' (points-test term), not eligibility" },
  { where: /visas\.visa482desc|visa482desc/, text: /eligible Hong Kong/i, why: "factual description of the visa's published terms" },
  { where: /locales\/.*:visas\.visa482desc/, text: /./, why: "factual description of the visa's published terms" },
];

export type DestinationHit = { source: string; id: string; excerpt: string };

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function flatten(obj: unknown, prefix = ""): Array<[string, string]> {
  if (typeof obj === "string") return [[prefix, obj]];
  if (obj && typeof obj === "object") return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k));
  return [];
}

function scanText(source: string, text: string, hits: DestinationHit[]): void {
  text.split("\n").forEach((line) => {
    if (/^\s*import\s/.test(line) || /^\s*}\s*from\s/.test(line)) return;
    for (const p of BANNED_INFORMATION_PAGE_PHRASES) {
      const m = line.match(p.re);
      if (!m) continue;
      const at = m.index ?? 0;
      const excerpt = line.trim().slice(Math.max(0, at - 40), at + 70);
      const allowed = ALLOW.some((a) => a.where.test(source) && a.text.test(line));
      if (!allowed) hits.push({ source, id: p.id, excerpt });
    }
  });
}

export function scanDestinationPages(root = process.cwd()): DestinationHit[] {
  const hits: DestinationHit[] = [];
  for (const f of DESTINATION_CODE_FILES) scanText(f, stripComments(readFileSync(`${root}/${f}`, "utf8")), hits);
  for (const loc of ["en", "tr", "zh-Hans"]) {
    const flat = flatten(JSON.parse(readFileSync(`${root}/public/locales/${loc}.json`, "utf8")));
    for (const [key, value] of flat) {
      if (!LOCALE_KEY.test(key) || LOCALE_KEY_EXCLUDED.test(key)) continue;
      scanText(`public/locales/${loc}.json:${key}`, value, hits);
    }
  }
  return hits;
}
