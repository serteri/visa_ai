/**
 * src/data/state-occupation-lists/wa.json (scripts/generate-wa-occupations.ts) -- WA's 2025-26 State nomination
 * occupation lists.
 *
 *   1. Drift: regenerates from the source documents and diffs against the committed file (SKIPPED where data/knowledge
 *      is absent, i.e. CI).
 *   2. Committed-file invariants (always): program year 2025-26 (no date printed in the list), 609 list lines -> 383
 *      occupations, stream counts, the sourced stream rules with pages; and the entries the document gives for
 *      Software Engineer 261313, Civil Engineer 233211, Medical Laboratory Scientist 234611, Chef 351311 and Registered
 *      Nurse titles; the matcher (lib/state-nomination/occupation-match.ts) reads this file.
 */
import { existsSync, readFileSync } from "node:fs";

import data from "../src/data/state-occupation-lists/wa.json";
import { WA_LIST_DOCUMENT, WA_OUT_FILE, WA_PROGRAM_DOCUMENT, buildWaOccupations, serialize } from "./generate-wa-occupations";
import { matchOccupationToState } from "../lib/state-nomination/occupation-match";

let failures = 0;
const ok = (m: string) => console.log(`  ✅ ${m}`);
const fail = (m: string) => {
  failures++;
  console.error(`  ❌ ${m}`);
};

async function main() {
  console.log("==================== (1) drift: committed JSON vs a fresh parse of the source documents ====================");
  if (!existsSync(WA_LIST_DOCUMENT) || !existsSync(WA_PROGRAM_DOCUMENT)) {
    console.log(`  SKIPPED: ${WA_LIST_DOCUMENT} not present (data/knowledge is gitignored)`);
  } else {
    const committed = readFileSync(WA_OUT_FILE, "utf8").replace(/\r\n/g, "\n");
    if (committed === serialize(await buildWaOccupations())) ok(`${WA_OUT_FILE} matches the generator's output`);
    else fail(`${WA_OUT_FILE} drifted from the generator's output -- run: npx tsx scripts/generate-wa-occupations.ts`);
  }

  console.log("\n==================== (2) committed-file invariants ====================");
  const p = data._provenance;
  if (p.programYear === "2025-26" && p.datePrintedInList === null && p.sourceFile.endsWith("/2025-26 Eligible occupations WA.pdf")) ok("program year 2025-26 (filename + program document); the list prints no date");
  else fail(`program year / source: ${p.programYear}, ${p.sourceFile}`);
  if (p.entryLines === 609 && p.occupationCount === 383 && p.streamCounts.schedule1 === 89 && p.streamCounts.schedule2 === 189 && p.streamCounts.graduate === 331) ok("609 list lines -> 383 occupations; Schedule 1: 89, Schedule 2: 189, Graduate: 331");
  else fail(`counts: ${JSON.stringify({ lines: p.entryLines, occupations: p.occupationCount, streams: p.streamCounts })}`);
  const rulePages: Record<string, number> = { subclasses: 1, occupationEligibleForSubclass: 2, schedule1WorkExperience: 4, schedule1Contract: 5, schedule2Contract: 9, contractTerms: 5, graduateStudy: 13 };
  const rules = p.rules as Record<string, { page: number; quote: string }>;
  const badRules = Object.entries(rulePages).filter(([k, page]) => rules[k]?.page !== page || !rules[k]?.quote);
  if (badRules.length === 0) ok("stream rules quoted with pages: 190/491 (p.1), subclass eligibility (p.2), Schedule 1 experience (p.4) and contract (p.5), Schedule 2 contract (p.9), Graduate study (p.13)");
  else fail(`rules: ${JSON.stringify(badRules)}`);

  const row = (code: string) => data.occupations.find((o) => o.anzscoCode === code);
  const expect: Array<[string, string, string[], boolean, boolean, number[]]> = [
    ["261313", "Software Engineer", ["schedule2", "graduate"], true, true, [44]],
    ["233211", "Civil Engineer", ["schedule2", "graduate"], true, true, [10]],
    ["234611", "Medical Laboratory Scientist", ["schedule1", "graduate"], true, true, [24, 33]],
    ["351311", "Chef", ["schedule2", "graduate"], true, true, [40]],
  ];
  for (const [code, title, streams, s190, s491, pages] of expect) {
    const r = row(code);
    if (r && r.occupationTitle === title && r.streams.join() === streams.join() && r.subclass190 === s190 && r.subclass491 === s491 && r.pages.join() === pages.join()) {
      ok(`${code} ${title}: ${streams.join(" + ")}, 190 ${s190 ? "yes" : "no"}, 491 ${s491 ? "yes" : "no"} (p.${pages.join(", p.")})`);
    } else fail(`${code}: ${JSON.stringify(r)}`);
  }
  const unmatched = p.codeMatching.unmatchedTitles;
  if (unmatched.length === 1 && unmatched[0] === "Occupational Health and Safety Adviser" && data.occupations.filter((o) => o.anzscoCode === null).every((o) => !o.subclass190 && !o.subclass491)) {
    ok("one title without an exact code match (Occupational Health and Safety Adviser): kept, never matchable");
  } else fail(`unmatched titles: ${unmatched.join(", ")}`);

  // The matcher reads this file.
  const m190 = matchOccupationToState("261313", "WA", "190");
  const m491 = matchOccupationToState("261313", "WA", "491");
  const notListed = matchOccupationToState("253111", "WA", "190"); // General Practitioner: not a WA list title? checked below
  const gp = data.occupations.find((o) => o.occupationTitle === "General Practitioner");
  if (m190.type === "MATCH" && m491.type === "MATCH" && (gp ? notListed.type === (gp.subclass190 ? "MATCH" : "NOT_ON_LIST") : notListed.type === "NOT_ON_LIST")) ok("matcher: 261313 MATCH for WA 190 and 491; other codes follow the list");
  else fail(`matcher: ${m190.type} / ${m491.type} / ${notListed.type}`);
  if (matchOccupationToState("999999", "WA", "190").type === "NOT_ON_LIST") ok("a code not on WA's list -> NOT_ON_LIST");
  else fail("unknown code should be NOT_ON_LIST for WA");

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
