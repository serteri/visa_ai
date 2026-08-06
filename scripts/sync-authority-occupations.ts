/**
 * sync-authority-occupations.ts
 *
 * Syncs the occupation registry (src/data/occupations.json) into the
 * `occupations[]` arrays of the 12 skills-assessment authority modules under
 * lib/skills-assessment/authorities/.
 *
 * For each authority module it:
 *   1. reads the module's current occupations[] array and keeps it verbatim,
 *   2. adds the registry occupations that resolve to that authority
 *      (via authorityAliasMap, exact short-ID matches, or compound-name
 *      fallback like "VETASSESS Council of Ambulance Authorities"),
 *   3. de-duplicates by ANZSCO code,
 *   4. rewrites only the occupations[] block (2-space indentation, matching
 *      the existing file style) — the rest of the file is left untouched.
 *
 * Special rule:
 *   - The six accounting occupations (221111, 221112, 221113, 221212,
 *     221213, 132211) are always assigned to CPA Australia, regardless of
 *     the authority string in the registry.
 *
 * Usage:
 *   npx tsx scripts/sync-authority-occupations.ts
 *   DRY_RUN=1 npx tsx scripts/sync-authority-occupations.ts   # preview only
 */

import * as fs from "node:fs";
import * as path from "node:path";

const DRY_RUN = process.env.DRY_RUN === "1";

const AUTHORITIES_DIR = path.join(
  process.cwd(),
  "lib",
  "skills-assessment",
  "authorities"
);
const REGISTRY_PATH = path.join(process.cwd(), "src", "data", "occupations.json");

const authorityAliasMap: Record<string, string> = {
  "Engineers Australia": "EA",
  "Trades Recognition Australia": "TRA",
  VETASSESS: "VETASSESS",
  "Australian Computer Society": "ACS",
  "CPA Australia": "CPA",
  "Institute of Public Accountants": "IPA",
  "Chartered Accountants Australia and New Zealand": "CA-ANZ",
  "Australian Dental Council": "ADC",
  "Occupational Therapy Council": "OTC",
  "Civil Aviation Safety Authority": "CASA",
  "Architects Accreditation Council of Australia": "AACA",
  "Australian Institute of Medical Scientists": "AIMS",
};

/** Accounting occupations that are always assessed by CPA Australia. */
const ACCOUNTING_ANZSCO = new Set([
  "221111",
  "221112",
  "221113",
  "221212",
  "221213",
  "132211",
]);

/** Compound-name fallback (e.g. "VETASSESS Council of Ambulance Authorities"). */
const COMPOUND_TOKENS: Array<[token: string, id: string]> = [
  ["vetassess", "VETASSESS"],
  ["trades recognition", "TRA"],
  ["australian computer society", "ACS"],
  ["engineers australia", "EA"],
  ["cpa australia", "CPA"],
  ["institute of public accountants", "IPA"],
  ["chartered accountants", "CA-ANZ"],
  ["australian dental council", "ADC"],
  ["occupational therapy council", "OTC"],
  ["civil aviation", "CASA"],
  ["architects accreditation", "AACA"],
  ["australian institute of medical scientists", "AIMS"],
];

function normalizeCode(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length < 4 ? "" : digits.slice(-6).padStart(6, "0");
}

function resolveAuthorityId(anzscoCode: string, authority: string): string | null {
  const code = normalizeCode(anzscoCode);

  // Accounting occupations always belong to CPA Australia.
  if (code && ACCOUNTING_ANZSCO.has(code)) return "CPA";

  const a = (authority ?? "").trim();
  if (!a) return null;

  // Exact full-name match (authorityAliasMap).
  if (authorityAliasMap[a]) return authorityAliasMap[a];

  // Exact short-ID match (e.g. the registry already stores "TRA", "ACS").
  const knownIds = new Set(Object.values(authorityAliasMap));
  if (knownIds.has(a)) return a;

  // Compound-name fallback: "VETASSESS Council of Ambulance Authorities", ...
  const lower = a.toLowerCase();
  for (const [token, id] of COMPOUND_TOKENS) {
    if (lower.includes(token)) return id;
  }

  return null;
}

interface OccupationsBlock {
  /** Index of the `occupations: [` token in the file text. */
  start: number;
  /** Index just past the closing `],` (the trailing newline is kept). */
  end: number;
  /** Text between `[` and `]` (empty for a single-line `[]`). */
  inner: string;
  /** True when the array is written inline as `occupations: [],`. */
  empty: boolean;
}

function extractOccupationsBlock(text: string): OccupationsBlock | null {
  const key = "occupations: [";
  const keyIdx = text.indexOf(key);
  if (keyIdx === -1) return null;

  // Single-line empty array: `  occupations: [],`
  if (text.slice(keyIdx + key.length).startsWith("]")) {
    const lineEnd = text.indexOf("\n", keyIdx);
    const end = lineEnd === -1 ? text.length : lineEnd;
    return { start: keyIdx, end, inner: "", empty: true };
  }

  // Multi-line array: entries are single-line objects, so the closing
  // `  ],` (exactly 2-space indent) is unambiguous.
  const lines = text.slice(keyIdx).split("\n");
  let closeIdx = -1;
  for (let li = 1; li < lines.length; li++) {
    if (/^  \],\r?$/.test(lines[li])) {
      closeIdx = li;
      break;
    }
  }
  if (closeIdx === -1) return null;

  const inner = lines.slice(1, closeIdx).join("\n");
  const block = lines.slice(0, closeIdx + 1).join("\n");
  return { start: keyIdx, end: keyIdx + block.length, inner, empty: false };
}

/**
 * Extract all 6-digit ANZSCO codes from the occupations inner block.
 * Uses a simple string-split approach instead of a regex loop to avoid
 * edge-case statefulness issues with the `g` flag.
 */
function extractExistingCodes(inner: string): Set<string> {
  const codes = new Set<string>();
  for (const line of inner.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;
    // Find `anzscoCode: "XXXXXX"` in the line.
    const key = 'anzscoCode: "';
    const idx = trimmed.indexOf(key);
    if (idx === -1) continue;
    const start = idx + key.length;
    const end = trimmed.indexOf('"', start);
    if (end > start) {
      const code = trimmed.slice(start, end);
      if (/^\d{6}$/.test(code)) codes.add(code);
    }
  }
  return codes;
}

function formatEntry(anzscoCode: string, title: string): string {
  return `    { anzscoCode: ${JSON.stringify(anzscoCode)}, title: ${JSON.stringify(title)} },`;
}

function buildOccupationsBlock(
  block: OccupationsBlock,
  additions: string[]
): string {
  let inner = "";
  if (!block.empty && block.inner.trim().length > 0) {
    inner = block.inner + "\n";
  }
  const entries = additions.length > 0 ? additions.join("\n") + "\n" : "";
  return `  occupations: [\n${inner}${entries}  ],`;
}

function readAuthorityFiles(): Array<{ file: string; id: string }> {
  const files = fs
    .readdirSync(AUTHORITIES_DIR)
    .filter((f) => f.endsWith(".ts"))
    .sort();
  const result: Array<{ file: string; id: string }> = [];
  for (const f of files) {
    const text = fs.readFileSync(path.join(AUTHORITIES_DIR, f), "utf8");
    const m = text.match(/authorityId:\s*"([^"]+)"/);
    if (m) result.push({ file: f, id: m[1] });
  }
  return result;
}

function main(): void {
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
  const rows = registry.occupations as Array<{
    anzsco_code: string;
    occupation_name: string;
    authority?: string;
  }>;

  // Group registry rows by resolved authority ID.
  const byAuthority = new Map<string, Array<{ code: string; title: string }>>();
  let unmatched = 0;
  for (const row of rows) {
    const id = resolveAuthorityId(row.anzsco_code, row.authority ?? "");
    if (!id) {
      unmatched++;
      continue;
    }
    const code = normalizeCode(row.anzsco_code);
    if (!code) continue;
    if (!byAuthority.has(id)) byAuthority.set(id, []);
    byAuthority.get(id)!.push({ code, title: row.occupation_name });
  }

  const authorities = readAuthorityFiles();
  const report: string[] = [];
  const summary: Array<{ id: string; declared: number; added: number }> = [];
  let totalAdded = 0;

  for (const { file, id } of authorities) {
    const filePath = path.join(AUTHORITIES_DIR, file);
    const text = fs.readFileSync(filePath, "utf8");
    const block = extractOccupationsBlock(text);
    if (!block) {
      report.push(
        `${id.padEnd(9)} ${file.padEnd(24)} occupations[] block NOT FOUND — skipped`
      );
      continue;
    }

    // Existing codes (kept verbatim; new entries dedupe against them).
    const existingCodes = extractExistingCodes(block.inner);

    // New entries from the registry for this authority.
    const seen = new Set<string>();
    const additions: string[] = [];
    for (const row of byAuthority.get(id) ?? []) {
      if (existingCodes.has(row.code) || seen.has(row.code)) continue;
      seen.add(row.code);
      additions.push(formatEntry(row.code, row.title));
    }

    const newBlock = buildOccupationsBlock(block, additions);
    const updated =
      text.slice(0, block.start) + newBlock + text.slice(block.end);

    const declared = existingCodes.size;
    const added = additions.length;
    report.push(
      `${id.padEnd(9)} ${file.padEnd(24)} declared=${String(declared).padStart(3)}  new=${String(added).padStart(3)}  total=${String(declared + added).padStart(4)}`
    );
    summary.push({ id, declared, added });
    totalAdded += added;

    if (!DRY_RUN) {
      fs.writeFileSync(filePath, updated, "utf8");
    }
  }

  console.log(report.join("\n"));
  console.log(
    `\nRegistry rows: ${rows.length} | unmatched (no modeled authority): ${unmatched}`
  );

  const vet = summary.find((s) => s.id === "VETASSESS");
  const tra = summary.find((s) => s.id === "TRA");
  if (DRY_RUN) {
    console.log("DRY RUN — no files were written.");
  } else {
    console.log(`Total occupations added across all modules: ${totalAdded}`);
    if (vet)
      console.log(
        `VETASSESS: +${vet.added} new (total ${vet.declared + vet.added})`
      );
    if (tra)
      console.log(`TRA: +${tra.added} new (total ${tra.declared + tra.added})`);
  }
}

main();
