/**
 * Renders the homepage "What's inside the Visa Information Report" preview images from the CURRENT information report: a synthetic profile with a
 * placeholder name, the real PDF route, four pages (cover, At a glance, a visa requirement table with Your figure / Published figure, the costs table),
 * in en / tr / zh-Hans. Output: public/images/report-previews/<locale>/<cover|glance|requirements|costs>.png (committed; re-run to refresh).
 * Requires poppler's pdftoppm and sharp. A page whose text contains verdict-style wording, a percentage or "recommend" is refused, not saved.
 *
 *   npx tsx scripts/render-showcase-images.ts
 */
import "./lib/stub-request-context";

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { PDFParse } from "pdf-parse";
import sharp from "sharp";

import { reportDisclaimer } from "../lib/reports/report-disclaimer";
import { reportSectionTitle } from "../lib/reports/report-section-titles";
import type { Locale, ReadinessInput } from "../lib/readiness/types";
import { REVIEW_PERSONAS, renderPersonaPdfTexts } from "./render-persona-pdfs";

export const SHOWCASE_NAME = "Sample Applicant";
export const SHOWCASE_PAGES = ["cover", "glance", "requirements", "costs"] as const;
const FIGURE_HEADER: Record<Locale, string> = { en: "Published figure", tr: "Yayımlanmış rakam", "zh-Hans": "已公布的数字" };
const VERDICT: Record<Locale, RegExp> = {
  en: /recommend|eligible|eligibility|likely|best match|strongest|chance|probab|ranking|rank\b|high potential|low potential|you should|you must|you need|suitab/i,
  tr: /öner|en iyi|şans|olasılık|sıralama|güçlü|zayıf|yüksek potansiyel|düşük potansiyel/i,
  "zh-Hans": /推荐|最佳|最强|最弱|几率|概率|可能性|排名|适合您|高潜力|低潜力|符合条件/,
};
/** Each image starts at its section heading (the cover is the whole first page). */
const CROP_AT: Record<(typeof SHOWCASE_PAGES)[number], "glance" | "visas" | "costs" | null> = { cover: null, glance: "glance", requirements: "visas", costs: "costs" };
const OUT = path.join("public", "images", "report-previews");

/** The text on a page below the heading `title` (its whole text when `title` is null), and the heading's top edge as a fraction of the page height (poppler's pdftotext -bbox). */
function textBelow(pdfPath: string, pageNo: number, title: string | null, locale: Locale): { text: string; topFraction: number } {
  const xml = execFileSync("pdftotext", ["-bbox", "-f", String(pageNo), "-l", String(pageNo), pdfPath, "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const height = Number(/<page width="[\d.]+" height="([\d.]+)"/.exec(xml)?.[1]);
  const words = [...xml.matchAll(/<word xMin="[\d.]+" yMin="([\d.]+)" xMax="[\d.]+" yMax="[\d.]+">([^<]*)<\/word>/g)].map((m) => ({ y: Number(m[1]), str: m[2].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'") }));
  let cut = 0;
  if (title) {
    const toks = title.split(/\s+/);
    const hit = words.find((w, i) => (toks.length > 1 ? toks.every((t, k) => words[i + k]?.str === t) : w.str === toks[0] || (/[\u4e00-\u9fff]/.test(toks[0]) && w.str.startsWith(toks[0]))));
    if (!hit) throw new Error(`heading "${title}" not found on page ${pageNo}`);
    cut = hit.y - 4;
  }
  // The text in the image: the page's lines from the heading down, without the standard disclaimer (it names what the report is NOT, in the banned words).
  const flat = (x: string) => x.replace(/\s+/g, "");
  const lines = execFileSync("pdftotext", ["-f", String(pageNo), "-l", String(pageNo), pdfPath, "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).split("\n");
  const from = title ? Math.max(0, lines.findIndex((l) => l.trim() === title || l.trim().startsWith(title))) : 0;
  const disclaimer = flat(reportDisclaimer(locale));
  const text = lines.slice(from).filter((l) => !(flat(l).length > 6 && disclaimer.includes(flat(l)))).join("\n");
  return { text, topFraction: Math.max(0, cut / height) };
}

async function main() {
  process.env.DATABASE_URL ||= "postgresql://u:p@localhost:5432/d?sslmode=disable";
  const base = REVIEW_PERSONAS["reference-se-au"];
  const persona = { ...base, mainGoal: "Skilled migration through subclass 189, 190 or 491", targetVisa: "491", preferredPathway: "491", offshoreExperienceYears: 3, onshoreExperienceYears: 1, annualSalaryAud: 90000 } as ReadinessInput;
  const pdfs: Partial<Record<Locale, Uint8Array>> = {};
  await renderPersonaPdfTexts({ showcase: persona }, ["en", "tr", "zh-Hans"], undefined, "2026-10-01T00:00:00Z", (_id, l, b) => (pdfs[l] = b.slice()), SHOWCASE_NAME);
  if (process.env.KEEP_PDF) for (const l of ["en", "tr", "zh-Hans"] as const) writeFileSync(`/tmp/claude-0/showcase-${l}.pdf`, pdfs[l]!);
  const tmp = mkdtempSync(path.join(os.tmpdir(), "showcase-"));
  try {
    for (const locale of ["en", "tr", "zh-Hans"] as const) {
      const parser = new PDFParse({ data: pdfs[locale]!.slice() });
      const pages = (await parser.getText()).pages.map((p: { text: string }) => p.text);
      await parser.destroy();
      const flat = (x: string) => x.replace(/\s+/g, " ");
      const lines = pages.map((t) => t.split("\n").map((l) => l.trim()));
      const glance = lines.findIndex((l) => l.includes(reportSectionTitle("glance", locale))) + 1;
      const requirements = lines.findIndex((l, i) => i + 1 > glance && l.some((x) => x === reportSectionTitle("visas", locale)) && l.some((x) => x.includes(FIGURE_HEADER[locale]))) + 1;
      const costTitle = reportSectionTitle("costs", locale);
      const costs = lines.map((l, i) => (l.some((x) => x === costTitle) ? i + 1 : 0)).filter(Boolean).pop() ?? 0;
      if (!glance || !requirements || !costs) throw new Error(`${locale}: pages not found (glance ${glance}, requirements ${requirements}, costs ${costs})`);
      const wanted: Record<(typeof SHOWCASE_PAGES)[number], number> = { cover: 1, glance, requirements, costs };
      mkdirSync(path.join(OUT, locale), { recursive: true });
      for (const key of SHOWCASE_PAGES) {
        // Each section image is cropped at its heading, and only what is in the image is checked.
        const pdfPath = path.join(tmp, `${locale}.pdf`);
        writeFileSync(pdfPath, pdfs[locale]!);
        const { text, topFraction } = textBelow(pdfPath, wanted[key], CROP_AT[key] ? reportSectionTitle(CROP_AT[key]!, locale) : null, locale);
        // The PDF's own wording is held by test-report-banned-phrases; this is the image gate: no percentage and no verdict / ranking / recommendation word.
        const verdict = VERDICT[locale].exec(text)?.[0];
        if (/%/.test(text) || verdict) throw new Error(`${locale}/${key}: page ${wanted[key]} has verdict-style text: ${verdict ?? "%"}`);
        execFileSync("pdftoppm", ["-png", "-r", "110", "-f", String(wanted[key]), "-l", String(wanted[key]), "-singlefile", pdfPath, path.join(tmp, `${locale}-${key}`)]);
        const png = sharp(readFileSync(path.join(tmp, `${locale}-${key}.png`)));
        const meta = await png.metadata();
        const top = Math.floor((meta.height ?? 0) * topFraction);
        await png.extract({ left: 0, top, width: meta.width!, height: meta.height! - top }).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(path.join(OUT, locale, `${key}.png`));
        console.log(`${locale}/${key}.png <- page ${wanted[key]}${top ? `` : ""}`);
      }
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
