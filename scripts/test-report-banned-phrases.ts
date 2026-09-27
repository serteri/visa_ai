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

async function main() {
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

    // TAS: status agrees with its note.
    const tas = report.stateNominationTracker?.states.find((s) => s.code === "TAS");
    if (tas && tas.status === "Open (Onshore & Offshore)") fail(`${tag}: TAS shows "Open (Onshore & Offshore)" while its offshore pathway is paused`);

    // Not on the list -> never recommended.
    const notListed = new Set((report.stateNominationTracker?.states ?? []).filter((s) => s.occupationListStatus === "not_listed").map((s) => s.code));
    const badTop = (report.stateNominationTracker?.topRecommendedStates ?? []).filter((s) => notListed.has(s.code));
    if (badTop.length) fail(`${tag}: Top Recommended includes states whose list excludes the occupation: ${badTop.map((s) => s.code)}`);

    // Booster: a Subclass 189 benchmark scenario never contains a nomination; 190/491 never the other one.
    for (const s of report.pointsBoosterSimulator?.scenarios ?? []) {
      const bench = s.label.match(/Subclass (189|190|491)/)?.[1];
      if (!s.isCombined || !bench) continue;
      if ((bench === "189" && s.onlyForSubclass) || (bench !== "189" && s.onlyForSubclass && s.onlyForSubclass !== bench)) {
        fail(`${tag}: "${s.label}" mixes subclasses (scope ${s.onlyForSubclass})`);
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
