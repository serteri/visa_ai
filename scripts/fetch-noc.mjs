/**
 * Fetches the complete Canadian NOC 2021 V1.0 dataset and writes
 * src/data/countries/ca/noc-list.json in the format the app expects.
 *
 * Sources tried in order:
 *  1. Statistics Canada open-data API (IMDB NOC 2021 unit group table)
 *  2. ESDC NOC search API (undocumented but public-facing)
 *  3. A curated GitHub Gist with the full unit-group list
 *
 * Run with:  node scripts/fetch-noc.mjs
 */

import { writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../src/data/countries/ca/noc-list.json");

// ── helper ────────────────────────────────────────────────────────────────────

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, {
    headers: { "User-Agent": "LogiVisa NOC fetcher (open-data research)" },
    ...opts,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

// ── Source 1: Statistics Canada IMDB API ──────────────────────────────────────
// The IMDB REST API exposes classification variables including NOC 2021 (TVQ=1346).
// Unit groups have "memberType=D" (directly observable / unit group level).

async function tryStatsCanApi() {
  console.log("Trying Statistics Canada IMDB API …");
  const base =
    "https://www23.statcan.gc.ca/imdb/rest.action?Function=getVDMembers&TVQ=1346&D=1&A=&SQ=1&SHA=1&MLR=1&OFT=JSON&ID=";

  // Fetch member list page by page (API returns 200 rows at a time)
  const firstPage = await fetchJson(`${base}1`);
  const total = firstPage.totalCount ?? 0;
  console.log(`  total members: ${total}`);
  if (total === 0) throw new Error("No members returned");

  const pages = [];
  for (let id = 1; id <= total; id += 200) {
    const page = await fetchJson(`${base}${id}`);
    pages.push(...(page.members ?? []));
    process.stdout.write(`  fetched ${pages.length}/${total}\r`);
  }
  console.log("");

  // Unit groups only (4-level depth in NOC 2021 = unit group)
  const unitGroups = pages.filter(
    (m) =>
      m.memberType === "D" &&
      m.code &&
      String(m.code).replace(/\D/g, "").length === 5
  );
  console.log(`  unit groups found: ${unitGroups.length}`);
  if (unitGroups.length < 400) throw new Error("Too few unit groups, source incomplete");

  return unitGroups.map((m) => {
    const code = String(m.code).replace(/\D/g, "").padStart(5, "0");
    const teer = parseInt(code[0], 10);
    const majorGroup = code.slice(0, 2);
    const minorGroup = code.slice(0, 3);
    return {
      code,
      title: m.name ?? m.memberName ?? m.label ?? "",
      teer,
      majorGroup,
      minorGroup,
      duties: [],
    };
  });
}

// ── Source 2: ESDC NOC search API (public-facing / undocumented) ──────────────

async function tryEsdcApi() {
  console.log("Trying ESDC NOC search API …");
  // The NOC 2021 search tool at noc.esdc.gc.ca uses a REST endpoint
  const url =
    "https://noc.esdc.gc.ca/api/structures?language=en&version=2021&type=unit-group&fields=code,title,teer,broadCategory,majorGroup,minorGroup,subMajorGroup&limit=600&offset=0";
  const data = await fetchJson(url);
  const items = data.items ?? data.results ?? data ?? [];
  if (!Array.isArray(items) || items.length < 400) {
    throw new Error(`Too few items (${items.length}) from ESDC API`);
  }
  console.log(`  unit groups found: ${items.length}`);
  return items.map((item) => {
    const code = String(item.code ?? "").replace(/\D/g, "").padStart(5, "0");
    const teer = typeof item.teer === "number" ? item.teer : parseInt(code[0], 10);
    return {
      code,
      title: item.title ?? item.name ?? "",
      teer,
      majorGroup: code.slice(0, 2),
      minorGroup: code.slice(0, 3),
      duties: [],
    };
  });
}

// ── Source 3: Open Government Canada / LMIC data portal ───────────────────────

async function tryOpenGovCsv() {
  console.log("Trying Open Government Canada data portal CSV …");
  // The official NOC 2021 data package on open.canada.ca has a stable CSV
  // resource ID: 6bd96b91-a082-4a72-a3e8-7c5a6ac6a3f5
  const packageUrl =
    "https://open.canada.ca/data/en/datastore/dump/6bd96b91-a082-4a72-a3e8-7c5a6ac6a3f5?format=csv";

  const res = await fetch(packageUrl, {
    headers: { "User-Agent": "LogiVisa NOC fetcher (open-data research)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const csv = await res.text();
  const lines = csv.split("\n").filter((l) => l.trim());
  if (lines.length < 400) throw new Error("Too few CSV rows");

  const header = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const codeIdx = header.findIndex((h) => /^code$/i.test(h) || /noc.*code/i.test(h));
  const titleIdx = header.findIndex((h) => /title/i.test(h));
  const teerIdx = header.findIndex((h) => /teer/i.test(h));

  if (codeIdx < 0 || titleIdx < 0) throw new Error("CSV header not recognised");

  const entries = lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const code = (cols[codeIdx] ?? "").replace(/\D/g, "").padStart(5, "0");
    const teer = teerIdx >= 0 ? parseInt(cols[teerIdx], 10) : parseInt(code[0], 10);
    return {
      code,
      title: cols[titleIdx] ?? "",
      teer: isNaN(teer) ? parseInt(code[0], 10) : teer,
      majorGroup: code.slice(0, 2),
      minorGroup: code.slice(0, 3),
      duties: [],
    };
  }).filter((e) => e.code.length === 5 && e.title);

  console.log(`  unit groups found: ${entries.length}`);
  if (entries.length < 400) throw new Error("Too few parsed rows");
  return entries;
}

// ── Source 4: Known public GitHub repo with compiled NOC 2021 JSON ────────────

async function tryGithubRepo() {
  console.log("Trying public GitHub NOC 2021 JSON …");
  // Several researchers have compiled the official NOC 2021 unit groups to JSON.
  // Try the most commonly referenced ones:
  const candidates = [
    "https://raw.githubusercontent.com/nicholasess/noc-2021/main/data/noc-2021.json",
    "https://raw.githubusercontent.com/jigsaw-code/noc-2021/main/noc.json",
    "https://raw.githubusercontent.com/canada-noc/noc2021/main/unit-groups.json",
    "https://raw.githubusercontent.com/thientu/noc-2021/main/noc_unit_groups.json",
  ];

  for (const url of candidates) {
    try {
      const data = await fetchJson(url);
      const arr = Array.isArray(data) ? data : Object.values(data);
      if (arr.length >= 400) {
        console.log(`  ✓ found ${arr.length} entries at ${url}`);
        return arr.map((item) => {
          const code = String(item.code ?? item.nocCode ?? item.noc_code ?? "")
            .replace(/\D/g, "").padStart(5, "0");
          const teer = typeof item.teer === "number"
            ? item.teer
            : typeof item.teer === "string"
              ? parseInt(item.teer, 10)
              : parseInt(code[0], 10);
          return {
            code,
            title: item.title ?? item.name ?? item.label ?? "",
            teer: isNaN(teer) ? parseInt(code[0], 10) : teer,
            majorGroup: item.majorGroup ?? item.major_group ?? code.slice(0, 2),
            minorGroup: item.minorGroup ?? item.minor_group ?? code.slice(0, 3),
            duties: Array.isArray(item.duties) ? item.duties : [],
          };
        }).filter((e) => e.code.length === 5 && e.title);
      }
      console.log(`  skipped (only ${arr.length} entries): ${url}`);
    } catch (e) {
      console.log(`  skipped (${e.message}): ${url}`);
    }
  }
  throw new Error("No suitable GitHub repo found");
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const sources = [tryStatsCanApi, tryEsdcApi, tryOpenGovCsv, tryGithubRepo];
  let entries = null;

  for (const fn of sources) {
    try {
      entries = await fn();
      if (entries && entries.length >= 400) break;
    } catch (e) {
      console.warn(`  ✗ ${fn.name}: ${e.message}`);
    }
  }

  if (!entries || entries.length < 400) {
    console.error("\n❌ All automated sources failed or returned incomplete data.");
    console.error("\nMANUAL FALLBACK — please download the official NOC 2021 CSV:");
    console.error("  1. Go to https://open.canada.ca/data/en/dataset/fce04c41-5db3-4a9f-af1c-04a27cd7e43e");
    console.error("  2. Download the CSV resource named 'NOC 2021 V1.0 Unit Groups'");
    console.error("  3. Place it at  scripts/noc-2021-unit-groups.csv");
    console.error("  4. Re-run this script with:  node scripts/fetch-noc.mjs --csv");
    process.exit(1);
  }

  // Deduplicate by code, keep the one with the longest title
  const byCode = new Map();
  for (const e of entries) {
    const existing = byCode.get(e.code);
    if (!existing || e.title.length > existing.title.length) {
      byCode.set(e.code, e);
    }
  }

  const sorted = [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));

  console.log(`\n✅ Writing ${sorted.length} unit groups to ${OUT}`);
  writeFileSync(OUT, JSON.stringify(sorted, null, 2));
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
