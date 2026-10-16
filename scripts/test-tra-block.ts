/**
 * The TRA skills-assessment block on occupation pages (lib/occupations/tra-block.ts).
 *
 *   1. Source integrity: the registry fees and the OSAP occupation lists equal the figures in TRA's July 2026 documents, so a
 *      stale or invented number cannot replace them silently. Where data/knowledge exists (it is gitignored) the registry is
 *      also compared with the PDFs themselves; elsewhere that part prints SKIPPED.
 *   2. Pathway matrix: Carpenter 331212 and Chef 351311 (MSA and OSAP, OSAP by passport), Electrician (General) 341111
 *      (licensed: OSAP only, no MSA fee).
 *   3. Rendering: every occupation whose registry authority is TRA gets the block, no other occupation does.
 *   4. Wording in en / tr / zh-Hans: information only, no eligibility / recommendation / readiness language; tr and zh-Hans
 *      are localised, not English.
 *   5. Measurement: the tool-click event and its fixed parameters.
 *
 *   npx tsx scripts/test-tra-block.ts          (no network, no database)
 */
import "./lib/stub-request-context";

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/d?sslmode=disable"; // never connects

import { sanitizeParams } from "../lib/analytics/events";
import { occupationPageContent, occupationPageText } from "../lib/occupations/page-content";
import { findOccupationById, getUniqueOccupations } from "../lib/occupations/seo";
import { traBlockFor, traBlockText } from "../lib/occupations/tra-block";
import { traAustraliaAuthority } from "../lib/skills-assessment/authorities/tra-australia";
import { resolveAssessingAuthority } from "../lib/skills-assessment/resolve-authority";
import { TRA_OSAP_OCCUPATIONS } from "../lib/skills-assessment/tra-osap";
import { findBannedPhrases } from "../lib/seo/banned-phrases";
import traSources from "../src/data/skills-assessment/tra-sources.json";

let failures = 0;
let skipped = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else {
    failures++;
    console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`);
  }
};
const LOCALES = ["en", "tr", "zh-Hans"] as const;

// What TRA's documents state. Change these only together with the registry and the documents named in tra-sources.json.
const MSA_FEES = { fee: 795, review: 610 }; // MSA guidelines p.5 and p.13
const OSAP_FEES = [1120, 2000, 2200, 5320, 1120, 900, 2020]; // TRA program pages p.5: P1 doc, interview, practical, total; P2 doc, interview, total
const CARPENTER_OSAP = ["Brazil", "Fiji", "Hong Kong SAR", "India", "Macau SAR", "Papua New Guinea", "Philippines", "South Africa", "Thailand", "Vietnam", "Zimbabwe"];
const CHEF_OSAP = ["Bangladesh", "Brazil", "China", "Fiji", "Hong Kong SAR", "India", "Iran", "Ireland", "Macau SAR", "Nepal", "Pakistan", "Papua New Guinea", "Philippines", "Republic of Korea", "South Africa", "Sri Lanka", "Thailand", "United Arab Emirates", "United Kingdom", "Vietnam", "Zimbabwe"];

console.log("1. source integrity");
const msa = traAustraliaAuthority.pathways.find((p) => p.pathwayId === "MSA")!;
const osap = traAustraliaAuthority.pathways.find((p) => p.pathwayId === "OSAP")!;
check(JSON.stringify(msa.fees.map((f) => f.amountAUD)) === JSON.stringify([MSA_FEES.fee, MSA_FEES.review]), `registry MSA fees = ${MSA_FEES.fee} / review ${MSA_FEES.review}`, JSON.stringify(msa.fees.map((f) => f.amountAUD)));
check(JSON.stringify(osap.fees.map((f) => f.amountAUD)) === JSON.stringify(OSAP_FEES), `registry OSAP fees = ${OSAP_FEES.join(" / ")}`, JSON.stringify(osap.fees.map((f) => f.amountAUD)));
check(JSON.stringify([...(TRA_OSAP_OCCUPATIONS["331212"].countries as string[])].sort()) === JSON.stringify([...CARPENTER_OSAP].sort()), "Carpenter 331212: OSAP passport countries = TRA's list (11)");
check(JSON.stringify([...(TRA_OSAP_OCCUPATIONS["351311"].countries as string[])].sort()) === JSON.stringify([...CHEF_OSAP].sort()), "Chef 351311: OSAP passport countries = TRA's list (21)");
check(TRA_OSAP_OCCUPATIONS["341111"].countries === "ALL", "Electrician (General) 341111: OSAP for all countries (licensed occupation)");
check(traAustraliaAuthority.licensedOccupations?.some((l) => l.includes("341111")) === true, "341111 is in the registry's licensed occupations");
check(/^2026-\d{2}-\d{2}$/.test(traSources.verified) && traAustraliaAuthority.lastVerified === traSources.verified, "verification date: registry lastVerified = tra-sources.json verified", `${traAustraliaAuthority.lastVerified} / ${traSources.verified}`);
check(Object.values(traSources.programs).every((p) => /^https:\/\/www\.tradesrecognitionaustralia\.gov\.au\//.test(p.officialUrl)) && /^https:\/\/www\.tradesrecognitionaustralia\.gov\.au\//.test(traSources.authority.pathfinderUrl), "official links are TRA pages (not the generic Home Affairs list)");
check(Object.values(traSources.programs).every((p) => p.source.title && p.source.file && p.source.publication === "July 2026"), "each program names its source document and publication");

const MSA_PDF = `data/knowledge/Skill Assessments/Trades Recognition Australia/TRA_MSA_Program Guidelines_July 2026.pdf`;
const CAPTURE_PDF = `data/knowledge/Skill Assessments/Trades Recognition Australia/Trades Recognition Australia.pdf`;
function pdfText(file: string): string | null {
  if (!existsSync(file)) return null;
  try {
    return execFileSync("pdftotext", ["-layout", file, "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch {
    return null;
  }
}
const msaText = pdfText(MSA_PDF);
const captureText = pdfText(CAPTURE_PDF);
if (!msaText || !captureText) {
  skipped++;
  console.log("  SKIPPED: comparison with the source PDFs (data/knowledge is gitignored, or pdftotext is not installed)");
} else {
  const msaPages = msaText.split("\f");
  check(/\$795/.test(msaPages[4] ?? "") && /\$610/.test(msaPages[4] ?? ""), "MSA PDF p.5 states $795 and the $610 review fee");
  check(/120 days/.test(msaPages[3] ?? ""), "MSA PDF p.4 states approximately 120 days");
  check(/licensed occupations:[\s\S]*Electrician \(General\)/.test(msaPages[7] ?? "") && /Offshore Skills Assessment Program/.test(msaPages[7] ?? ""), "MSA PDF p.8: not open to applicants who need OSAP or to the licensed occupations incl. Electrician (General)");
  check(/28 calendar days/.test(msaPages[12] ?? "") && /\$610/.test(msaPages[12] ?? ""), "MSA PDF p.13: review within 28 calendar days, $610");
  const cap = captureText.split("\f");
  const fees = cap[4] ?? "";
  check(["1,120", "2,000", "2,200", "5,320", "900", "2,020"].every((n) => fees.includes(n)), "OSAP page 5 states 1,120 / 2,000 / 2,200 / 5,320 / 900 / 2,020");
  check(/compulsory if you are applying for permanent migration[\s\S]*Electrician \(General\)/.test(cap[3] ?? ""), "OSAP page 4: compulsory for permanent migration in the licensed occupations incl. Electrician (General)");
  check(/15 weeks/.test(cap[5] ?? ""), "OSAP page 6 states approximately 15 weeks");
  // Country list of one occupation: the right-hand column from the occupation's line to the line holding "Zimbabwe".
  const countriesFor = (code: string): string[] | null => {
    for (const page of [cap[6] ?? "", cap[7] ?? ""]) {
      const lines = page.split("\n");
      const at = lines.findIndex((l) => l.includes(`[${code}]`));
      if (at < 0) continue;
      const parts: string[] = [];
      for (let i = at; i < lines.length; i++) {
        parts.push(lines[i].slice(21).trim());
        if (/Zimbabwe/.test(lines[i]) || /all countries/.test(lines[i])) break;
      }
      return parts.join(" ").replace(/\s+/g, " ").split(",").map((x) => x.trim()).filter(Boolean);
    }
    return null;
  };
  const sameSet = (a: string[] | null, b: string[]) => !!a && JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
  check(sameSet(countriesFor("331212"), CARPENTER_OSAP), "OSAP list in the PDF for Carpenter [331212] = the registry's countries", JSON.stringify(countriesFor("331212")));
  check(sameSet(countriesFor("351311"), CHEF_OSAP), "OSAP list in the PDF for Chef [351311] = the registry's countries", JSON.stringify(countriesFor("351311")));
  const flat8 = (cap[7] ?? "").replace(/\s+/g, " ");
  const at341111 = flat8.indexOf("[341111]");
  check(at341111 >= 0 && /Applicants from all countries/.test(flat8.slice(Math.max(0, at341111 - 120), at341111 + 120)), "OSAP list in the PDF for Electrician (General) [341111]: applicants from all countries");
}

console.log("\n2. pathway matrix (en)");
const show = (id: string) => {
  const o = findOccupationById(id)!;
  return occupationPageContent(o, "en").tra;
};
const carpenter = show("331212")!;
const chef = show("351311")!;
const electrician = show("341111")!;
check(!!carpenter && !!chef && !!electrician, "Carpenter, Chef and Electrician (General) all carry the block");
check(carpenter.caseKind === "passport" && chef.caseKind === "passport", "Carpenter and Chef: passport-dependent (MSA and OSAP both published)");
check(electrician.caseKind === "licensed", "Electrician (General): licensed occupation");
for (const [name, b] of [["Carpenter", carpenter], ["Chef", chef]] as const) {
  const amounts = b.fees.map((f) => `${f.program} ${f.amount}`);
  check(amounts.join("|") === ["MSA AUD 795", "MSA AUD 610", "OSAP AUD 1,120", "OSAP AUD 2,000", "OSAP AUD 2,200", "OSAP AUD 5,320", "OSAP AUD 1,120", "OSAP AUD 900", "OSAP AUD 2,020"].join("|"), `${name}: fee rows are the MSA and OSAP figures, kept separate`, amounts.join("|"));
  check(b.programs.map((p) => p.id).join() === "MSA,OSAP", `${name}: both programs named`);
}
check(electrician.fees.every((f) => f.program === "OSAP") && electrician.programs.map((p) => p.id).join() === "OSAP", "Electrician (General): OSAP only; no MSA fee row is shown");
check(!electrician.fees.some((f) => f.amount === "AUD 795"), "Electrician (General): AUD 795 is not shown");
check(/not open to this licensed occupation/.test(electrician.intro) && /compulsory for permanent migration/.test(electrician.intro), "Electrician (General): states TRA's rule (MSA not open; OSAP compulsory for permanent migration)");
check(!!electrician.licensedNote && /482/.test(electrician.licensedNote) && /485/.test(electrician.licensedNote), "Electrician (General): TRA's subclass 482 / 485 exceptions are named");
check(carpenter.countries?.list.length === 11 && chef.countries?.list.length === 21 && !electrician.countries, "passport lists: Carpenter 11, Chef 21, Electrician none");
check(carpenter.fees.filter((f) => f.total).length === 3 && carpenter.fees.some((f) => f.label.includes("Pathway 1 Total")), "OSAP stage fees are shown as stages with their totals; they are not merged into one fee");
check([carpenter, chef, electrician].every((b) => b.verified === traSources.verified && b.sourceLines.length >= 1 && b.officialLinks.every((l) => l.url.startsWith("https://www.tradesrecognitionaustralia.gov.au/"))), "each block carries the verification date, source lines and TRA links");
check([carpenter, chef].every((b) => b.processing.map((p) => p.text).join(" ").includes("120 days") && b.processing.map((p) => p.text).join(" ").includes("15 weeks")), "processing: 120 days (MSA) and 15 weeks (OSAP), each marked as a guide only");

console.log("\n3. rendering: TRA occupations only");
const all = getUniqueOccupations();
let traCount = 0;
const wrong: string[] = [];
for (const o of all) {
  const isTra = (() => { const r = resolveAssessingAuthority(o.anzsco_code); return r.source === "registry-code" && r.authorityId === "TRA"; })();
  const b = traBlockFor(o.anzsco_code, "en");
  if (isTra) traCount++;
  if (isTra !== (b !== null)) wrong.push(o.anzsco_code);
}
check(wrong.length === 0 && traCount > 50, `block exists for exactly the ${traCount} TRA occupations`, wrong.join(","));
for (const id of ["261313", "233211", "254415", "221111"]) check(traBlockFor(id, "en") === null, `no TRA content on ${id} (${findOccupationById(id)?.occupation_name})`);
const pageSrc = readFileSync("app/[locale]/(main)/occupations/[id]/page.tsx", "utf8");
check(/c\.tra \? <TraSkillsAssessment block=\{c\.tra\}/.test(pageSrc), "the page renders the block only when the content carries one");
const compSrc = readFileSync("components/occupations/tra-skills-assessment.tsx", "utf8");
check(!/AUD\s?\d|\$\s?\d/.test(compSrc) && !/\b(795|610|1,?120|5,?320)\b/.test(compSrc), "the component holds no fee figure of its own");

console.log("\n4. wording and localisation (en / tr / zh-Hans)");
const traCodes = all.filter((o) => traBlockFor(o.anzsco_code, "en")).map((o) => o.anzsco_code);
for (const l of LOCALES) {
  const bad = traCodes.filter((c) => findBannedPhrases(traBlockText(traBlockFor(c, l)!)).length > 0);
  check(bad.length === 0, `[${l}] no banned wording in the block on any of ${traCodes.length} TRA occupations`, bad.slice(0, 3).join(","));
  const pageBad = ["331212", "351311", "341111"].filter((c) => findBannedPhrases(occupationPageText(occupationPageContent(findOccupationById(c)!, l))).length > 0);
  check(pageBad.length === 0, `[${l}] the three target pages are clean as a whole`, pageBad.join(","));
}
const en = traBlockFor("351311", "en")!;
for (const l of ["tr", "zh-Hans"] as const) {
  const b = traBlockFor("351311", l)!;
  check(b.heading !== en.heading && b.intro !== en.intro && b.note !== en.note, `[${l}] heading, introduction and note are localised`);
  // "Program" is the same word in Turkish.
  check(Object.entries(b.labels).every(([k, v]) => v !== (en.labels as Record<string, string>)[k] || (l === "tr" && k === "colProgram")), `[${l}] every label is localised`);
  check(b.fees.every((f, i) => f.scope !== en.fees[i].scope && f.label !== en.fees[i].label), `[${l}] fee labels and scopes are localised`);
  check(b.fees.map((f) => f.amount).join() === en.fees.map((f) => f.amount).join(), `[${l}] the same amounts as English`);
  check(/MSA/.test(b.intro) && /OSAP/.test(b.intro) && b.programs.every((p) => /MSA|OSAP/.test(p.name)), `[${l}] official program acronyms (MSA, OSAP) are kept`);
  check(b.sourceLines.length === en.sourceLines.length && b.officialLinks.map((x) => x.url).join() === en.officialLinks.map((x) => x.url).join(), `[${l}] same sources and links`);
}
const desc = occupationPageContent(findOccupationById("331212")!, "en").description;
check(desc.length <= 300 && /TRA assessment programs and published fees/.test(desc), "meta description mentions the TRA programs and fees and stays within 300 characters", String(desc.length));

console.log("\n5. measurement");
check(JSON.stringify(sanitizeParams({ occupation_code: "331212", destination: "skills_assessment", locale: "en", email: "a@b.c", notes: "free text" })) === JSON.stringify({ occupation_code: "331212", locale: "en", destination: "skills_assessment" }), "occupation_tool_click parameters: occupation code, destination, locale only");
const events = readFileSync("lib/analytics/events.ts", "utf8");
check(/"occupation_tool_click"/.test(events), "the event name exists");
const tracker = readFileSync("components/analytics/occupation-tool-click-tracker.tsx", "utf8");
check(/trackEvent\("occupation_tool_click", \{ occupation_code: occupationCode, destination, locale \}\)/.test(tracker), "the tracker sends the code, destination and locale only (no href, no text)");
check(/OccupationToolClickTracker occupationCode=\{c\.code\}/.test(pageSrc) && /data-tool-destination=\{link\.destination\}/.test(pageSrc), "the page mounts the tracker and tags the related links");
const pc = occupationPageContent(findOccupationById("331212")!, "en");
check(["points_calculator", "skills_assessment", "state_nomination"].every((d) => pc.related.some((r) => r.destination === d)), "related links tag points calculator, skills assessment and state nomination");
check(["skills_assessment", "state_nomination"].every((d) => pc.tra!.toolLinks.some((r) => r.destination === d)), "the TRA block links the skills assessment and state nomination tools");
check(/data-official-source/.test(compSrc), "the TRA links are marked for the existing outbound official-link event");

if (failures) {
  console.error(`\n❌ ${failures} check(s) failed`);
  process.exit(1);
}
console.log(`\n✅ ALL CHECKS PASSED${skipped ? ` (${skipped} part SKIPPED)` : ""}`);
