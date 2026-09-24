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
 * Pure data checks: runs in CI (no data/knowledge needed).
 */
import tool from "../src/data/assessing-bodies.json";
import feeProvenance from "../src/data/fee-provenance.json";
import { anmacFee, FULL_SKILLS_ASSESSMENT_CODES, resolveAnmacAssessment } from "../lib/health-registration/anmac-fees";
import { IMG_PATHWAYS_SOURCE, resolveMedicalRegistration } from "../lib/health-registration/img-pathways";
import { ahpraAuthority } from "../lib/skills-assessment/authorities/ahpra";

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

console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
process.exitCode = failures === 0 ? 0 : 1;
