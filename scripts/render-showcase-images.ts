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
import { renderPersonaPdfTexts } from "./render-persona-pdfs";
import { AGENT_SAMPLE_PROFILE } from "./render-agent-sample";

export const SHOWCASE_NAME = "Sample Applicant";
export const SHOWCASE_PAGES = ["cover", "summary", "glance", "requirements", "costs"] as const;
const REQUIREMENT_HEADER: Record<Locale, string> = { en: "Published requirement", tr: "Yayımlanmış gereklilik", "zh-Hans": "已公布的要求" };
const FIGURE_HEADER: Record<Locale, string> = { en: "Published figure", tr: "Yayımlanmış rakam", "zh-Hans": "已公布的数字" };
const VERDICT: Record<Locale, RegExp> = {
  en: /estimate|recommend|eligible|eligibility|likely|best match|strongest|chance|probab|ranking|rank\b|high potential|low potential|you should|you must|you need|suitab/i,
  tr: /tahmin|öner|en iyi|şans|olasılık|sıralama|güçlü|zayıf|yüksek potansiyel|düşük potansiyel/i,
  "zh-Hans": /估计|估算|推荐|最佳|最强|最弱|几率|概率|可能性|排名|适合您|高潜力|低潜力|符合条件/,
};
/** Each image starts at its section heading (the cover and the requirements page are whole pages: the requirements image is the first visa block (cropped above the next block title) on the first page after the "Visa information" heading page that has the Your figure / Published figure columns and passes the image gate below, so a block with an invitation-level estimate is skipped). */
const CROP_AT: Record<(typeof SHOWCASE_PAGES)[number], "glance" | "visas" | "costs" | null> = { cover: null, summary: null, glance: "glance", requirements: null, costs: "costs" };
const OUT = path.join("public", "images", "report-previews");

type PageWord = { y: number; h: number; str: string };
const PY = process.platform === "win32" ? "python" : "python3";

/** The words of one page with their top edge and height, and the page height: poppler's `pdftotext -bbox`, else PyMuPDF (xpdf's pdftotext, e.g. on Windows, has no -bbox). */
function pageWords(pdfPath: string, pageNo: number): { height: number; words: PageWord[] } {
  try {
    const xml = execFileSync("pdftotext", ["-bbox", "-f", String(pageNo), "-l", String(pageNo), pdfPath, "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
    const height = Number(/<page width="[\d.]+" height="([\d.]+)"/.exec(xml)?.[1]);
    if (!Number.isFinite(height)) throw new Error("no bbox output");
    const words = [...xml.matchAll(/<word xMin="[\d.]+" yMin="([\d.]+)" xMax="[\d.]+" yMax="([\d.]+)">([^<]*)<\/word>/g)].map((m) => ({ y: Number(m[1]), h: Number(m[2]) - Number(m[1]), str: m[3].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'") }));
    return { height, words };
  } catch {
    const py = "import sys,json,fitz; sys.stdout.reconfigure(encoding='utf-8'); p=fitz.open(sys.argv[1])[int(sys.argv[2])-1]; print(json.dumps({'height':p.rect.height,'words':[{'y':w[1],'h':w[3]-w[1],'str':w[4]} for w in p.get_text('words')]}))";
    return JSON.parse(execFileSync(PY, ["-c", py, pdfPath, String(pageNo)], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));
  }
}

/** The text of one page, line by line: `pdftotext`, else PyMuPDF. */
function pageText(pdfPath: string, pageNo: number): string {
  try {
    return execFileSync("pdftotext", ["-f", String(pageNo), "-l", String(pageNo), pdfPath, "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return execFileSync(PY, ["-c", "import sys,fitz; sys.stdout.reconfigure(encoding='utf-8'); print(fitz.open(sys.argv[1])[int(sys.argv[2])-1].get_text())", pdfPath, String(pageNo)], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  }
}

/** The header of a requirement table's second column, which starts the table after the figure table in a visa block. */
const SECOND_TABLE_HEADER: Record<Locale, string[]> = { en: ["What", "you", "entered"], tr: ["Girdiğiniz"], "zh-Hans": ["您填写的内容"] };

export type Crop = { page: number; text: string; topFraction: number; bottomFraction: number };

/**
 * The visa blocks on a page as candidate crops. A visa block's title is the largest text on the page after the section heading; a block runs from its
 * title to the next title and stops where the second requirement table (What you entered) starts, so the crop shows the overview and the Your figure /
 * Published figure table. Only the words inside the crop are checked.
 */
function visaBlockCrops(pdfPath: string, pageNo: number, locale: Locale): Crop[] {
  const { height, words } = pageWords(pdfPath, pageNo);
  const sizes = words.map((w) => w.h).filter((h) => h < 16);
  if (!sizes.length) return [];
  const maxH = Math.max(...sizes);
  const titleYs = [...new Set(words.filter((w) => w.h > maxH - 0.5 && w.h < 16).map((w) => Math.round(w.y)))].sort((a, b) => a - b);
  const header = SECOND_TABLE_HEADER[locale];
  return titleYs.map((y, k) => {
    const top = Math.max(0, y - 6);
    let bottom = k + 1 < titleYs.length ? titleYs[k + 1] - 6 : height;
    const inside = words.filter((w) => w.y >= top && w.y < bottom);
    const at = inside.findIndex((w, i) => header.every((t, j) => inside[i + j]?.str === t));
    if (at > 0 && inside[at].y > top + 60) bottom = inside[at].y - 10;
    return { page: pageNo, topFraction: top / height, bottomFraction: bottom / height, text: words.filter((w) => w.y >= top && w.y < bottom).map((w) => w.str).join(" ") };
  });
}

/** The text on a page below the heading `title` (its whole text when `title` is null), and the heading's top edge as a fraction of the page height (poppler's pdftotext -bbox). */
function textBelow(pdfPath: string, pageNo: number, title: string | null, locale: Locale): { text: string; topFraction: number; bottomFraction: number } {
  const { height, words } = pageWords(pdfPath, pageNo);
  let cut = 0;
  if (title) {
    const toks = title.split(/\s+/);
    const hit = words.find((w, i) => (toks.length > 1 ? toks.every((t, k) => words[i + k]?.str === t) : w.str === toks[0] || (/[\u4e00-\u9fff]/.test(toks[0]) && w.str.startsWith(toks[0]))));
    if (!hit) throw new Error(`heading "${title}" not found on page ${pageNo}`);
    cut = hit.y - 4;
  }
  // The text in the image: the page's lines from the heading down, without the standard disclaimer (it names what the report is NOT, in the banned words).
  const flat = (x: string) => x.replace(/\s+/g, "");
  const lines = pageText(pdfPath, pageNo).split("\n");
  const from = title ? Math.max(0, lines.findIndex((l) => l.trim() === title || l.trim().startsWith(title))) : 0;
  const disclaimer = flat(reportDisclaimer(locale));
  const text = lines.slice(from).filter((l) => !(flat(l).length > 6 && disclaimer.includes(flat(l)))).join("\n");
  const bottom = height;
  return { text, topFraction: Math.max(0, cut / height), bottomFraction: bottom / height };
}

/** One PDF page as <outBase>.png at 110 dpi: poppler's pdftoppm when installed, else PyMuPDF (python -m pip install pymupdf) -- e.g. on Windows, where poppler is not packaged. */
function rasterisePage(pdfPath: string, pageNo: number, outBase: string): void {
  try {
    execFileSync("pdftoppm", ["-png", "-r", "110", "-f", String(pageNo), "-l", String(pageNo), "-singlefile", pdfPath, outBase]);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    const py = "import sys,fitz; d=fitz.open(sys.argv[1]); d[int(sys.argv[2])-1].get_pixmap(dpi=110).save(sys.argv[3]+'.png')";
    execFileSync(process.platform === "win32" ? "python" : "python3", ["-c", py, pdfPath, String(pageNo), outBase]);
  }
}

async function main() {
  // (render only; the dummy DATABASE_URL below keeps every database read on the bundled fallback data)
  process.env.DATABASE_URL ||= "postgresql://u:p@localhost:5432/d?sslmode=disable";
  // Neutral showcase: the target visa is the schema's "not_sure" (TARGET_VISAS), with no preferred pathway, so no visa is pre-selected.
  // The same synthetic profile as the agent sample PDF (scripts/render-agent-sample.ts): target visa "not_sure", no preferred pathway, employment and partner details not entered.
  const persona = { ...AGENT_SAMPLE_PROFILE } as ReadinessInput;
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
      const summary = lines.findIndex((l) => l.includes(reportSectionTitle("summary", locale))) + 1;
      const glance = lines.findIndex((l) => l.includes(reportSectionTitle("glance", locale))) + 1;
      const visasPage = lines.findIndex((l) => l.some((x) => x === reportSectionTitle("visas", locale))) + 1;
      const pdfPath = path.join(tmp, `${locale}.pdf`);
      writeFileSync(pdfPath, pdfs[locale]!);
      // The requirements image: the first visa block, from the "Visa information" page on, with the Your figure / Published figure columns that passes the image gate.
      const gateOk = (t: string) => !VERDICT[locale].test(t) && !/%/.test(t);
      let requirementsCrop: Crop | null = null;
      for (let pg = visasPage; visasPage > 0 && pg <= lines.length && !requirementsCrop; pg++) requirementsCrop = visaBlockCrops(pdfPath, pg, locale).find((c) => c.text.includes(REQUIREMENT_HEADER[locale]) && c.text.includes(FIGURE_HEADER[locale]) && gateOk(c.text)) ?? null;
      const requirements = requirementsCrop?.page ?? 0;
      const costTitle = reportSectionTitle("costs", locale);
      const costs = lines.map((l, i) => (l.some((x) => x === costTitle) ? i + 1 : 0)).filter(Boolean).pop() ?? 0;
      if (!summary || !glance || !requirements || !costs) throw new Error(`${locale}: pages not found (summary ${summary}, glance ${glance}, requirements ${requirements}, costs ${costs})`);
      const wanted: Record<(typeof SHOWCASE_PAGES)[number], number> = { cover: 1, summary, glance, requirements, costs };
      mkdirSync(path.join(OUT, locale), { recursive: true });
      for (const key of SHOWCASE_PAGES) {
        // Each section image is cropped at its heading, and only what is in the image is checked.
        const { text, topFraction, bottomFraction } = key === "requirements" ? requirementsCrop! : textBelow(pdfPath, wanted[key], CROP_AT[key] ? reportSectionTitle(CROP_AT[key]!, locale) : null, locale);
        // The PDF's own wording is held by test-report-banned-phrases; this is the image gate: no percentage and no verdict / ranking / recommendation word.
        const verdict = VERDICT[locale].exec(text)?.[0];
        if (/%/.test(text) || verdict) throw new Error(`${locale}/${key}: page ${wanted[key]} has verdict-style text: ${verdict ?? "%"}`);
        rasterisePage(pdfPath, wanted[key], path.join(tmp, `${locale}-${key}`));
        const png = sharp(readFileSync(path.join(tmp, `${locale}-${key}.png`)));
        const meta = await png.metadata();
        const top = Math.floor((meta.height ?? 0) * topFraction);
        await png.extract({ left: 0, top, width: meta.width!, height: Math.min(meta.height!, Math.floor(meta.height! * bottomFraction)) - top }).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(path.join(OUT, locale, `${key}.png`));
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
