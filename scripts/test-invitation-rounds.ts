/**
 * /tools/invitation-rounds returned HTTP 500 on cache hits (TR / zh-Hans): unstable_cache serialises to JSON, so roundDate came back as a string and
 * `.toISOString()` threw. The page now normalises rows and falls back to the seed data. Run: npx tsx scripts/test-invitation-rounds.ts
 */
import { readFileSync } from "node:fs";
import { buildInvitationRoundsSchema, getInvitationRoundsSeoContent } from "../lib/seo/invitation-rounds-content";
import { normaliseDbRounds } from "../lib/invitation-rounds/normalise";
import { DESTINATIONS } from "../lib/site-guide/route-registry";

let failures = 0;
const check = (c: boolean, m: string) => { if (c) console.log(`  ✅ ${m}`); else { failures++; console.error(`  ❌ ${m}`); } };

const row = { id: "r1", roundDate: new Date("2025-09-10T00:00:00Z"), visaSubclass: "189", visaName: "Skilled Independent", invitations: 300, lowestPoints: 85, poolSize: 1200, notes: null, isEstimated: false, source: "DoHA Official", createdAt: new Date("2025-09-11T05:00:00Z") };

console.log("\n1. rows from the database and from the JSON cache both normalise");
const fresh = normaliseDbRounds([row]);
const cached = normaliseDbRounds(JSON.parse(JSON.stringify([row])));
check(fresh.rounds.length === 1 && fresh.rounds[0].date === "2025-09-10", "Date columns (fresh read) -> ISO date");
check(cached.rounds.length === 1 && cached.rounds[0].date === "2025-09-10", "ISO-string columns (cache hit, the production failure) -> the same ISO date");
check(cached.latestScraped?.toISOString() === "2025-09-11T05:00:00.000Z", "latest scraped time survives the JSON round-trip");
check(JSON.stringify(fresh.rounds) === JSON.stringify(cached.rounds), "fresh and cached reads give identical rounds");

console.log("\n2. missing, empty and malformed data never throws");
for (const [label, v] of [["undefined", undefined], ["null", null], ["empty array", []], ["a non-array", { a: 1 }], ["a string", "x"]] as Array<[string, unknown]>) {
  let ok = true; let out;
  try { out = normaliseDbRounds(v); } catch { ok = false; }
  check(ok && out!.rounds.length === 0 && out!.latestScraped === null, `${label} -> no rounds, no throw (page uses the seed data)`);
}
const mixed = normaliseDbRounds([null, 7, "x", { ...row, roundDate: "not a date" }, { ...row, roundDate: undefined }, { ...row, invitations: "many" }, { ...row, visaSubclass: 189 }, { ...row, id: "ok", lowestPoints: null, poolSize: "n/a", notes: 5, isEstimated: "yes", createdAt: "bad" }]);
check(mixed.rounds.length === 1 && mixed.rounds[0].id === "ok", "unreadable rows are dropped, the readable one is kept");
check(mixed.rounds[0].lowestPoints === null && mixed.rounds[0].poolSize === null && mixed.rounds[0].notes === null && mixed.rounds[0].isEstimated === false, "optional fields that are malformed become null / false");
check(mixed.latestScraped === null, "an invalid createdAt does not produce a scraped time");

console.log("\n3. page source: no unguarded Date methods, seed fallback, canonical/hreflang unchanged");
const page = readFileSync("app/[locale]/(main)/tools/invitation-rounds/page.tsx", "utf8");
check(/normaliseDbRounds\(dbRounds\)/.test(page) && !/round\.roundDate\.|\.createdAt\)\s*\.sort|\.getTime\(\)/.test(page), "the page reads rows only through normaliseDbRounds");
check(/db\.rounds\.length > 0\s*\?\s*db\.rounds\s*:\s*eoiRounds\.rounds/.test(page), "empty or unreadable data falls back to the seed JSON, not an error");
check(/catch \(error\)[\s\S]*console\.error/.test(page), "a failed database read is caught");
check(/alternates: pageAlternates\(locale, `\/tools\/invitation-rounds`\)/.test(page) && /url: publicUrl\(locale, `\/tools\/invitation-rounds`\)/.test(page), "canonical / hreflang generation is unchanged");
check(/Data sourced from official DoHA SkillSelect invitation rounds page\. Last verified: November 2025\./.test(page), "the source / verification wording is unchanged");

console.log("\n4. locale content: each locale renders its own text, no leakage");
const en = getInvitationRoundsSeoContent("en"), tr = getInvitationRoundsSeoContent("tr"), zh = getInvitationRoundsSeoContent("zh-Hans");
for (const [loc, c] of [["en", en], ["tr", tr], ["zh-Hans", zh]] as const) check(c.sections.length > 0 && c.faqs.length > 0 && c.intro.length > 0, `${loc}: content present`);
check(tr.aboutTitle !== en.aboutTitle && zh.aboutTitle !== en.aboutTitle && zh.aboutTitle !== tr.aboutTitle, "the three locales have distinct content");
check(/[一-鿿]/.test(zh.intro) && !/[一-鿿]/.test(tr.intro + en.intro), "Chinese text appears only in the zh-Hans content");
check(/[ğşıüöç]/i.test(tr.intro) && !/[ğşı]/i.test(zh.intro), "Turkish text appears only in the tr content");
check(getInvitationRoundsSeoContent("fr").aboutTitle === en.aboutTitle, "an unknown locale falls back to English");
for (const loc of ["en", "tr", "zh-Hans"]) {
  const s = JSON.parse(buildInvitationRoundsSchema(loc));
  check(s["@type"] === "FAQPage" && s.mainEntity.length === getInvitationRoundsSeoContent(loc).faqs.length, `${loc}: FAQ schema builds from its own FAQs`);
}

console.log("\n5. Site Guide destination");
const d = DESTINATIONS.find((x) => x.id === "au-invitation-rounds");
check(d?.path === "/tools/invitation-rounds", "the Site Guide's invitation-rounds destination is /tools/invitation-rounds (the fixed route)");

if (failures) { console.error(`\n❌ ${failures} check(s) failed`); process.exit(1); }
console.log("\n✅ ALL CHECKS PASSED");
