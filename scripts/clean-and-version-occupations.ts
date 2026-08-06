/**
 * cleans occupations.json:
 *   GÖREV 1 – Isim düzeltmeleri + yeni meslek ekleme
 *   GÖREV 2 – isEligibleForMigration flag (resmi listedeki 693 meslek)
 *   GÖREV 3 – anzscoVersion ("2013" veya "2022") versiyonlama
 *
 * Run: npx tsx scripts/clean-and-version-occupations.ts
 */
import * as XLSX from "xlsx";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

// ── Paths ──────────────────────────────────────────────────────────────────
const OCC_PATH = path.join(process.cwd(), "src/data/occupations.json");
const OFFICIAL_PATH = path.join(
  process.cwd(),
  "public/Skilled occupation list.xlsx"
);
const ANZSCO_2022_PATH = path.join(
  process.cwd(),
  "public/ANZSCO - Australian and New Zealand Standard Classification of Occupations, 2022 Australian Update.xlsx"
);
const ANZSCO_2013_PATH = path.join(
  process.cwd(),
  "public/ANZSCO -Australian and New Zealand Standard Classification of Occupations, 2013, Version 1.3.xlsx"
);

// ── Load source data ───────────────────────────────────────────────────────
const occFile = JSON.parse(readFileSync(OCC_PATH, "utf8")) as {
  generated_on: string;
  jurisdiction: string;
  currency_note: string;
  occupations: Record<string, unknown>[];
};

// ── 1. Official list codes (Skilled occupation list.xlsx) ──────────────────
const wbOfficial = XLSX.readFile(OFFICIAL_PATH);
const officialRows = XLSX.utils.sheet_to_json(
  wbOfficial.Sheets["Sheet1"],
  { header: 1 }
) as unknown[][];

const officialCodes = new Set<string>();
// For each row: extract all 6-digit codes from the "ANZSCO code" column (col B)
for (let i = 1; i < officialRows.length; i++) {
  const codeField = String(officialRows[i]?.[1] ?? "");
  for (const m of codeField.match(/\d{6}/g) ?? []) {
    officialCodes.add(m);
  }
}
console.log(`[INFO] Official list unique 6-digit codes: ${officialCodes.size}`);

// ── 2. ANZSCO 2022 codes ──────────────────────────────────────────────────
const wb22 = XLSX.readFile(ANZSCO_2022_PATH);
const rows22 = XLSX.utils.sheet_to_json(
  wb22.Sheets["Sheet1"],
  { header: 1 }
) as unknown[][];

const codes2022 = new Set<string>();
for (let i = 1; i < rows22.length; i++) {
  const raw = rows22[i]?.[0];
  if (raw == null) continue;
  const s = String(raw).trim();
  if (/^\d{6}$/.test(s)) codes2022.add(s);
}
console.log(`[INFO] ANZSCO 2022 unique 6-digit codes: ${codes2022.size}`);

// ── 3. ANZSCO 2013 codes ──────────────────────────────────────────────────
const wb13 = XLSX.readFile(ANZSCO_2013_PATH);
const rows13 = XLSX.utils.sheet_to_json(
  wb13.Sheets["Sheet1"],
  { header: 1 }
) as unknown[][];

const codes2013 = new Set<string>();
// Data starts at row 3 (after "Code","Title" header, key note, "ANZSCO CODE")
for (let i = 3; i < rows13.length; i++) {
  const raw = rows13[i]?.[0];
  if (raw == null) continue;
  const s = String(raw).trim();
  if (/^\d{6}$/.test(s)) codes2013.add(s);
}
console.log(`[INFO] ANZSCO 2013 unique 6-digit codes: ${codes2013.size}`);

// ── Helper: index by code ──────────────────────────────────────────────────
const byCode = new Map<string, Record<string, unknown>>(
  occFile.occupations.map((o) => [String(o.anzsco_code), o])
);

// ── GÖREV 1 – Isim düzeltmeleri ──────────────────────────────────────────
const NAME_FIXES: Record<string, string> = {
  "121212": "Flower Grower",
  "224711": "Management Consultant",
  "362212": "Arborist",
  "139914": "Quality Assurance Manager",
  "321214": "Small Offset Printer",
  "139915": "Sports Administrator",
  "139999": "Specialist Managers nec",
  "392312": "Small Offset Printer",
};

let nameFixCount = 0;
let noOpCount = 0;

for (const [code, newName] of Object.entries(NAME_FIXES)) {
  const rec = byCode.get(code);
  if (!rec) {
    console.log(`[WARN] Code ${code} not found in occupations.json — skipped rename`);
    continue;
  }
  if (rec.occupation_name !== newName) {
    console.log(`[FIX ] ${code}: "${rec.occupation_name}" → "${newName}"`);
    rec.occupation_name = newName;
    nameFixCount++;
  } else {
    console.log(`[NOOP] ${code}: already "${newName}"`);
    noOpCount++;
  }
}

// Yeni meslek ekle: 362213 – Landscape Gardener
const NEW_CODE = "362213";
let newAddCount = 0;

if (!byCode.has(NEW_CODE)) {
  // Pull visa details from official list for 362213
  let officialVisaLists = "";
  let officialVisaField = "";
  let officialAuthField = "";
  for (let i = 1; i < officialRows.length; i++) {
    const codeField = String(officialRows[i]?.[1] ?? "");
    if (codeField.includes(NEW_CODE)) {
      officialVisaField = String(officialRows[i]?.[2] ?? "");
      officialVisaLists = String(officialRows[i]?.[3] ?? "");
      officialAuthField = String(officialRows[i]?.[4] ?? "");
      break;
    }
  }

  // Parse visa lists (STSOL;CSOL → ["STSOL","CSOL"])
  const validLists = new Set(["MLTSSL", "STSOL", "CSOL", "ROL"]);
  const visa_lists = officialVisaLists
    .split(/[;,]/)
    .map((t: string) => t.trim().toUpperCase())
    .filter((t: string) => validLists.has(t));

  // Parse visa subclasses (extract all 3-digit subclass numbers)
  const visa_subclasses = [
    ...new Set(
      (officialVisaField.match(/(\d{3})\s*-\s/gm) ?? [])
        .map((m: string) => m.match(/\d{3}/)?.[0] ?? "")
        .filter(Boolean)
    ),
  ].sort();

  occFile.occupations.push({
    anzsco_code: NEW_CODE,
    occupation_name: "Landscape Gardener",
    authority: officialAuthField || "TRA",
    min_qualification: "Not specified in ANZSCO source",
    post_qual_experience_years: 0,
    english_requirement:
      "Refer to Department of Home Affairs for specific subclass requirements",
    critical_warning: "",
    visa_lists,
    visa_subclasses,
  });
  byCode.set(NEW_CODE, occFile.occupations[occFile.occupations.length - 1]);
  newAddCount++;
  console.log(
    `[ADD ] ${NEW_CODE}: "Landscape Gardener" — lists: [${visa_lists}], subclasses: [${visa_subclasses}]`
  );
} else {
  console.log(`[SKIP] ${NEW_CODE} already exists`);
}

console.log(
  `\n[RESULT] Görev 1: ${nameFixCount} isim düzeltildi, ${noOpCount} no-op, ${newAddCount} yeni meslek eklendi`
);

// ── GÖREV 2 – isEligibleForMigration ──────────────────────────────────────
let eligibleCount = 0;
let nonEligibleCount = 0;

for (const rec of occFile.occupations) {
  const isEligible = officialCodes.has(String(rec.anzsco_code));
  rec.isEligibleForMigration = isEligible;
  if (isEligible) eligibleCount++;
  else nonEligibleCount++;
}

console.log(
  `\n[RESULT] Görev 2: isEligibleForMigration=true: ${eligibleCount}, false: ${nonEligibleCount}`
);

// ── GÖREV 3 – anzscoVersion ──────────────────────────────────────────────
// Rule: if code exists in ANZSCO 2022 → "2022"; else → "2013" (default)
let v2022Count = 0;
let v2013Count = 0;

for (const rec of occFile.occupations) {
  const code = String(rec.anzsco_code);
  rec.anzscoVersion = codes2022.has(code) ? "2022" : "2013";
  if (rec.anzscoVersion === "2022") v2022Count++;
  else v2013Count++;
}

console.log(
  `\n[RESULT] Görev 3: anzscoVersion="2022": ${v2022Count}, anzscoVersion="2013": ${v2013Count}`
);

// ── Save ───────────────────────────────────────────────────────────────────
writeFileSync(OCC_PATH, JSON.stringify(occFile, null, 2) + "\n");
console.log(
  `\n[SAVED] ${OCC_PATH} — ${occFile.occupations.length} records`
);
console.log("══════════════════════════════════════════════════════════════════════");
console.log("ÖZET:");
console.log(`  Toplam kayıt sayısı:      ${occFile.occupations.length}`);
console.log(`  İsim düzeltildi:          ${nameFixCount}`);
console.log(`  Yeni meslek eklendi:      ${newAddCount}`);
console.log(`  isEligible=true:          ${eligibleCount}`);
console.log(`  isEligible=false:         ${nonEligibleCount}`);
console.log(`  anzscoVersion "2022":     ${v2022Count}`);
console.log(`  anzscoVersion "2013":     ${v2013Count}`);
console.log("══════════════════════════════════════════════════════════════════════");
