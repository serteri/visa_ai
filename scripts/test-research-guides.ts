/**
 * Sprint 2E Wave 1 research guides: slugs, structure, official sources, banned language, sitemap, analytics allow-list and routing.
 *   npx tsx scripts/test-research-guides.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";

import sitemap from "../app/sitemap";
import { sanitizeParams } from "../lib/analytics/events";
import { RESEARCH_GUIDES, GUIDES_CHECKED_ON } from "../lib/guides/research-guides";
import { RESEARCH_GUIDE_SLUGS } from "../lib/guides/slugs";
import { HOME_GUIDE_SLUGS, HUB_GUIDES } from "../lib/guides/hub";
import { findBannedPhrases } from "../lib/seo/banned-phrases";

const EXPECTED = ["chef-vs-cook-australia", "tra-msa-vs-osap", "developer-programmer-vs-software-engineer", "skills-assessment-vs-visa-eligibility", "engineers-australia-accredited-vs-cdr", "state-occupation-list-vs-nomination"];
const FILLER = /everything you need to know|navigating the complex|migration journey|comprehensive guide|it is important to note|is crucial|you are eligible|you qualify|best visa|recommended pathway|strongest option|your chances|easiest visa|will nominate you/i;
let n = 0;
const ok = (name: string) => {
  console.log(`  ✅ ${name}`);
  n++;
};

assert.deepEqual(RESEARCH_GUIDES.map((g) => g.slug), EXPECTED);
assert.deepEqual(RESEARCH_GUIDE_SLUGS, EXPECTED);
ok("exactly the six Wave 1 slugs, in sync with the analytics slug list");

const titles = new Set<string>();
for (const g of RESEARCH_GUIDES) {
  const text = JSON.stringify(g);
  assert(!/logivisa/i.test(g.title), `${g.slug}: brand must not be in the title (the layout template adds it once)`);
  assert(g.title.length <= 66, `${g.slug}: title too long`);
  assert(g.description.length >= 80 && g.description.length <= 200, `${g.slug}: description length`);
  assert(!titles.has(g.title), `${g.slug}: duplicate title`);
  titles.add(g.title);
  assert(g.directAnswer.length >= 1, `${g.slug}: direct answer`);
  assert(g.sources.length >= 2 && g.sources.every((s) => /^https:\/\//.test(s.url)), `${g.slug}: official sources`);
  assert(g.sources.some((s) => /\.gov\.au|acs\.org\.au|engineersaustralia|internationalengineeringalliance/.test(s.url)), `${g.slug}: at least one primary source`);
  assert(g.related.length >= 3 && g.related.every((l) => l.path.startsWith("/") && !l.path.startsWith("/en/")), `${g.slug}: related links`);
  assert(g.sections.some((s) => s.table), `${g.slug}: comparison table`);
  assert(!FILLER.test(text), `${g.slug}: filler or verdict wording: ${FILLER.exec(text)?.[0]}`);
  // The repo's information-page banned list is applied in full. The one exception is the word "eligib*" in the skills-assessment-vs-visa-eligibility
  // guide, whose subject is the contrast between an assessment and eligibility (the search query itself); it may only appear negated.
  const textNoSlugs = text.replace(/skills-assessment-vs-visa-eligibility/g, "skills-assessment-guide").replace(/https:[^"]+/g, "url");
  const banned = findBannedPhrases(textNoSlugs).filter((id) => !(id === "eligib*" && g.slug === "skills-assessment-vs-visa-eligibility"));
  assert.deepEqual(banned, [], `${g.slug}: banned phrases`);
  if (g.slug === "skills-assessment-vs-visa-eligibility") {
    for (const m of textNoSlugs.matchAll(/eligib\w*/gi)) {
      const around = textNoSlugs.slice(Math.max(0, m.index! - 90), m.index! + 40);
      assert(/does not|none of them|not by itself|vs |separate|versus|slug|title|h1|primaryQuery|description|is not|"query"/i.test(around), `eligibility used affirmatively: …${around}…`);
    }
  }
  for (const l of g.related) if (l.path.startsWith("/guides/")) assert(EXPECTED.includes(l.path.replace("/guides/", "")), `${g.slug}: link to unknown guide ${l.path}`);
}
ok("titles (no brand, unique), descriptions, direct answers, tables, primary sources, related links, no filler / verdict / banned wording");

assert(/^\d{4}-\d{2}-\d{2}$/.test(GUIDES_CHECKED_ON));
const entries = sitemap();
for (const slug of EXPECTED) {
  const hits = entries.filter((e) => e.url.endsWith(`/guides/${slug}`));
  assert.equal(hits.length, 1, `${slug}: exactly one sitemap entry (English only)`);
  assert.equal(hits[0].url, `https://www.logivisa.com/guides/${slug}`);
  assert(!hits[0].alternates, `${slug}: English-only guide must not list hreflang alternates`);
}
assert(!entries.some((e) => /\/(tr|zh-Hans)\/guides\/(chef-vs|tra-msa|developer-|skills-assessment-vs|engineers-aus|state-occupation)/.test(e.url)));
ok("sitemap: one English-only entry per guide, no alternates, no tr / zh-Hans");

assert.deepEqual(sanitizeParams({ source_type: "guide", source_slug: "tra-msa-vs-osap", destination_type: "tool", destination: "skills_assessment", locale: "en" }), { locale: "en", destination: "skills_assessment", source_type: "guide", source_slug: "tra-msa-vs-osap", destination_type: "tool" });
assert.deepEqual(sanitizeParams({ source_type: "blog", source_slug: "someone@example.com", destination_type: "free text" }), {});
ok("analytics: guide continuation parameters are allow-listed; free text is dropped");

assert.deepEqual(HUB_GUIDES.map((g) => g.slug), EXPECTED);
assert.deepEqual(HOME_GUIDE_SLUGS, ["chef-vs-cook-australia", "tra-msa-vs-osap", "skills-assessment-vs-visa-eligibility"]);
for (const g of HUB_GUIDES) assert(g.title && g.category && g.description.length > 40 && !findBannedPhrases(g.description).length, `${g.slug}: hub card`);
// The card title may carry "Eligibility" only for the guide whose subject is that contrast (see the exception above); no other banned wording in any title.
for (const g of HUB_GUIDES) assert.deepEqual(findBannedPhrases(g.title).filter((id) => !(id === "eligib*" && g.slug === "skills-assessment-vs-visa-eligibility")), [], `${g.slug}: hub title`);
const hub = fs.readFileSync("app/[locale]/(main)/guides/page.tsx", "utf8");
assert(hub.includes("<ResearchGuidesHubSection") && hub.includes("guides.map((guide)"), "hub keeps the existing catalogue and adds the new section");
assert(fs.readFileSync("components/home-content.tsx", "utf8").includes("<ResearchGuidesHome"), "homepage discovery section is mounted");
ok("hub: six cards with categories above the unchanged catalogue; homepage features exactly three");
const route = fs.readFileSync("app/[locale]/(main)/guides/[slug]/page.tsx", "utf8");
assert(route.includes("findResearchGuide") && route.includes('locale !== "en"') && route.includes("robots: { index: true, follow: true }"));
assert(!fs.existsSync("app/[locale]/(main)/blog"), "no /blog/ architecture");
ok("routing: /guides/<slug>, indexable, English only, no /blog/");

console.log(`\n✅ ALL ${n} CHECKS PASSED`);
