/**
 * Generates a polished lead-magnet PDF from public/skilled-occupation-list.json:
 * a clean, branded, multi-page directory of Australian skilled occupations with
 * ANZSCO code, occupation lists, visa pathways, and assessing authority.
 *
 *   npx tsx scripts/generate-skilled-occupations-pdf.ts
 *   → public/australia-skilled-occupation-list-2026.pdf
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { jsPDF } from "jspdf";

import { notoSansRegularBase64 } from "../lib/readiness/pdf-font";
import { notoSansBoldBase64 } from "../lib/readiness/pdf-font-bold";

type SkilledOccupationRow = {
  anzsco_code: string;
  occupation_en: string;
  visa_types: string[];
  list: string[];
  assessing_authority: string[];
};

type Occ = {
  anzsco_code: string;
  occupation_name: string;
  lists: string[];
  visa_subclasses: string[];
  authority: string;
};

const SRC = path.join(process.cwd(), "public/skilled-occupation-list.json");
const OUT = path.join(process.cwd(), "public/australia-skilled-occupation-list-2026.pdf");

const rows = JSON.parse(readFileSync(SRC, "utf8")) as SkilledOccupationRow[];
const occupations = rows
  .map(
    (row): Occ => ({
      anzsco_code: row.anzsco_code,
      occupation_name: row.occupation_en,
      lists: row.list,
      visa_subclasses: row.visa_types,
      authority: row.assessing_authority.join(", "),
    })
  )
  .sort((a, b) => a.occupation_name.localeCompare(b.occupation_name));

const FONT = "NotoSans";
const NAVY = { r: 15, g: 23, b: 42 };
const ACCENT = { r: 8, g: 145, b: 178 };
const INK = { r: 30, g: 41, b: 59 };
const MUTED = { r: 100, g: 116, b: 139 };
const ZEBRA = { r: 248, g: 250, b: 252 };
const BORDER = { r: 226, g: 232, b: 240 };

const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
doc.addFileToVFS("NotoSans-Regular.ttf", notoSansRegularBase64);
doc.addFont("NotoSans-Regular.ttf", FONT, "normal");
doc.addFileToVFS("NotoSans-Bold.ttf", notoSansBoldBase64);
doc.addFont("NotoSans-Bold.ttf", FONT, "bold");

const pageW = doc.internal.pageSize.getWidth(); // ~297
const pageH = doc.internal.pageSize.getHeight(); // ~210
const margin = 14;
const contentW = pageW - margin * 2;

// Column layout (mm). Sums to contentW.
const COLS = [
  { key: "name", label: "Occupation", w: 96 },
  { key: "code", label: "ANZSCO", w: 22 },
  { key: "lists", label: "Occupation List(s)", w: 34 },
  { key: "visas", label: "Visa subclasses", w: 66 },
  { key: "authority", label: "Assessing Authority", w: contentW - 96 - 22 - 34 - 66 },
];

function setFill(c: { r: number; g: number; b: number }) {
  doc.setFillColor(c.r, c.g, c.b);
}
function setText(c: { r: number; g: number; b: number }) {
  doc.setTextColor(c.r, c.g, c.b);
}

function drawCover() {
  setFill(NAVY);
  doc.rect(0, 0, pageW, pageH, "F");
  setFill(ACCENT);
  doc.rect(0, 0, pageW, 4, "F");

  doc.setFont(FONT, "bold");
  setText({ r: 6, g: 182, b: 212 });
  doc.setFontSize(13);
  doc.text("LogiVisa", margin, 26);

  doc.setFontSize(34);
  setText({ r: 248, g: 250, b: 252 });
  doc.text("Australia Skilled", margin, pageH / 2 - 22);
  doc.text("Occupation List 2026", margin, pageH / 2 - 8);

  doc.setFont(FONT, "normal");
  doc.setFontSize(13);
  setText({ r: 148, g: 163, b: 184 });
  doc.text(
    `${occupations.length} occupations · ANZSCO codes · visa pathways · assessing authorities`,
    margin,
    pageH / 2 + 4
  );

  // Legend box
  const legendY = pageH / 2 + 20;
  doc.setFontSize(9);
  setText({ r: 203, g: 213, b: 225 });
  const legend = [
    "MLTSSL — Medium & Long-term Strategic Skills List (189 / 190 / 491)",
    "STSOL — Short-term Skilled Occupation List (190 / 491)",
    "CSOL — Core Skills Occupation List (482 / 186 employer-sponsored)",
    "ROL — Regional Occupation List (491 / 494)",
  ];
  legend.forEach((line, i) => doc.text(line, margin, legendY + i * 6));

  doc.setFontSize(8);
  setText({ r: 100, g: 116, b: 139 });
  doc.text(
    "General information only, compiled from the official Skilled Occupation List. Not migration advice — verify current status with the Department of Home Affairs or a registered migration agent (MARA).",
    margin,
    pageH - 16,
    { maxWidth: contentW }
  );
  doc.setFont(FONT, "bold");
  setText({ r: 6, g: 182, b: 212 });
  doc.setFontSize(9);
  doc.text("logivisa.com", pageW - margin, pageH - 10, { align: "right" });
}

let y = 0;

function drawTableHeader() {
  setFill(NAVY);
  doc.rect(margin, y, contentW, 8, "F");
  doc.setFont(FONT, "bold");
  doc.setFontSize(8);
  setText({ r: 255, g: 255, b: 255 });
  let x = margin;
  for (const col of COLS) {
    doc.text(col.label, x + 2, y + 5.4);
    x += col.w;
  }
  y += 8;
}

function newContentPage(first = false) {
  doc.addPage();
  y = margin;
  if (!first) {
    // continuation label
  }
  drawTitleStrip();
  drawTableHeader();
}

function drawTitleStrip() {
  doc.setFont(FONT, "bold");
  doc.setFontSize(11);
  setText(INK);
  doc.text("Australia Skilled Occupation List 2026", margin, y + 4);
  doc.setFont(FONT, "normal");
  doc.setFontSize(8);
  setText(MUTED);
  doc.text("ANZSCO · Occupation Lists · Visa Pathways · Assessing Authority", pageW - margin, y + 4, {
    align: "right",
  });
  y += 9;
}

function footer(pageNum: number, totalPages: number) {
  doc.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
  doc.setLineWidth(0.2);
  doc.line(margin, pageH - 9, pageW - margin, pageH - 9);
  doc.setFont(FONT, "normal");
  doc.setFontSize(7);
  setText(MUTED);
  doc.text("Generated by LogiVisa AI · logivisa.com · General information, not migration advice.", margin, pageH - 5);
  doc.text(`${pageNum} / ${totalPages}`, pageW - margin, pageH - 5, { align: "right" });
}

function rowHeight(occ: Occ): number {
  const nameLines = doc.splitTextToSize(occ.occupation_name, COLS[0].w - 4).length;
  const authLines = doc.splitTextToSize(occ.authority || "—", COLS[4].w - 4).length;
  const visaText = occ.visa_subclasses.join(", ") || "—";
  const visaLines = doc.splitTextToSize(visaText, COLS[3].w - 4).length;
  const lines = Math.max(nameLines, authLines, visaLines, 1);
  return lines * 3.6 + 2.4;
}

function drawRow(occ: Occ, zebra: boolean) {
  doc.setFont(FONT, "normal");
  doc.setFontSize(7.4);
  const h = rowHeight(occ);
  if (zebra) {
    setFill(ZEBRA);
    doc.rect(margin, y, contentW, h, "F");
  }
  let x = margin;
  const cellY = y + 3.6;
  const cells = [
    { text: occ.occupation_name, w: COLS[0].w, bold: true, color: INK },
    { text: occ.anzsco_code, w: COLS[1].w, bold: false, color: INK },
    { text: occ.lists.join(" · ") || "—", w: COLS[2].w, bold: false, color: ACCENT },
    { text: occ.visa_subclasses.join(", ") || "—", w: COLS[3].w, bold: false, color: INK },
    { text: occ.authority || "—", w: COLS[4].w, bold: false, color: MUTED },
  ];
  for (const cell of cells) {
    doc.setFont(FONT, cell.bold ? "bold" : "normal");
    setText(cell.color);
    const lines = doc.splitTextToSize(cell.text, cell.w - 4);
    doc.text(lines, x + 2, cellY);
    x += cell.w;
  }
  y += h;
  doc.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
  doc.setLineWidth(0.1);
  doc.line(margin, y, pageW - margin, y);
}

// ── Build ────────────────────────────────────────────────────────────────────
drawCover();
newContentPage(true);

let zebra = false;
for (const occ of occupations) {
  const h = rowHeight(occ);
  if (y + h > pageH - 12) {
    newContentPage();
    zebra = false;
  }
  drawRow(occ, zebra);
  zebra = !zebra;
}

// Footers (skip cover = page 1)
const total = doc.getNumberOfPages();
for (let p = 2; p <= total; p += 1) {
  doc.setPage(p);
  footer(p - 1, total - 1);
}

const bytes = doc.output("arraybuffer");
writeFileSync(OUT, Buffer.from(bytes));
console.log(`Wrote ${path.relative(process.cwd(), OUT)} — ${(bytes.byteLength / 1024).toFixed(0)} KB, ${total} pages, ${occupations.length} occupations.`);
