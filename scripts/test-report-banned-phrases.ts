/**
 * Scans REAL generated PDF text (the production PDF route, via scripts/render-persona-pdfs.ts) in en / tr / zh-Hans
 * for:
 *   1. Internal pipeline phrases that must never reach a customer ("in this folder", "source document(s)", ...).
 *   2. Factual claims corrected in the report review (settlement funds as a federal requirement, "automatic
 *      rejection", a flat "10-year ban", the "IMM digital portal", an automatic Bridging Visa A, "potential score",
 *      a "4,885–4,890" range, ...).
 *   3. Profile-specific consistency for the review personas: no experience entered -> only "experience not provided"
 *      (no "below 2 years" / ACS deduction line); TAS never "Onshore & Offshore" while its offshore pathway is
 *      paused; no Subclass 189 benchmark scenario with a nomination factor; a state not listing the occupation is
 *      never a Top Recommended State.
 *
 *   npx tsx scripts/test-report-banned-phrases.ts
 */
import stateStatus from "../src/data/state-nomination-status.json";
import { STATE_RULES } from "../lib/state-nomination/state-rules-config";
import { STATE_NOTE_TRANSLATIONS } from "../lib/state-nomination/state-note-translations";
import { REVIEW_PERSONAS, renderPersonaPdfTexts } from "./render-persona-pdfs";

let failures = 0;
const ok = (m: string) => console.log(`  ✅ ${m}`);
const fail = (m: string) => {
  failures++;
  console.error(`  ❌ ${m}`);
};

/** Internal pipeline wording, every locale. */
export const BANNED_INTERNAL_PHRASES: RegExp[] = [
  /in this folder/i,
  /source documents?/i,
  /newest documents?/i,
  /freshest documents?/i,
  /unmarked in the source/i,
  /inferred from how/i,
  /data\/knowledge/i,
  /NOT VERIFIABLE/,
  /kaynak belge/i,
  /bu klasör/i,
  /i[sş]aretlenmemi[sş]/i,
  /来源文件/,
  /源文件/,
  /原始文件/,
  /此文件夹/,
];

/** Claims the review found wrong or misleading, every locale. */
export const BANNED_CLAIMS: RegExp[] = [
  /Insufficient Settlement Funds/i,
  /Yetersiz Settlement Funds/i,
  /定居资金不足/,
  /automatic rejection/i,
  /otomatik ret/i,
  /自动被拒/,
  /10-year ban/i,
  /10 yıl men/i,
  /10年禁止/,
  /\bIMM\b/,
  /you get a Bridging Visa A/i,
  /Bridging Visa A alırsınız/i,
  /potential score/i,
  /potansiyel puan/i,
  /潜在积分/,
  /4,885\s*[–-]\s*4,890/,
  // English validity: the Home Affairs wording (taken within 3 years before LODGING, valid at invitation) replaced
  // "within the 3 years before the date of invitation".
  /before the date of invitation/i,
  /davet tarihinden önceki/i,
  /获邀日期前/,
  // "Meets/exceeds the threshold" without the benchmark gap (65 is only the legal minimum).
  /threshold exceeded/i,
  /exceeded the (points )?threshold/i,
  /(meets|exceeds) the threshold/i,
  /puan barajını aştınız/i,
  /已超过积分门槛/,
  /must include ANZSCO code/i,
  /ANZSCO kodu, görev/i,
  /ANZSCO代码、职责/,
];

/** Every English state note / special condition shown in the tracker, which a tr / zh-Hans report must not contain. */
const ENGLISH_STATE_NOTES = [
  ...Object.values(STATE_RULES).map((r) => r.note),
  ...(stateStatus as { states: Array<{ specialConditions: string[] }> }).states.flatMap((st) => st.specialConditions),
];

async function main() {
  console.log("==================== state notes: a tr / zh-Hans translation for every English note ====================");
  const missing = ENGLISH_STATE_NOTES.filter((n) => !STATE_NOTE_TRANSLATIONS[n]);
  if (missing.length === 0) ok(`${ENGLISH_STATE_NOTES.length} state notes and special conditions all have tr and zh-Hans versions`);
  else missing.forEach((m) => fail(`no translation for state note: "${m.slice(0, 90)}..."`));

  const rendered = await renderPersonaPdfTexts(REVIEW_PERSONAS);
  console.log(`==================== rendered ${rendered.length} PDFs (${Object.keys(REVIEW_PERSONAS).length} personas x en/tr/zh-Hans) ====================`);

  for (const r of rendered) {
    const text = r.text.replace(/\s+/g, " ");
    const tag = `${r.id} [${r.locale}]`;
    const hits = [...BANNED_INTERNAL_PHRASES, ...BANNED_CLAIMS].flatMap((re) => {
      const m = text.match(re);
      return m ? [`${re} -> "...${text.slice(Math.max(0, (m.index ?? 0) - 60), (m.index ?? 0) + 60)}..."`] : [];
    });
    if (hits.length) hits.forEach((h) => fail(`${tag}: ${h}`));
    else ok(`${tag}: no banned phrase (${BANNED_INTERNAL_PHRASES.length} internal + ${BANNED_CLAIMS.length} claim patterns)`);

    // tr / zh-Hans: no English state note (compared on its first 50 characters, whitespace-insensitive).
    if (r.locale !== "en") {
      const squash = (t: string) => t.replace(/\s+/g, "");
      const flat = squash(r.text);
      const leaked = ENGLISH_STATE_NOTES.filter((n) => flat.includes(squash(n.slice(0, 50))));
      if (leaked.length) leaked.forEach((n) => fail(`${tag}: English state note in a ${r.locale} report: "${n.slice(0, 70)}..."`));
      else ok(`${tag}: state notes in ${r.locale}`);
    }

    const input = REVIEW_PERSONAS[r.id];
    const report = r.report as {
      stateNominationTracker?: { states: Array<{ code: string; status: string; occupationListStatus?: string }>; topRecommendedStates: Array<{ code: string }> };
      pointsBoosterSimulator?: { scenarios: Array<{ label: string; isCombined?: boolean; onlyForSubclass?: string }> };
    };

    // No experience entered -> only "experience not provided".
    if (input.offshoreExperienceYears === undefined && input.onshoreExperienceYears === undefined) {
      const below2 = /below 2 years|2 yilin altinda|不足 2 年|deducted years|ACS deducted experience/i.test(text);
      const notProvided = /Work experience not provided|Is deneyimi girilmedi|未提供工作经验/.test(text);
      if (!below2 && notProvided) ok(`${tag}: experience not provided -- no "below 2 years" / deduction line`);
      else fail(`${tag}: experience lines -- below2/deduction ${below2}, "not provided" ${notProvided}`);
    }

    // WA list: a Software Engineer (261313, on WA's Schedule 2 and Graduate lists) sees WA's stream conditions.
    if (/261313/.test(input.occupation ?? "")) {
      const wa = report.stateNominationTracker?.states.find((s) => s.code === "WA") as { streamNotes?: string[]; occupationListStatus?: string } | undefined;
      const shown = (wa?.streamNotes ?? []).every((n) => text.replace(/\s+/g, "").includes(n.replace(/\s+/g, "").slice(0, 60)));
      if (wa?.occupationListStatus === "confirmed" && (wa.streamNotes?.length ?? 0) === 2 && shown) ok(`${tag}: WA on the list with its 190-contract and Graduate-study conditions shown`);
      else fail(`${tag}: WA ${wa?.occupationListStatus}, stream notes ${wa?.streamNotes?.length ?? 0}, shown ${shown}`);
    }

    // TAS: status agrees with its note.
    const tas = report.stateNominationTracker?.states.find((s) => s.code === "TAS");
    if (tas && tas.status === "Open (Onshore & Offshore)") fail(`${tag}: TAS shows "Open (Onshore & Offshore)" while its offshore pathway is paused`);

    // Not on the list -> never recommended.
    const notListed = new Set((report.stateNominationTracker?.states ?? []).filter((s) => s.occupationListStatus === "not_listed").map((s) => s.code));
    const badTop = (report.stateNominationTracker?.topRecommendedStates ?? []).filter((s) => notListed.has(s.code));
    if (badTop.length) fail(`${tag}: Top Recommended includes states whose list excludes the occupation: ${badTop.map((s) => s.code)}`);

    // Booster: a Subclass 189 benchmark scenario never contains a nomination; 190/491 never the other one.
    // Checked on the label TEXT as well as the scope field, so an old-format report (no onlyForSubclass) is caught too.
    for (const s of report.pointsBoosterSimulator?.scenarios ?? []) {
      const bench = s.label.match(/Subclass (189|190|491) (?:invitation benchmark|son davet referansı|近期邀请参考分)/)?.[1];
      if (!s.isCombined || !bench) continue;
      const noms = [...s.label.matchAll(/\((?:subclass|Subclass) (190|491)\)|（(190|491) 子类）/g)].map((m) => m[1] ?? m[2]);
      const scope = s.onlyForSubclass ?? noms[0];
      if ((bench === "189" && (scope || noms.length)) || (bench !== "189" && noms.some((n) => n !== bench)) || (scope && bench !== "189" && scope !== bench)) {
        fail(`${tag}: "${s.label}" mixes subclasses (benchmark ${bench}, nomination ${noms.join("/") || scope})`);
      }
    }
  }

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
