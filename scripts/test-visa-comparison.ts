/**
 * The 189 / 190 / 491 comparison table (lib/visas/comparison-content.ts): every displayed figure is sourced, the retired
 * unsourced values are gone in every locale, the wording is information-only, and the links are official.
 *
 *   npx tsx scripts/test-visa-comparison.ts
 */
import { readFileSync } from "node:fs";

import { findBannedPhrases } from "../lib/seo/banned-phrases";
import {
  COMPARISON_SUBCLASSES,
  OFFICIAL_PAGES,
  PROCESSING_GUIDE_URL,
  comparisonContent,
  comparisonText,
  formatAud,
  mainApplicantCharge,
} from "../lib/visas/comparison-content";

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else {
    failures++;
    console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`);
  }
};

const LOCALES = ["en", "tr", "zh-Hans"] as const;

console.log("1. fees");
// Department of Home Affairs visa pages, main applicant "From" charge, checked 2026-10-10 (subclass 189 points-tested stream,
// 190, 491). Update these three numbers -- and src/data/visa-fees.json -- together when the Department changes a charge.
const OFFICIAL: Record<string, number> = { "189": 6135, "190": 6140, "491": 6140 };
for (const s of COMPARISON_SUBCLASSES) check(mainApplicantCharge(s) === OFFICIAL[s], `subclass ${s}: repository charge = ${OFFICIAL[s]} (Home Affairs)`, String(mainApplicantCharge(s)));
check(formatAud(6135) === "AUD 6,135" && formatAud(6140) === "AUD 6,140", "formatted as AUD with thousands separators");
for (const l of LOCALES) {
  const fee = comparisonContent(l).rows.find((r) => r.values[0].startsWith("AUD"));
  check(!!fee && JSON.stringify(fee.values) === JSON.stringify(["AUD 6,135", "AUD 6,140", "AUD 6,140"]), `[${l}] the fee row shows 6,135 / 6,140 / 6,140`, JSON.stringify(fee?.values));
}

console.log("\n2. unsourced values removed (every locale)");
for (const l of LOCALES) {
  const text = comparisonText(l);
  check(!/4,640|4640/.test(text), `[${l}] the old AUD 4,640 charge is gone`);
  check(!/12\s*[-–]\s*24|6\s*[-–]\s*12\s*(mo|ay|个月|月)/i.test(text), `[${l}] no processing-time estimate`);
  const processing = comparisonContent(l).rows[comparisonContent(l).rows.length - 1];
  check(processing.values.every((v) => !/\d/.test(v)), `[${l}] the processing-time cells carry no number (they point to the official guide)`, JSON.stringify(processing.values));
  check(!/competitive|rekabet|竞争|80\+|75\+|65\+/i.test(text), `[${l}] no "competitive score"`);
  check(!/\+\s?5\b|\+\s?15\b|extra points|ek puan|额外加分/i.test(text), `[${l}] no unsourced "extra points" row`);
}

console.log("\n3. wording and sources");
for (const l of LOCALES) check(findBannedPhrases(comparisonText(l)).length === 0, `[${l}] no eligibility / recommendation / strategy wording`, findBannedPhrases(comparisonText(l)).join());
const { officialPages, processingGuide } = comparisonContent("en");
check(officialPages.length === 3 && officialPages.every((p) => /^https:\/\/immi\.homeaffairs\.gov\.au\//.test(p.url)), "three Home Affairs visa-page links");
check(processingGuide.url === PROCESSING_GUIDE_URL && /^https:\/\/immi\.homeaffairs\.gov\.au\//.test(PROCESSING_GUIDE_URL), "the processing time guide link is a Home Affairs page");
check(OFFICIAL_PAGES["189"].includes("skilled-independent-189") && OFFICIAL_PAGES["190"].includes("skilled-nominated-190") && OFFICIAL_PAGES["491"].includes("skilled-work-regional-provisional-491"), "each link points at its own subclass page");

console.log("\n4. the page component");
const client = readFileSync("app/[locale]/(main)/tools/visa-comparison/VisaComparisonClient.tsx", "utf8");
check(/comparisonContent\(locale\)/.test(client) && !/\$\s?\d|AUD\s?\d/.test(client), "the component renders comparisonContent() and holds no figure of its own");
check(/data-official-source/.test(client), "the official links are marked for the outbound-click event");

if (failures) {
  console.error(`\n❌ ${failures} check(s) failed`);
  process.exit(1);
}
console.log("\n✅ ALL CHECKS PASSED");
