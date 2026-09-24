/**
 * The free Skills Assessment Finder page (app/[locale]/(main)/tools/skills-assessment) reads its fees from
 * src/data/assessing-bodies.json -- a static file the report never sees. This test keeps the ANMAC and Medical
 * Board / AMC figures on that page equal to the report's sourced figures, read from the report's own modules
 * (lib/health-registration/anmac-fees.ts, lib/health-registration/img-pathways.ts) -- nothing hardcoded twice:
 *
 *   - ANMAC: the fee shows exactly the Full and Modified skills assessment amounts, the time exactly the stated
 *     wait to start; every tool-mapped ANMAC code is either Full-mapped in the report or has its own override
 *     (Enrolled Nurse 411411: Modified only, as the report cannot price it for an overseas applicant).
 *   - Doctors: every tool-mapped code the report's AHPRA registry covers has an override whose fee is the
 *     report's resolveMedicalRegistration total (with the AMC clinical exam where it applies).
 *   - Every figure in a fee note is one the report's data states for that code.
 *   - Each "Source" line cites the document (and page / effective date) the report cites.
 *   - fee-provenance.json's tool_page_* facts carry the same values, sourced to the extracted data files.
 *   - ACS, TRA, CPA Australia, CA ANZ, IPA, AACA, OTC: the fee equals the registry figures the report shows
 *     (lib/skills-assessment/authorities/*.ts -- every ACS pathway, the default pathway elsewhere), the processing
 *     time equals the registry's where the source document states one and shows no figure where it does not, the
 *     "Source" line cites the registry's document with a page.
 *   - Occupational Therapist: the card names and links OTC (as the registry does), and "Occupational Therapy
 *     Australia" (the professional association) appears nowhere in app/components/lib/src/locales.
 *   - Every tool-page occupation names the assessing authority the report resolves for it
 *     (resolveAssessingAuthority on "<title> <code>"); pre-existing mismatches outside the 5 fixed codes are listed
 *     with the Home Affairs authority, and the list can only shrink.
 * Pure data checks: runs in CI (no data/knowledge needed).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import tool from "../src/data/assessing-bodies.json";
import feeProvenance from "../src/data/fee-provenance.json";
import { anmacFee, FULL_SKILLS_ASSESSMENT_CODES, resolveAnmacAssessment } from "../lib/health-registration/anmac-fees";
import { IMG_PATHWAYS_SOURCE, resolveMedicalRegistration } from "../lib/health-registration/img-pathways";
import { ahpraAuthority } from "../lib/skills-assessment/authorities/ahpra";
import { acsAuthority } from "../lib/skills-assessment/authorities/acs";
import { traAustraliaAuthority } from "../lib/skills-assessment/authorities/tra-australia";
import { cpaAustraliaAuthority } from "../lib/skills-assessment/authorities/cpa-australia";
import { caanzAuthority } from "../lib/skills-assessment/authorities/caanz";
import { ipaAustraliaAuthority } from "../lib/skills-assessment/authorities/ipa-australia";
import { aacaAuthority } from "../lib/skills-assessment/authorities/aaca";
import { otcAustraliaAuthority } from "../lib/skills-assessment/authorities/otc-australia";
import { resolveAssessingAuthority } from "../lib/skills-assessment/resolve-authority";
import anzscoList from "../src/data/anzsco-list.json";
import type { SkillsAssessmentAuthority } from "../lib/skills-assessment/types";

type Localized = string | { en: string; tr: string; "zh-Hans": string };
type FeeFields = { fee?: string; feeNote?: Localized; processingTime?: Localized; processingNote?: Localized; source?: string };
type Body = FeeFields & { occupationOverrides?: Record<string, FeeFields> };

const bodies = tool.assessingBodies as unknown as Record<string, Body>;
const mapping = tool.occupationMapping as Record<string, string>;
const facts = (feeProvenance as { facts: Array<{ id: string; value: number | null; source: string | null; last_verified: string | null }> }).facts;

let failures = 0;
const ok = (m: string) => console.log(`  ✅ ${m}`);
const fail = (m: string) => {
  failures++;
  console.error(`  ❌ ${m}`);
};

/** Every number in a string ("AUD 5,233–5,633" -> [5233, 5633]; "6–8 weeks" -> [6, 8]). */
const numbers = (s: string) => [...s.matchAll(/\d[\d,]*/g)].map((m) => Number(m[0].replace(/,/g, "")));
const same = (a: number[], b: number[]) => JSON.stringify([...new Set(a)].sort((x, y) => x - y)) === JSON.stringify([...new Set(b)].sort((x, y) => x - y));
const allText = (v: Localized | undefined) => (v === undefined ? [] : typeof v === "string" ? [v] : [v.en, v.tr, v["zh-Hans"]]);
function noteFiguresWithin(label: string, note: Localized | undefined, allowed: number[]) {
  for (const text of allText(note)) {
    const stray = numbers(text).filter((n) => n >= 100 && !allowed.includes(n) && n !== 2026);
    if (stray.length) fail(`${label}: fee note states figures the report's data does not (${stray.join(", ")}): "${text}"`);
  }
}
function fact(id: string, value: number) {
  const f = facts.find((x) => x.id === id);
  if (!f) return fail(`fee-provenance.json has no "${id}"`);
  if (f.value !== value || !f.last_verified || !f.source?.includes("src/data/")) fail(`${id}: value ${f.value} (expected ${value}) or missing last_verified / data-file source`);
}

console.log("==================== ANMAC (tool page) vs lib/health-registration/anmac-fees.ts ====================");
{
  const before = failures;
  const full = anmacFee("anmac_full_skills_assessment");
  const modified = anmacFee("anmac_modified_skills_assessment");
  const anmac = bodies.ANMAC;
  if (!same(numbers(anmac.fee ?? ""), [full.amountAud, modified.amountAud])) fail(`ANMAC fee "${anmac.fee}" != report's Full ${full.amountAud} / Modified ${modified.amountAud}`);
  for (const f of [full, modified]) {
    if (!same(numbers(allText(anmac.processingTime)[0] ?? ""), [f.waitTimeToStart!.minWeeks, f.waitTimeToStart!.maxWeeks])) fail(`ANMAC time "${anmac.processingTime}" != stated wait for ${f.id}`);
  }
  noteFiguresWithin("ANMAC", anmac.feeNote, [full.amountAud, modified.amountAud]);
  if (!anmac.source?.includes("Anmac.pdf") || !anmac.source.includes(String(full.page)) || !anmac.source.includes(String(modified.page))) fail(`ANMAC source must cite Anmac.pdf pp.${full.page} and ${modified.page}: "${anmac.source}"`);
  for (const [code, body] of Object.entries(mapping)) {
    if (body !== "ANMAC") continue;
    const override = anmac.occupationOverrides?.[code];
    if (FULL_SKILLS_ASSESSMENT_CODES.has(code)) {
      if (override) fail(`${code}: Full-mapped in the report but overridden on the tool page`);
      continue;
    }
    // Not Full-mapped: the report prices it only when already registered in AU/NZ (Modified).
    if (!override) { fail(`${code}: the report does not map it to the Full skills assessment, but the tool page shows the Full fee`); continue; }
    if (resolveAnmacAssessment({ anzscoCode: code }).fee !== undefined) fail(`${code}: report now prices it for overseas applicants -- update the tool override`);
    if (!same(numbers(override.fee ?? ""), [modified.amountAud])) fail(`${code}: override fee "${override.fee}" != Modified ${modified.amountAud}`);
    noteFiguresWithin(`ANMAC ${code}`, override.feeNote, [modified.amountAud]);
  }
  fact("tool_page_anmac_full_skills_assessment_fee", full.amountAud);
  fact("tool_page_anmac_modified_skills_assessment_fee", modified.amountAud);
  if (failures === before) ok(`ANMAC: tool page ${anmac.fee}, ${allText(anmac.processingTime)[0]} = report (Full ${full.amountAud}, Modified ${modified.amountAud}, wait ${full.waitTimeToStart!.minWeeks}–${full.waitTimeToStart!.maxWeeks} weeks)`);
}

console.log("\n==================== Doctors (tool page AHPRA) vs lib/health-registration/img-pathways.ts ====================");
{
  const before = failures;
  const doctorCodes = new Set(ahpraAuthority.occupations.map((o) => o.anzscoCode));
  const toolDoctors = Object.entries(mapping).filter(([code]) => doctorCodes.has(code));
  if (toolDoctors.length === 0) fail("no tool-mapped code is an AHPRA (Medical Board) occupation -- test is checking nothing");
  for (const [code, body] of toolDoctors) {
    const override = bodies[body]?.occupationOverrides?.[code];
    const medical = resolveMedicalRegistration({ anzscoCode: code });
    if (!override) { fail(`${code}: a Medical Board occupation in the report, but the tool page shows the generic ${body} fee "${bodies[body]?.fee}"`); continue; }
    if (!same(numbers(override.fee ?? ""), [medical.totalMinAud, medical.totalMaxAud])) fail(`${code}: tool fee "${override.fee}" != report total ${medical.totalMinAud}–${medical.totalMaxAud}`);
    const stated = [medical.applicationFee.nationalFeeAud, medical.registrationFee.nationalFeeAud, medical.totalAud, medical.totalMinAud, medical.totalMaxAud];
    if (medical.amcClinicalExam) stated.push(medical.amcClinicalExam.inPersonAud, medical.amcClinicalExam.onlineAud);
    noteFiguresWithin(`doctor ${code}`, override.feeNote, stated);
    if (numbers(allText(override.processingTime)[0] ?? "").length) fail(`${code}: tool shows a processing time the source does not state: "${override.processingTime}"`);
    const effective = `effective ${IMG_PATHWAYS_SOURCE.feeScheduleEffectiveDate}`;
    if (!override.source?.includes(IMG_PATHWAYS_SOURCE.title) || !override.source.includes(effective) || (medical.amcClinicalExam && !override.source.includes(`Australian Medical Council, p.${medical.amcClinicalExam.page}`))) {
      fail(`${code}: source must cite "${IMG_PATHWAYS_SOURCE.title}" (${effective})${medical.amcClinicalExam ? ` and Australian Medical Council, p.${medical.amcClinicalExam.page}` : ""}: "${override.source}"`);
    }
    fact(`tool_page_medical_${code}_fee_min`, medical.totalMinAud);
    fact(`tool_page_medical_${code}_fee_max`, medical.totalMaxAud);
  }
  if (failures === before) ok(`doctors: ${toolDoctors.map(([c]) => `${c} ${bodies[mapping[c]].occupationOverrides![c].fee}`).join("; ")} = report (Medical Board schedule + AMC clinical exam where it applies)`);
}

console.log("\n==================== ACS, TRA, CPA, CA ANZ, IPA, AACA, OTC (tool page) vs lib/skills-assessment/authorities/*.ts ====================");
{
  type Pathway = SkillsAssessmentAuthority["pathways"][number];
  const pathway = (a: SkillsAssessmentAuthority, id: string): Pathway => {
    const p = a.pathways.find((x) => x.pathwayId === id);
    if (!p) throw new Error(`${a.authorityId}: no pathway "${id}" in the registry`);
    return p;
  };
  const firstFee = (p: Pathway) => p.fees.find((f) => typeof f.amountAUD === "number")?.amountAUD;
  /** A registry fee (numeric fees of `pathwayId`, by index) and the provenance fact that must carry it. */
  type FeeRef = { pathwayId: string; index: number; factId: string };
  const reg = (a: SkillsAssessmentAuthority, r: FeeRef) => pathway(a, r.pathwayId).fees[r.index]?.amountAUD;
  /**
   * "sourced": the tool shows the registry's processing time (weeks; business days = standard weeks x 5 or the
   * business-day figure in the registry note; TRA: the day count in its note).
   * "unsourced": the registry's time is not in the source document (a registry gap, reported, not fixed here), so the
   * tool shows no figure; a tripwire fails if the registry value changes, so a later sourced fix is carried over.
   */
  type Time = { kind: "sourced"; pathwayId: string } | { kind: "unsourced"; pathwayId: string; registryWeeks: number | undefined; why: string };
  type Check = { key: string; file: string; authority: SkillsAssessmentAuthority; shown: FeeRef[]; note: FeeRef[]; reportPathways: string[]; time: Time };
  const checks: Check[] = [
    {
      key: "ACS",
      file: "acs",
      authority: acsAuthority,
      shown: [
        { pathwayId: "GENERAL_SKILLS", index: 0, factId: "tool_page_acs_general_skills_fee" },
        { pathwayId: "POST_AU_STUDY", index: 0, factId: "tool_page_acs_post_au_study_fee" },
        { pathwayId: "RPL", index: 0, factId: "tool_page_acs_rpl_qualification_only_fee" },
      ],
      note: [],
      // The report resolves the ACS pathway from the profile (resolveACSPathway): any pathway's fee can appear.
      reportPathways: acsAuthority.pathways.map((p) => p.pathwayId),
      time: { kind: "unsourced", pathwayId: "GENERAL_SKILLS", registryWeeks: 12, why: "the ACS guide states no processing time" },
    },
    {
      key: "TRA",
      file: "tra-australia",
      authority: traAustraliaAuthority,
      shown: [{ pathwayId: "MSA", index: 0, factId: "tool_page_tra_msa_fee" }],
      note: [{ pathwayId: "MSA", index: 1, factId: "tool_page_tra_msa_review_fee" }],
      reportPathways: [traAustraliaAuthority.pathways[0].pathwayId],
      time: { kind: "sourced", pathwayId: "MSA" },
    },
    {
      key: "CPAA",
      file: "cpa-australia",
      authority: cpaAustraliaAuthority,
      shown: [
        { pathwayId: "QUALIFICATION_ASSESSMENT", index: 0, factId: "tool_page_cpa_qualification_assessment_fee_onshore" },
        { pathwayId: "QUALIFICATION_ASSESSMENT", index: 1, factId: "tool_page_cpa_qualification_assessment_fee_offshore" },
      ],
      note: [{ pathwayId: "QUALIFICATION_ASSESSMENT", index: 2, factId: "tool_page_cpa_qualification_assessment_fee_singapore" }],
      reportPathways: [cpaAustraliaAuthority.pathways[0].pathwayId],
      time: { kind: "sourced", pathwayId: "QUALIFICATION_ASSESSMENT" },
    },
    {
      key: "ICAA",
      file: "caanz",
      authority: caanzAuthority,
      shown: [{ pathwayId: "qualification-assessment", index: 0, factId: "tool_page_caanz_qualification_assessment_fee" }],
      note: [],
      reportPathways: [caanzAuthority.pathways[0].pathwayId],
      time: { kind: "unsourced", pathwayId: "qualification-assessment", registryWeeks: undefined, why: "the registry records no CA ANZ processing time" },
    },
    {
      key: "IPA",
      file: "ipa-australia",
      authority: ipaAustraliaAuthority,
      shown: [{ pathwayId: "QUALIFICATION_ASSESSMENT", index: 0, factId: "tool_page_ipa_standard_qualification_assessment_fee" }],
      note: [{ pathwayId: "QUALIFICATION_ASSESSMENT", index: 1, factId: "tool_page_ipa_priority_qualification_assessment_fee" }],
      reportPathways: [ipaAustraliaAuthority.pathways[0].pathwayId],
      time: { kind: "sourced", pathwayId: "QUALIFICATION_ASSESSMENT" },
    },
    {
      key: "AACA",
      file: "aaca",
      authority: aacaAuthority,
      shown: [{ pathwayId: "OQA", index: 0, factId: "tool_page_aaca_oqa_fee" }],
      note: [],
      reportPathways: [aacaAuthority.pathways[0].pathwayId],
      time: { kind: "sourced", pathwayId: "OQA" },
    },
    {
      key: "OTC",
      file: "otc-australia",
      authority: otcAustraliaAuthority,
      shown: [{ pathwayId: "DESKTOP_ASSESSMENT_MIGRATION", index: 0, factId: "tool_page_otc_assessment_for_migration_fee" }],
      note: [],
      reportPathways: [otcAustraliaAuthority.pathways[0].pathwayId],
      time: { kind: "unsourced", pathwayId: "DESKTOP_ASSESSMENT_MIGRATION", registryWeeks: 5, why: "the OTC document states no processing time" },
    },
  ];
  for (const c of checks) {
    const before = failures;
    const body = bodies[c.key];
    const a = c.authority;
    const shown = c.shown.map((r) => reg(a, r));
    const noted = c.note.map((r) => reg(a, r));
    if ([...shown, ...noted].some((v) => v === undefined)) { fail(`${c.key}: a referenced registry fee is missing`); continue; }

    // Fee tile: exactly the registry figures, including every fee the report can show for this authority.
    const toolFees = numbers(body.fee ?? "");
    if (!same(toolFees, shown as number[])) fail(`${c.key}: tool fee "${body.fee}" != registry ${shown.join(" / ")}`);
    for (const id of c.reportPathways) {
      const reportFee = firstFee(pathway(a, id));
      if (reportFee !== undefined && !toolFees.includes(reportFee)) fail(`${c.key}: the report shows AUD ${reportFee} (${id}) but the tool fee "${body.fee}" does not`);
    }
    // Fee note: only registry figures of this authority, and every noted figure in every locale.
    const registryFees = a.pathways.flatMap((p) => p.fees.map((f) => f.amountAUD).filter((v): v is number => typeof v === "number"));
    noteFiguresWithin(c.key, body.feeNote, registryFees);
    for (const v of noted as number[]) if (!allText(body.feeNote).every((t) => numbers(t).includes(v))) fail(`${c.key}: fee note must state AUD ${v} in every locale`);

    // Processing time.
    const w = pathway(a, c.time.pathwayId).processingTimeWeeks;
    const times = allText(body.processingTime);
    if (times.length !== 3) fail(`${c.key}: processingTime must be localized (en/tr/zh-Hans)`);
    if (c.time.kind === "unsourced") {
      if (times.some((t) => numbers(t).length)) fail(`${c.key}: ${c.time.why}, but the tool shows a time: "${times[0]}"`);
      if (w?.standard !== c.time.registryWeeks) fail(`${c.key}: registry ${c.time.pathwayId} processing time changed (${w?.standard} wk, was ${c.time.registryWeeks}) -- if now sourced, carry it to the tool page and update this test`);
    } else if (!w) {
      fail(`${c.key}: registry ${c.time.pathwayId} has no processing time to compare`);
    } else {
      const noteEn = typeof w.note === "string" ? w.note : (w.note?.en ?? "");
      const en = times[0] ?? "";
      for (const t of times) {
        const [n] = numbers(t);
        const matches = /business days/.test(en)
          ? n === w.standard * 5 || noteEn.includes(`${n} business days`)
          : /days/.test(en)
            ? noteEn.includes(`${n} days`)
            : n === w.standard;
        if (n === undefined || !matches) fail(`${c.key}: tool time "${t}" != registry ${c.time.pathwayId} (${w.standard} wk; note "${noteEn}")`);
      }
      if (w.ifIncomplete !== undefined && /weeks/.test(en)) {
        for (const t of allText(body.processingNote)) if (!numbers(t).includes(w.ifIncomplete)) fail(`${c.key}: processing note must state the registry's ${w.ifIncomplete} weeks if incomplete: "${t}"`);
      }
    }

    // "Source: <document>, p.X": the document the report cites (minus its "(PDF, N pages)" count -- pages are cited).
    const doc = a.sourceDocument.replace(/\s*\(PDF, \d+ pages\)$/, "");
    if (!body.source?.startsWith(doc) || !/\bpp?\.\d/.test(body.source)) fail(`${c.key}: source must cite "${doc}" with a page: "${body.source}"`);

    // Provenance: one fact per figure shown, with the registry value, the registry file and a document page.
    for (const r of [...c.shown, ...c.note]) {
      const f = facts.find((x) => x.id === r.factId);
      if (!f) { fail(`fee-provenance.json has no "${r.factId}"`); continue; }
      if (f.value !== reg(a, r) || !f.last_verified || !f.source?.includes(`lib/skills-assessment/authorities/${c.file}.ts`) || !/ pp?\.\d/.test(f.source)) {
        fail(`${r.factId}: value ${f.value} (registry ${reg(a, r)}), or missing last_verified / registry file / page in source`);
      }
    }

    if (failures === before) ok(`${c.key}: tool page ${body.fee}, ${times[0]} = registry ${a.authorityId} (${c.shown.map((r) => `${r.pathwayId} ${reg(a, r)}`).join(", ")})`);
  }
}

console.log("\n==================== Every tool-page occupation: same assessing authority as the report ====================");
{
  const before = failures;
  // The report resolves the authority with resolveAssessingAuthority() on the intake's occupation ("<title> <code>");
  // the tool page reads occupationMapping. Registry authorityId -> the tool page's body key for the same body.
  const TOOL_KEY: Record<string, string> = {
    ACS: "ACS", EA: "Engineers Australia", ANMAC: "ANMAC", VETASSESS: "VETASSESS", TRA: "TRA", CPA: "CPAA",
    "CA-ANZ": "ICAA", IPA: "IPA", AHPRA: "AHPRA", AACA: "AACA", OTC: "OTC",
  };
  // Mismatches that predate this guard, on occupations outside the 5 it was written for. Each is recorded with the
  // authority the Home Affairs skilled occupation list (data/knowledge/Skilled Occupation List.md) names, so the
  // wrong side is known; changing them would change what those occupations show, so they are reported, not fixed.
  // A listed code that stops mismatching must be removed; any other mismatch fails -- the list can only shrink.
  const KNOWN: Record<string, { tool: string; report: string; homeAffairs: string }> = {
    "132111": { tool: "AIMS", report: "VETASSESS", homeAffairs: "VETASSESS" },
    "224711": { tool: "VETASSESS", report: "GENERAL", homeAffairs: "VETASSESS" },
    "224999": { tool: "VETASSESS", report: "ACS", homeAffairs: "VETASSESS; ACS (Data Scientist only)" },
    "234111": { tool: "AAA", report: "VETASSESS", homeAffairs: "VETASSESS" },
    "234112": { tool: "AAA", report: "VETASSESS", homeAffairs: "VETASSESS" },
    "234611": { tool: "AHPRA", report: "AIMS", homeAffairs: "AIMS (Medical Scientists)" },
    "234711": { tool: "AVBC", report: "GENERAL", homeAffairs: "AVBC" },
    "241111": { tool: "TEQSA", report: "GENERAL", homeAffairs: "ACECQA" },
    "241213": { tool: "TEQSA", report: "GENERAL", homeAffairs: "AITSL" },
    "241411": { tool: "TEQSA", report: "GENERAL", homeAffairs: "AITSL" },
    "241511": { tool: "TEQSA", report: "GENERAL", homeAffairs: "AITSL" },
    "251211": { tool: "AHPRA", report: "GENERAL", homeAffairs: "ASMIRT" },
    "251214": { tool: "AHPRA", report: "GENERAL", homeAffairs: "ASMIRT" },
    "251411": { tool: "AHPRA", report: "GENERAL", homeAffairs: "OCANZ" },
    "252312": { tool: "AHPRA", report: "ADC", homeAffairs: "ADC" },
    "252511": { tool: "AHPRA", report: "GENERAL", homeAffairs: "APC" },
    "252712": { tool: "SpeechPathAus", report: "GENERAL", homeAffairs: "SPA" },
    "271311": { tool: "LIV", report: "GENERAL", homeAffairs: "Legal admissions authority of a state or territory" },
    "272311": { tool: "AHPRA", report: "GENERAL", homeAffairs: "APS" },
    "272511": { tool: "ACWA", report: "GENERAL", homeAffairs: "AASW" },
    "312212": { tool: "Engineers Australia", report: "VETASSESS", homeAffairs: "VETASSESS" },
    "351311": { tool: "VETASSESS", report: "TRA", homeAffairs: "TRA" },
    "351411": { tool: "VETASSESS", report: "TRA", homeAffairs: "TRA" },
    "411711": { tool: "ACWA", report: "GENERAL", homeAffairs: "Community Work Australia" },
    "421111": { tool: "VETASSESS", report: "GENERAL", homeAffairs: "ACECQA" },
  };
  // 221213 CPA (Home Affairs: CAANZ / CPAA / IPA; the registry prefers CPA), 222211 and 232112 VETASSESS, 322311 and
  // 342111 TRA -- per the Home Affairs list and the VETASSESS / TRA documents.
  const SOURCED = new Set(["221213", "222211", "232112", "322311", "342111"]);
  const titles = new Map((anzscoList as Array<{ code: string | number; title_en?: string }>).map((o) => [String(o.code), o.title_en ?? ""]));
  let matched = 0;
  for (const [code, toolKey] of Object.entries(mapping)) {
    const resolved = resolveAssessingAuthority(`${titles.get(code) ?? ""} ${code}`.trim());
    const report = resolved.authorityId;
    const known = KNOWN[code];
    // The 5 codes fixed from source documents must resolve from the registry's own occupation list, not a title keyword.
    if (SOURCED.has(code) && resolved.source !== "registry-code") fail(`${code}: the report resolves ${report} by ${resolved.source}, not from the registry's occupation list`);
    if (TOOL_KEY[report] === toolKey) {
      matched++;
      if (known) fail(`${code}: tool page and report now agree (${toolKey}) -- remove it from the known-mismatch list`);
      continue;
    }
    if (!known) fail(`${code} ${titles.get(code)}: tool page shows ${toolKey}, the report resolves ${report}`);
    else if (known.tool !== toolKey || known.report !== report) fail(`${code}: known mismatch changed (tool ${toolKey}, report ${report}; recorded tool ${known.tool}, report ${known.report}) -- re-check it and update the list`);
  }
  for (const code of Object.keys(KNOWN)) if (!(code in mapping)) fail(`${code}: in the known-mismatch list but not on the tool page`);
  if (failures === before) {
    ok(`${matched} tool-page occupations name the same assessing authority as the report; ${Object.keys(KNOWN).length} known pre-existing mismatches unchanged (Home Affairs authority recorded for each)`);
    for (const [code, k] of Object.entries(KNOWN)) console.log(`  ⚠️  ${code}: tool ${k.tool}, report ${k.report}; Home Affairs list: ${k.homeAffairs}`);
  }
}

console.log("\n==================== Occupational Therapist: assessing body is OTC, not Occupational Therapy Australia ====================");
{
  const before = failures;
  // The migration skills assessment is done by the Occupational Therapy Council of Australia (OTC); Occupational
  // Therapy Australia (otaus.com.au) is the professional association. The tool card must name and link the body
  // the report's registry names (otc-australia.ts), whose contact domain is otcouncil.com.au.
  const body = tool.assessingBodies[mapping["252411"] as keyof typeof tool.assessingBodies] as { name: string; shortName: string; website: string };
  const registryName = otcAustraliaAuthority.authorityName.replace(/ Ltd$/, "");
  const registryDomain = JSON.stringify(otcAustraliaAuthority).match(/@([a-z0-9.-]+\.[a-z]+)/)?.[1];
  if (body.name !== registryName) fail(`252411 card names "${body.name}", the registry names "${registryName}"`);
  if (body.shortName !== otcAustraliaAuthority.authorityId) fail(`252411 card short name "${body.shortName}" != "${otcAustraliaAuthority.authorityId}"`);
  if (!registryDomain || new URL(body.website).hostname.replace(/^www\./, "") !== registryDomain) fail(`252411 card links ${body.website}, not the registry's domain ${registryDomain}`);

  // Nowhere the site or the report renders from may name the association as the assessing body.
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|json|md)$/.test(n) ? [p] : [];
    });
  const offenders = ["app", "components", "lib", "src", "public/locales"]
    .flatMap(walk)
    .filter((p) => /Occupational Therapy Australia|otaus\.com\.au/.test(readFileSync(p, "utf8")));
  if (offenders.length) fail(`"Occupational Therapy Australia" / otaus.com.au still appears in: ${offenders.join(", ")}`);
  if (failures === before) ok(`252411: tool card "${body.name}" (${body.shortName}, ${body.website}); no "Occupational Therapy Australia" in app/components/lib/src/locales`);
}

console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
process.exitCode = failures === 0 ? 0 : 1;
