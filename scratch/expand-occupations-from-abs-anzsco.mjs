import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

const ABS_STRUCTURE_URL =
  "https://www.abs.gov.au/statistics/classifications/anzsco-australian-and-new-zealand-standard-classification-occupations/2022/anzsco%202022%20structure%20062023.xlsx";

const OCCUPATIONS_PATH = path.join(process.cwd(), "src/data/occupations.json");

const DEFAULTS = {
  authority: "Unknown",
  min_qualification: "Not specified in ANZSCO source",
  post_qual_experience_years: 0,
  english_requirement: "Refer to Department of Home Affairs for specific subclass requirements",
  critical_warning:
    "This occupation is present in the ANZSCO classification but is not currently mapped to skilled visa lists in this dataset.",
  visa_lists: [],
};

function normalizeCode(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length === 6 ? digits : null;
}

function normalizeTitle(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function isLikelyOccupationRow(codeValue, titleValue) {
  const code = normalizeCode(codeValue);
  const title = normalizeTitle(titleValue);
  if (!code || !title) return false;

  // In ANZSCO structure, occupation rows are 6-digit and have major/sub-major
  // group columns; we just need a clean 6-digit occupation title row.
  // Exclude clearly non-occupation summary rows.
  if (/^total\b/i.test(title)) return false;
  return true;
}

async function fetchWorkbook() {
  const response = await fetch(ABS_STRUCTURE_URL);
  if (!response.ok) {
    throw new Error(`Failed to download ANZSCO workbook: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return XLSX.read(Buffer.from(arrayBuffer), { type: "buffer" });
}

function extractOccupations(workbook) {
  const all = [];

  const sheet = workbook.Sheets["Table 5"];
  if (!sheet) {
    throw new Error("ABS workbook does not contain expected sheet: Table 5");
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });

  // In ABS Table 5, occupation rows are in columns E (code) and F (title).
  for (const row of rows) {
    const codeValue = row[4];
    const titleValue = row[5];

    if (!isLikelyOccupationRow(codeValue, titleValue)) continue;

    all.push({
      anzsco_code: normalizeCode(codeValue),
      occupation_name: normalizeTitle(titleValue),
    });
  }

  // Deduplicate by code, preferring longest/non-empty title.
  const dedup = new Map();
  for (const row of all) {
    if (!row.anzsco_code) continue;
    const prev = dedup.get(row.anzsco_code);
    if (!prev || row.occupation_name.length > prev.occupation_name.length) {
      dedup.set(row.anzsco_code, row);
    }
  }

  const list = [...dedup.values()].sort((a, b) => a.anzsco_code.localeCompare(b.anzsco_code));
  if (!list.length) {
    throw new Error("No occupations extracted from ABS workbook.");
  }
  return list;
}

function mergeOccupations(existing, fullList) {
  const merged = [...existing];
  const existingByCode = new Map(existing.map((item) => [String(item.anzsco_code), item]));

  let preserved = existing.length;
  let appended = 0;

  for (const row of fullList) {
    if (existingByCode.has(row.anzsco_code)) {
      continue;
    }

    merged.push({
      anzsco_code: row.anzsco_code,
      occupation_name: row.occupation_name,
      ...DEFAULTS,
    });
    appended += 1;
  }

  return { merged, preserved, appended };
}

async function main() {
  if (!fs.existsSync(OCCUPATIONS_PATH)) {
    throw new Error(`Occupations file not found: ${OCCUPATIONS_PATH}`);
  }

  const currentRaw = fs.readFileSync(OCCUPATIONS_PATH, "utf8").replace(/^\uFEFF/, "");
  const currentJson = JSON.parse(currentRaw);
  const existing = Array.isArray(currentJson.occupations) ? currentJson.occupations : [];

  const workbook = await fetchWorkbook();
  const fullList = extractOccupations(workbook);

  const { merged, preserved, appended } = mergeOccupations(existing, fullList);

  const output = {
    ...currentJson,
    generated_on: new Date().toISOString().slice(0, 10),
    occupations: merged,
  };

  fs.writeFileSync(OCCUPATIONS_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(`existing_count ${existing.length}`);
  console.log(`full_anzsco_count ${fullList.length}`);
  console.log(`preserved_count ${preserved}`);
  console.log(`appended_count ${appended}`);
  console.log(`new_total_count ${merged.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
