/**
 * ACS fees (ACS Migration Skills Assessment guide, effective 3 November 2025; 33 pages), transcribed into
 * src/data/skills-assessment/acs-fees.json from the owner's run of scripts/inventory-acs-source.ts:
 *   - the JSON, the registry (lib/skills-assessment/authorities/acs.ts), the provenance manifest, the tool page and the
 *     chat facts carry the same figures; every ACS fact is verified today with a page and quote;
 *   - GST: the guide states fees excl. GST and not who pays; the report applies the AIMS / Engineers Australia rule by
 *     the applicant's country (1,498 -> 1,647.80 in Australia), says it is the report's rule, in en / tr / zh-Hans;
 *   - processing time: not stated in the guide -> "Not stated in the ACS guide", never "12 wk".
 * The source PDF is not in the repository: the drift check against the PDF itself runs only where the file exists and is skipped in CI.
 */
import "./lib/stub-request-context";

process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://u:p@localhost:5432/d?sslmode=disable"; // never connects

import { existsSync, readFileSync } from "node:fs";

import { authorityFeeRows, visitorAuthorityFee } from "../lib/chat/authority-fees";
import { buildEngineFacts } from "../lib/chat/engine-facts";
import { acsAppealFees, acsFee, acsInclGst, acsNote, ACS_FEES, ACS_FEES_SOURCE, ACS_PROCESSING_NOT_STATED } from "../lib/skills-assessment/acs-fees";
import { acsAuthority } from "../lib/skills-assessment/authorities/acs";
import { selectPrimaryFee } from "../lib/skills-assessment";
import feeProvenance from "../src/data/fee-provenance.json";
import bodies from "../src/data/assessing-bodies.json";
import { quickProfileToInput } from "../lib/chat/quick-profile";
import type { Locale, ReadinessReport } from "../lib/readiness/types";
import { runReadinessEngine } from "../src/lib/readiness-engine";

let failures = 0;
const t = (label: string, cond: boolean, detail = "") => {
  if (cond) console.log(`  ✅ ${label}`);
  else {
    failures++;
    console.error(`  ❌ ${label}${detail ? ` -- ${detail}` : ""}`);
  }
};
const section = (s: string) => console.log(`\n==================== ${s} ====================`);
const LOCALES: Locale[] = ["en", "tr", "zh-Hans"];
const facts = (feeProvenance as unknown as { facts: Array<{ id: string; value: number | null; last_verified: string; source: string }> }).facts;
const fact = (id: string) => facts.find((f) => f.id === id);

section("1. the transcription: every fee with page and quote");
{
  const expect: Record<string, [number, number | null, number[]]> = {
    acs_post_australian_study: [1136, 1100, [1, 15]],
    acs_general_skills: [1498, 1450, [1, 19]],
    acs_rpl: [625, 605, [1, 21]],
    acs_qualification_only: [625, null, [22]],
    acs_temporary_graduate: [625, 605, [1]],
    acs_appeal_level_1: [516, 500, [1]],
    acs_appeal_level_2: [620, 600, [1]],
  };
  for (const [id, [now, was, pages]] of Object.entries(expect)) {
    const f = acsFee(id);
    t(`${id}: ${now} (was ${was ?? "n/a"}), pages ${pages.join(",")}, with a quote`, f.feeExclGstAud === now && f.previousFeeExclGstAud === was && JSON.stringify(f.pages) === JSON.stringify(pages) && f.quotes.length > 0 && f.quotes.every((q) => q.includes("p.")));
  }
  t("the document is the 33-page ACS guide, effective 3 November 2025, and the transcription says how it was made", ACS_FEES.length === 7 && ACS_FEES_SOURCE.effectiveFrom === "2025-11-03" && JSON.parse(readFileSync("src/data/skills-assessment/acs-fees.json", "utf8")).sourcePageCount === 33 && /inventory-acs-source/.test(JSON.parse(readFileSync("src/data/skills-assessment/acs-fees.json", "utf8")).generatedBy));
  const pdf = ACS_FEES_SOURCE.document;
  if (!existsSync(pdf)) console.log(`  ⏭  source PDF not present (${pdf}); not checked here (the owner ran scripts/inventory-acs-source.ts against it; CI never has the file)`);
}

section("2. registry, provenance, tool page agree");
{
  const byId = (id: string) => acsAuthority.pathways.find((p) => p.pathwayId === id)!;
  const pairs: Array<[string, string]> = [["POST_AU_STUDY", "acs_post_australian_study"], ["GENERAL_SKILLS", "acs_general_skills"], ["RPL", "acs_rpl"], ["QUALIFICATION_ONLY_TG485", "acs_temporary_graduate"], ["QUALIFICATION_ONLY_PY", "acs_qualification_only"]];
  for (const [pathwayId, feeId] of pairs) {
    const p = byId(pathwayId);
    const excl = acsFee(feeId).feeExclGstAud;
    t(`${pathwayId}: registry offshore ${excl} excl. GST, onshore ${acsInclGst(excl)} incl. GST`, p.fees.find((f) => f.applicantLocation === "offshore")?.amountAUD === excl && p.fees.find((f) => f.applicantLocation === "onshore")?.amountAUD === acsInclGst(excl));
    t(`${pathwayId}: no processing-time figure, "Not stated in the ACS guide"`, !p.processingTimeWeeks && p.processingNotStated === ACS_PROCESSING_NOT_STATED);
  }
  t("GST-inclusive figures: 1,498 -> 1,647.80; 1,136 -> 1,249.60; 625 -> 687.50; 516 -> 567.60; 620 -> 682", [acsInclGst(1498), acsInclGst(1136), acsInclGst(625), acsInclGst(516), acsInclGst(620)].join() === "1647.8,1249.6,687.5,567.6,682");
  const appeals = acsAuthority.fees ?? [];
  t("appeals in the registry (authority level): Level 1 516 / 567.60, Level 2 620 / 682", JSON.stringify(appeals.map((f) => f.amountAUD)) === JSON.stringify(acsAppealFees().map((f) => f.amountAUD)) && appeals.map((f) => f.amountAUD).join() === "567.6,516,682,620");
  const provenance: Array<[string, number]> = [["acs_general_skills_assessment_fee", 1498], ["tool_page_acs_general_skills_fee", 1498], ["tool_page_acs_post_au_study_fee", 1136], ["tool_page_acs_rpl_qualification_only_fee", 625], ["acs_post_australian_study_fee", 1136], ["acs_rpl_fee", 625], ["acs_qualification_only_fee", 625], ["acs_temporary_graduate_fee", 625], ["acs_appeal_level_1_fee", 516], ["acs_appeal_level_2_fee", 620]];
  for (const [id, value] of provenance) {
    const f = fact(id);
    t(`provenance ${id}: ${value}, verified 2026-10-03 against the inventory output, a page and a quote`, f?.value === value && f.last_verified === "2026-10-03" && /inventory-acs-source/.test(f.source) && / p+\.\d/.test(f.source) && !/not re-extracted/.test(f.source), f?.source.slice(0, 160));
  }
  t("GST and processing time are recorded as 'not stated' facts", fact("acs_gst_rule")?.value === null && /not stated by ACS/.test(JSON.stringify(fact("acs_gst_rule"))) && fact("acs_processing_time")?.value === null && /Not stated in the ACS guide/.test(JSON.stringify(fact("acs_processing_time"))));
  const acs = (bodies as unknown as { assessingBodies?: Record<string, { fee: string; feeNote: Record<string, string>; processingTime: Record<string, string>; source: string }> }).assessingBodies?.ACS ?? (bodies as unknown as Record<string, never>)["ACS"] as { fee: string; feeNote: Record<string, string>; processingTime: Record<string, string>; source: string };
  t("tool page: fee tile 1,498 / 1,136 / 625, processing 'Not stated in the ACS guide' in en / tr / zh-Hans", acs.fee === "AUD 1,498 / AUD 1,136 / AUD 625" && LOCALES.every((l) => acs.processingTime[l] === (ACS_PROCESSING_NOT_STATED as Record<string, string>)[l]), JSON.stringify(acs.processingTime));
  t("tool page note: GST rule applied by the report (not ACS), the GST-inclusive figures and both appeals, in every language", LOCALES.every((l) => ["1,647.80", "1,249.60", "687.50", "516", "620"].every((n) => acs.feeNote[l].includes(n))) && /not ACS's/.test(acs.feeNote.en) && /ACS'nin değil/.test(acs.feeNote.tr) && /并非 ACS 规定/.test(acs.feeNote["zh-Hans"]) && /pp\.1, 15/.test(acs.source));
}

section("3. GST by the applicant's country (report rule, as for Engineers Australia / AIMS)");
{
  const general = acsAuthority.pathways.find((p) => p.pathwayId === "GENERAL_SKILLS")!;
  t("selectPrimaryFee: Australia -> 1,647.80 incl. GST; Turkey -> 1,498 excl. GST; no country -> in Australia", selectPrimaryFee(general, "AU")?.amountAUD === 1647.8 && selectPrimaryFee(general, "TR")?.amountAUD === 1498 && selectPrimaryFee(general, undefined)?.amountAUD === 1647.8);
  for (const l of LOCALES) {
    const on = acsNote(l, "onshore");
    const off = acsNote(l, "offshore");
    const rule: Record<Locale, RegExp> = { en: /the rule is the report's, not ACS's/, tr: /bu kural ACS'nin değil raporundur/, "zh-Hans": /该规则由报告采用，并非 ACS 规定/ };
    t(`${l}: the note states the rule is the report's, the appeals (${l === "zh-Hans" ? "含" : "incl."} GST in Australia, excl. outside) and no processing time`, rule[l].test(on) && on.includes("567.60") && on.includes("682") && off.includes("516") && off.includes("620") && !off.includes("567.60"));
  }
}

section("4. chat facts");
{
  const rows = authorityFeeRows().filter((r) => r.authorityId === "ACS");
  const has = (pathway: RegExp, amount: number, loc: string) => rows.some((r) => pathway.test(r.pathway + r.label) && r.amountAUD === amount && r.applicantLocation === loc);
  t("rows: General Skills 1,647.80 onshore / 1,498 offshore; Post Australian Study 1,249.60 / 1,136; RPL 687.50 / 625; Temporary Graduate and Qualification Only 687.50 / 625", has(/General Skills/, 1647.8, "onshore") && has(/General Skills/, 1498, "offshore") && has(/Post Australian/, 1249.6, "onshore") && has(/Post Australian/, 1136, "offshore") && has(/Recognition|RPL/, 687.5, "onshore") && has(/Recognition|RPL/, 625, "offshore") && has(/Temporary Graduate/, 625, "offshore") && has(/Professional Year/, 625, "offshore"));
  t("rows: Appeal Level 1 567.60 / 516 and Level 2 682 / 620 are listed", has(/Appeal Level 1/, 567.6, "onshore") && has(/Appeal Level 1/, 516, "offshore") && has(/Appeal Level 2/, 682, "onshore") && has(/Appeal Level 2/, 620, "offshore"));
  const text = buildEngineFacts();
  t("engine facts: the GST rule and the missing processing time are stated", /ACS states all its fees excluding GST[^\n]*the report applies its own rule/.test(text) && /not stated in the ACS guide/.test(text) && /Appeal Level 1 AUD 567\.60 incl\. GST if applying from within Australia \/ AUD 516 excl\. GST/.test(text));
}

section("5. visitor persona, onshore and offshore");
{
  const persona = (country: string) => {
    const input = quickProfileToInput({ age: "28", occupation: "261313", englishLevel: "proficient", qualificationLevel: "Bachelor's Degree", qualificationAwardedInAustralia: "no", skillsAssessment: "no", currentCountry: country, residenceState: "VIC", currentVisa: "500" } as never, "en");
    return { input: JSON.parse(JSON.stringify(input)), report: JSON.parse(JSON.stringify(runReadinessEngine(input))) as ReadinessReport };
  };
  const on = visitorAuthorityFee(persona("AU").input);
  t("onshore Software Engineer: General Skills 1,647.80 (the excl. GST 1,498 is also correct)", on?.amountAUD === 1647.8 && on.otherGstAmountAUD === 1498, JSON.stringify(on));
  const off = visitorAuthorityFee({ ...persona("AU").input, currentCountry: "TR" });
  t("offshore Software Engineer: General Skills 1,498 (1,647.80 is also correct)", off?.amountAUD === 1498 && off.otherGstAmountAUD === 1647.8, JSON.stringify(off));
}

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll ACS fee checks passed");
