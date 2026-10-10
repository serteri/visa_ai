/**
 * The homepage "What's inside the Visa Information Report" images (en / tr / zh-Hans):
 *   1. the old screenshots (the verdict-style report layout: viability ranking, percentages, "Highly Recommended") are removed from disk and
 *      referenced by no tracked source file, doc or config;
 *   2. the homepage and pricing page (and their component trees) reference only image files that exist; none of the removed assets;
 *   3. the four current preview pages (cover, At a glance, visa requirements with Your figure / Published figure, costs) exist in every
 *      locale as real PNGs, are generated from a synthetic profile with a placeholder name (scripts/render-showcase-images.ts) and the component
 *      points at them;
 *   4. captions in the three locale files: present, no verdict / ranking / recommendation / percentage wording; the old caption keys are gone.
 *
 *   npx tsx scripts/test-showcase-images.ts
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

import { findBannedPhrases } from "../lib/seo/banned-phrases";

let failures = 0;
const t = (name: string, cond: boolean, detail = "") => {
  if (cond) console.log(`  ✅ ${name}`);
  else {
    failures++;
    console.error(`  ❌ ${name}${detail ? ` -- ${detail}` : ""}`);
  }
};
const read = (f: string) => readFileSync(f, "utf8");
const LOCALES = ["en", "tr", "zh-Hans"] as const;
const KEYS = ["cover", "glance", "requirements", "costs"] as const;

const REMOVED = ["screenshot-2026-08-26-204059.png", "screenshot-2026-08-26-204437.png", "screenshot-2026-08-26-204504.png", "screenshot-2026-08-26-204514.png", "screenshot-2026-08-26-204527.png", "screenshot-2026-08-26-204541.png"];

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

async function main() {
  console.log("1. the old screenshots are gone");
  t("none of the removed files is on disk", REMOVED.every((f) => !existsSync(path.join("public/images/report-previews", f))));
  const tracked = execSync("git ls-files", { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).split("\n").filter((f) => f && existsSync(f) && !/\.(png|jpe?g|webp|ico|pdf|woff2?|ttf|otf|xlsx|zip)$/i.test(f) && f !== "scripts/test-showcase-images.ts");
  const holding = tracked.filter((f) => {
    try {
      const s = read(f);
      return REMOVED.some((r) => s.includes(r)) || /report-previews\/screenshot-/.test(s);
    } catch {
      return false;
    }
  });
  t("no tracked source, doc or config references a removed asset", holding.length === 0, holding.join(", "));

  console.log("\n2. homepage and pricing page reference only existing images");
  const pageFiles = [
    "components/home-content.tsx",
    ...walk("components/landing"),
    ...walk("components/sections"),
    "app/[locale]/(main)/page.tsx",
    ...walk("app/[locale]/pricing"),
  ].filter((f) => /\.(tsx|ts)$/.test(f) && existsSync(f));
  const refs: Array<{ file: string; ref: string }> = [];
  for (const f of pageFiles) for (const m of read(f).matchAll(/["'`(](\/images\/[A-Za-z0-9_.\-/${}]+)/g)) refs.push({ file: f, ref: m[1] });
  const concrete = refs.filter((r) => !r.ref.includes("${"));
  const missing = concrete.filter((r) => !existsSync(path.join("public", r.ref)));
  t("every literal /images/ path on those pages exists on disk", missing.length === 0, missing.map((m) => `${m.file}: ${m.ref}`).join(", "));
  t("none of those pages references a removed asset (or the old screenshot folder pattern)", refs.every((r) => !REMOVED.some((x) => r.ref.includes(x)) && !/report-previews\/screenshot/.test(r.ref)));
  const pricingSrc = walk("app/[locale]/pricing").map(read).join("\n");
  t("the pricing page uses no report image at all", !/report-previews|screenshot|next\/image/.test(pricingSrc));

  console.log("\n3. the current preview pages");
  const component = read("components/sections/PremiumReportShowcase.tsx");
  t("the component lists the four current pages and builds the path from the locale and the key", KEYS.every((k) => component.includes(`key: "${k}"`)) && /\/images\/report-previews\/\$\{imageLocale\}\/\$\{active\.key\}\.png/.test(component));
  t("the component no longer lists the old feature keys", !/viabilityRanking|pointsBreakdown|pointsBooster|financialRoadmap|historicalTrends/.test(component));
  for (const L of LOCALES) {
    for (const k of KEYS) {
      const f = path.join("public/images/report-previews", L, `${k}.png`);
      if (!existsSync(f)) {
        t(`${L}/${k}.png exists`, false);
        continue;
      }
      const meta = await sharp(f).metadata();
      t(`${L}/${k}.png is a PNG, ${meta.width}x${meta.height}`, meta.format === "png" && (meta.width ?? 0) >= 800 && (meta.height ?? 0) >= 300 && statSync(f).size > 5000);
    }
  }
  const gen = read("scripts/render-showcase-images.ts");
  t("the images come from the real PDF route with a synthetic profile and the placeholder name 'Sample Applicant'", /SHOWCASE_NAME = "Sample Applicant"/.test(gen) && /REVIEW_PERSONAS\["reference-se-au"\]/.test(gen) && /renderPersonaPdfTexts/.test(gen));
  t("the generator refuses a page with a percentage or verdict / ranking / recommendation wording", /VERDICT\[locale\]/.test(gen) && /%/.test(gen) && /recommend/.test(gen));

  console.log("\n4. captions");
  const VERDICT: Record<(typeof LOCALES)[number], RegExp> = {
    en: /recommend|eligib|likely|best|strongest|chance|probab|rank|potential|suitab|match|%/i,
    tr: /öner|en iyi|şans|olasılık|sıralama|güçlü|zayıf|potansiyel|uygun|eşleş|%/i,
    "zh-Hans": /推荐|最佳|最强|最弱|几率|概率|可能性|排名|适合|符合条件|潜力|匹配|%/,
  };
  for (const L of LOCALES) {
    const d = JSON.parse(read(`public/locales/${L}.json`)) as Record<string, string>;
    const strings = KEYS.flatMap((k) => [d[`home.reportShowcase.features.${k}.title`], d[`home.reportShowcase.features.${k}.description`]]).concat(d["home.reportShowcase.sampleNote"]);
    t(`${L}: a title and a description for each of the four pages, and the sample note`, strings.every((x) => typeof x === "string" && x.length > 1));
    const bad = strings.filter((x) => x && (VERDICT[L].test(x) || (L === "en" && findBannedPhrases(x).length > 0)));
    t(`${L}: no verdict, ranking, recommendation, match or percentage wording in the captions`, bad.length === 0, bad.join(" | "));
    t(`${L}: the old caption keys are gone`, !Object.keys(d).some((k) => /home\.reportShowcase\.features\.(viabilityRanking|pointsBreakdown|pointsBooster|financialRoadmap|historicalTrends)/.test(k)));
    t(`${L}: the sample note says placeholder name / information only`, /placeholder|yer tutucu|占位符/.test(d["home.reportShowcase.sampleNote"]));
  }

  console.log(`\n${failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
