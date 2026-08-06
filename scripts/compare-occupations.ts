/**
 * compare-occupations.ts
 *
 * Compares the official Skilled Occupation List (Excel) against
 * the system's occupation database (occupations.json).
 *
 * Usage: npx tsx scripts/compare-occupations.ts
 */

import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

// ── 1. Read Excel file ──────────────────────────────────────────────
const excelPath = path.resolve(__dirname, "../public/Skilled occupation list.xlsx");
if (!fs.existsSync(excelPath)) {
  console.error(`Excel file not found: ${excelPath}`);
  process.exit(1);
}

const wb = XLSX.readFile(excelPath);
const sheetName = wb.SheetNames[0];
const ws = wb.Sheets[sheetName];
const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

console.log(`=== Excel: ${rawRows.length - 1} data rows (Sheet: ${sheetName}) ===\n`);

// ── 2. Extract 6-digit ANZSCO codes from every cell ─────────────────
const sixDigitRegex = /\d{6}/g;
// Map: anzsco code → occupation name (first occurrence)
const excelOccupations = new Map<string, string>();

for (let i = 1; i < rawRows.length; i++) {
  const row = rawRows[i];
  if (!row || row.length === 0) continue;

  const occupationName = String(row[0] || "").trim();
  // Collect all 6-digit codes from every column in this row
  const codesInRow = new Set<string>();

  for (const cell of row) {
    if (cell == null) continue;
    const cellStr = String(cell).replace(/[​﻿]/g, ""); // strip zero-width chars
    const matches = cellStr.match(sixDigitRegex);
    if (matches) {
      for (const code of matches) {
        // ANZSCO major groups 1–8; discard codes starting with 0 or 9+ if suspicious
        if (code[0] >= "1" && code[0] <= "8") {
          codesInRow.add(code);
        }
      }
    }
  }

  for (const code of codesInRow) {
    if (!excelOccupations.has(code)) {
      excelOccupations.set(code, occupationName);
    }
  }
}

const excelCodes = new Set(excelOccupations.keys());
console.log(`Resmi Listedeki Toplam Benzersiz ANZSCO Kodu: ${excelCodes.size}\n`);

// ── 3. Load occupations.json ────────────────────────────────────────
const occupationsPath = path.resolve(__dirname, "../src/data/occupations.json");
const data = JSON.parse(fs.readFileSync(occupationsPath, "utf-8"));
const systemOccupations: { anzsco_code: string; occupation_name: string; authority: string; visa_lists: string[] }[] =
  data.occupations;

const systemCodeMap = new Map<string, typeof systemOccupations[0]>();
for (const occ of systemOccupations) {
  systemCodeMap.set(occ.anzsco_code, occ);
}

console.log(`Bizim Sistemdeki Toplam Meslek: ${systemCodeMap.size}\n`);

// ── 4. Compute intersections and differences ────────────────────────
const match: Array<{ code: string; excelName: string; sysName: string }> = [];
const nonEligible: Array<{ code: string; sysName: string; authority: string; visaLists: string[] }> = [];
const missing: Array<{ code: string; excelName: string }> = [];

for (const [code] of systemCodeMap) {
  if (excelCodes.has(code)) {
    const sysOcc = systemCodeMap.get(code)!;
    match.push({ code, excelName: excelOccupations.get(code) || "?", sysName: sysOcc.occupation_name });
  } else {
    const sysOcc = systemCodeMap.get(code)!;
    nonEligible.push({ code, sysName: sysOcc.occupation_name, authority: sysOcc.authority, visaLists: sysOcc.visa_lists });
  }
}

for (const [code, excelName] of excelOccupations) {
  if (!systemCodeMap.has(code)) {
    missing.push({ code, excelName });
  }
}

// Sort for readability
match.sort((a, b) => a.code.localeCompare(b.code));
nonEligible.sort((a, b) => a.code.localeCompare(b.code));
missing.sort((a, b) => a.code.localeCompare(b.code));

// ── 5. Summary ──────────────────────────────────────────────────────
console.log("=".repeat(60));
console.log("            KARŞILAŞTIRMA SONUÇLARI");
console.log("=".repeat(60));
console.log(`Resmi Listedeki Toplam Meslek Sayısı (benzersiz kod):        ${excelCodes.size}`);
console.log(`Bizim Sistemdeki Geçerli (Match) Meslek Sayısı:             ${match.length}`);
console.log(`Sistemden Silinebilecek (Non-eligible) Meslek Sayısı:       ${nonEligible.length}`);
console.log(`Acilen Sistemimize Eklememiz Gereken (Missing) Meslek Sayısı: ${missing.length}`);
console.log("=".repeat(60));

// ── 6. Missing occupations detail ───────────────────────────────────
if (missing.length > 0) {
  console.log(`\n--- Eklenmesi Gereken Meslekler (${missing.length}) ---`);
  for (const m of missing) {
    console.log(`  ${m.code}  ${m.excelName}`);
  }
}

// ── 7. Non-eligible occupations detail (top 50 + count) ─────────────
if (nonEligible.length > 0) {
  console.log(`\n--- Sistemden Silinebilecek Meslekler (ilk 50 / toplam ${nonEligible.length}) ---`);
  for (const n of nonEligible.slice(0, 50)) {
    const visaStr = n.visaLists.length > 0 ? `[${n.visaLists.join(",")}]` : "[no visa list]";
    console.log(`  ${n.code}  ${n.sysName}  ${visaStr}`);
  }
  if (nonEligible.length > 50) {
    console.log(`  ... ve ${nonEligible.length - 50} meslek daha.`);
  }
}

// ── 8. Match detail (brief) ─────────────────────────────────────────
console.log(`\n--- Eşleşen Meslekler (Match): ${match.length} ---`);
for (const m of match.slice(0, 30)) {
  console.log(`  ${m.code}  Excel: ${m.excelName}  |  Sys: ${m.sysName}`);
}
if (match.length > 30) {
  console.log(`  ... ve ${match.length - 30} meslek daha.`);
}
