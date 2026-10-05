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
 *   4. "Proceed to the application" / "your profile is strong" while no invitation exists, and any sentence tying
 *      English test age to the visa grant (meaning variants, en / tr / zh-Hans) -- in the rendered PDFs AND in every
 *      static text source (lib, src, app, components, public/locales).
 *
 *   npx tsx scripts/test-report-banned-phrases.ts
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

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
  // "Potential score" is now a defined term (Tier 2 of the two-tier status: the score as if the skills assessment
  // were positive). What stays banned is the old vague use: a potential score that "meets/exceeds the threshold".
  /potential score (?:meets|exceeds)/i,
  /potansiyel puanınız (?:barajı|yeterli)/i,
  /潜在积分/,
  /4,885\s*[–-]\s*4,890/,
  // English validity: the Home Affairs wording (taken within 3 years before LODGING, valid at invitation) replaced
  // "within the 3 years before the date of invitation".
  /before the date of invitation/i,
  /davet tarihinden önceki/i,
  /获邀日期前/,
  // 190 / 491 benchmarks compared with a score WITHOUT the nomination those visas require (old wording).
  /only if nominated/i,
  /only if a (?:regional|state) nomination is secured/i,
  /yalnızca aday gösterilirseniz/i,
  /仅在获得提名时/,
  // "Meets/exceeds the threshold" without the benchmark gap (65 is only the legal minimum).
  /threshold exceeded/i,
  /exceeded the (points )?threshold/i,
  /(meets|exceeds) the threshold/i,
  /puan barajını aştınız/i,
  /已超过积分门槛/,
  /must include ANZSCO code/i,
  /ANZSCO kodu, görev/i,
  /ANZSCO代码、职责/,
  // "Proceed to the application" / "your profile is strong" while no invitation exists (the next step is an EOI; a
  // visa application needs an invitation, and for 190/491 a nomination).
  /proceed (?:directly )?(?:to|with) (?:the |your )?(?:visa )?application/i,
  /(?:your )?profile is strong/i,
  /can (?:now )?(?:start|begin) (?:the |your )?(?:visa )?application(?: process)?/i,
  /profiliniz güçlü/i,
  /(?:hemen )?başvuru sürecine geçebilirsiniz/i,
  /档案较强/,
  /可以立即开始申请/,
];

/**
 * English test age tied to the visa GRANT, in any wording (the rule: taken within 3 years before LODGING, valid at
 * invitation). A sentence matches when it names an English test/score, a validity/age condition and the grant.
 */
export function englishAgeTiedToGrant(text: string): string | undefined {
  // Sentences, and JSON array items / clauses (one-line JSON arrays hold several unrelated steps).
  const sentences = text.split(/(?<=[.!?。！？])\s*|\n+|"\s*,\s*"|;\s/);
  const rules: Array<[RegExp, RegExp, RegExp]> = [
    [/\b(english|ielts|pte|toefl|oet|language test|test results?|scores?)\b/i, /\b(old|valid|validity|within|no more than|expire[sd]?|current)\b/i, /\bgrant(?:ed)?\b/i],
    [/(ingilizce|ielts|pte|toefl|dil testi|sınav|test sonuc|skor)/i, /(geçerli|eski|yıl içinde|süresi)/i, /(vize onay|vizenin veril|vize verili|veriliş)/i],
    [/(英语|雅思|托福|语言考试|考试成绩|成绩)/, /(有效|年内|超过|过期)/, /(获批|获签|签证批准|发放签证|批签)/],
  ];
  return sentences.find((s) => rules.some(([a, b, c]) => a.test(s) && b.test(s) && c.test(s)));
}

/** Every static text source a report or page can show: engine/content code, data files and locale bundles. */
function staticTextSources(): string[] {
  const roots = ["lib", "src", "app", "components", "public/locales"];
  const out: string[] = [];
  const walk = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx|json|md)$/.test(e.name)) out.push(p);
    }
  };
  roots.forEach(walk);
  return out;
}

/** Files that LIST banned wording as detection patterns (validators), not as text shown to anyone. */
const PATTERN_DEFINITION_FILES = new Set(["lib/readiness/report-invariants.ts", "lib/ai/generate-premium-strategy.ts", "lib/ai/strategy-schema.ts"].map((f) => path.normalize(f)));

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

  console.log("==================== static text sources: proceed-to-application claims, English age tied to grant ====================");
  {
    const files = staticTextSources();
    const proceed = BANNED_CLAIMS.slice(-7);
    const hits: string[] = [];
    for (const f of files) {
      if (PATTERN_DEFINITION_FILES.has(path.normalize(f))) continue;
      const text = readFileSync(f, "utf8");
      for (const re of proceed) {
        const m = text.match(re);
        if (m) hits.push(`${f}: ${re} -> "${text.slice(Math.max(0, (m.index ?? 0) - 50), (m.index ?? 0) + 70).replace(/\s+/g, " ")}"`);
      }
      // Line by line (code and JSON keep one sentence per string), then sentence by sentence.
      for (const line of text.split("\n")) {
        const s = englishAgeTiedToGrant(line);
        if (s) hits.push(`${f}: English test age tied to grant -> "${s.trim().slice(0, 160)}"`);
      }
    }
    if (hits.length === 0) ok(`${files.length} static source files: no proceed-to-application claim, no English-age-at-grant sentence`);
    else hits.forEach((h) => fail(h));
    // The detector itself catches the meaning variants.
    const variants = [
      "Scores must be no more than 3 years old at time of visa grant.",
      "Your IELTS result has to remain valid until the visa is granted.",
      "Sınav sonucu vize onayı tarihinde 3 yıldan eski olmamalıdır.",
      "英语成绩在签证获批时不得超过 3 年。",
    ];
    const misses = variants.filter((v) => !englishAgeTiedToGrant(v));
    if (misses.length === 0) ok(`the English-age-at-grant detector catches ${variants.length} wording variants (en / tr / zh-Hans)`);
    else misses.forEach((m) => fail(`detector missed: "${m}"`));
    if (!englishAgeTiedToGrant("The test must have been taken within the 3 years before you lodge your visa application, and the result must also be valid on the date of invitation.")) ok("the corrected wording is not flagged");
    else fail("the corrected wording is flagged");
  }

  const rendered = await renderPersonaPdfTexts(REVIEW_PERSONAS);
  console.log(`==================== rendered ${rendered.length} PDFs (${Object.keys(REVIEW_PERSONAS).length} personas x en/tr/zh-Hans) ====================`);

  for (const r of rendered) {
    const text = r.text.replace(/\s+/g, " ");
    const tag = `${r.id} [${r.locale}]`;
    const hits = [...BANNED_INTERNAL_PHRASES, ...BANNED_CLAIMS].flatMap((re) => {
      const m = text.match(re);
      return m ? [`${re} -> "...${text.slice(Math.max(0, (m.index ?? 0) - 60), (m.index ?? 0) + 60)}..."`] : [];
    });
    const grant = englishAgeTiedToGrant(text); // PDF lines wrap mid-sentence: check the whitespace-joined text
    if (grant) hits.push(`English test age tied to grant -> "${grant.replace(/\s+/g, " ").slice(0, 160)}"`);
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

    // No experience entered -> no "below 2 years" / deduction wording; the points table says what was claimed (0 years).
    if (input.offshoreExperienceYears === undefined && input.onshoreExperienceYears === undefined) {
      const below2 = /below 2 years|2 yilin altinda|不足 2 年|deducted years|ACS deducted experience/i.test(text);
      const rowsWithNote = (r.report as { pointsEstimate?: { breakdown: Array<{ label: string; points: number; max?: number; note?: string }> } }).pointsEstimate?.breakdown.filter((b) => /Claimed Experience|Beyan Edilen Tecrübe|申报经验/.test(b.note ?? "") && b.max !== undefined && b.points < b.max) ?? [];
      const flatText = text.replace(/\s+/g, "");
      const claimed = rowsWithNote.every((b) => flatText.includes((b.note ?? "").replace(/\s+/g, "")));
      if (!below2 && claimed) ok(`${tag}: no experience entered -- no "below 2 years" / deduction line; the points table states the claimed experience`);
      else fail(`${tag}: experience lines -- below2/deduction ${below2}, claimed experience in the points table ${claimed} (${rowsWithNote.length} rows)`);
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
      // Old labels "(subclass 491)" / "（491 子类）" and the current "required for subclass 491" forms.
      const noms = [
        ...s.label.matchAll(/\((?:subclass|Subclass) (190|491)\)|（(190|491) 子类）|required for subclass (190|491)|Subclass (190|491) için zorunlu|(190|491) 子类的必要条件/g),
      ].map((m) => m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5]);
      const scope = s.onlyForSubclass ?? noms[0];
      if ((bench === "189" && (scope || noms.length)) || (bench !== "189" && noms.some((n) => n !== bench)) || (scope && bench !== "189" && scope !== bench)) {
        fail(`${tag}: "${s.label}" mixes subclasses (benchmark ${bench}, nomination ${noms.join("/") || scope})`);
      }
      // 190 / 491 benchmark rows must include the nomination that visa requires.
      if ((bench === "190" || bench === "491") && !noms.includes(bench)) {
        fail(`${tag}: "${s.label}" compares the ${bench} benchmark with a score without its required nomination`);
      }
    }
  }

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

// Only when run directly: test-reference-report.ts imports the patterns from here.
if (/test-report-banned-phrases\.ts$/.test(process.argv[1] ?? "")) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
