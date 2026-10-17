import assert from "node:assert/strict";
import { pilotLink } from "../lib/marketing/pilot-links";
import { sanitizeParams } from "../lib/analytics/events";
import fs from "node:fs";

const url = new URL(pilotLink("/occupations/351311-chef", "agent_partner", "P03"));
assert.equal(url.origin, "https://www.logivisa.com");
assert.equal(url.searchParams.get("utm_source"), "agent_partner");
assert.equal(url.searchParams.get("utm_medium"), "referral");
assert.equal(url.searchParams.get("utm_content"), "P03");
assert.equal(new URL(pilotLink("/tools/visa-comparison", "linkedin", "post2")).searchParams.get("utm_medium"), "social");
for (const id of ["client@example.com", "Jane", "P31", "P01&email=x"]) assert.throws(() => pilotLink("/", "agent_partner", id));
for (const path of ["https://example.com", "//example.com", "/?email=x", "/#client"]) assert.throws(() => pilotLink(path, "agent_partner", "P01"));
assert.deepEqual(sanitizeParams({ continuation_stage: "calculator_complete_to_research", destination: "skills_assessment", email: "private@example.com", score: 85, age: "25-32", source_page_type: "tool" }), { destination: "skills_assessment", source_page_type: "tool", continuation_stage: "calculator_complete_to_research" });
assert.deepEqual(sanitizeParams({ continuation_stage: "client@example.com", destination: "arbitrary", source_page_id: "189" }), {});
for (const locale of ["en", "tr", "zh-Hans"]) {
  const copy = JSON.parse(fs.readFileSync(`public/locales/${locale}.json`, "utf8"));
  for (const level of ["competent", "proficient", "superior"]) assert(!/PTE\s*(50|65|79)/.test(copy[`pc.english.${level}`]), `${locale}: no universal old PTE shortcut`);
  assert(copy["pc.english.sourceNote"]);
  assert(copy["pc.english.officialLink"]);
}
console.log("Acquisition link boundaries and event privacy checks passed");
