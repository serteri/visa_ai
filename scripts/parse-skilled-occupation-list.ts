/**
 * Parses src/data/sources/skilled-occupation-list.md (the official Skilled
 * Occupation List, a markdown table) into a focused, clean JSON dataset:
 *
 *   { anzsco_code, occupation_name, lists[], visa_subclasses[], visa_pathways[], authority }
 *
 * Deliberately NOT comprehensive — just the fields the app + the lead-magnet
 * PDF need. Run: npx tsx scripts/parse-skilled-occupation-list.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const SRC = path.join(process.cwd(), "src/data/sources/skilled-occupation-list.md");
const OUT = path.join(process.cwd(), "src/data/skilled-occupation-list.OLD.json");

const VALID_LISTS = new Set(["MLTSSL", "STSOL", "CSOL", "ROL"]);
// Truncated/typo list tokens seen in the source → canonical form.
const LIST_FIXUPS: Record<string, string> = { MLT: "MLTSSL", ML: "MLTSSL" };

type VisaPathway = { subclass: string; name: string; stream: string };

type OccupationEntry = {
  anzsco_code: string;
  occupation_name: string;
  lists: string[];
  visa_subclasses: string[];
  visa_pathways: VisaPathway[];
  authority: string;
};

/** Strips markdown escaping, links, and zero-width chars from a cell. */
function cleanCell(cell: string): string {
  return cell
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // [text](url) → text
    .replace(/\\([-()|])/g, "$1") // \- \( \) \| → - ( ) |
    .replace(/[​‌‍﻿ ]/g, " ") // zero-width / nbsp
    .replace(/\s+/g, " ")
    .trim();
}

function parseAnzscoCode(codeCell: string): string | undefined {
  return cleanCell(codeCell).match(/\b(\d{6})\b/)?.[1];
}

function parseLists(listCell: string): string[] {
  const raw = cleanCell(listCell);
  const out = new Set<string>();
  for (let token of raw.split(/[;,/]/)) {
    token = token.trim().toUpperCase();
    if (!token) continue;
    if (LIST_FIXUPS[token]) token = LIST_FIXUPS[token];
    if (VALID_LISTS.has(token)) out.add(token);
  }
  return [...out];
}

/** Splits the visa cell into per-subclass pathway entries with stream labels. */
function parseVisas(visaCell: string): { subclasses: string[]; pathways: VisaPathway[] } {
  const text = cleanCell(visaCell);
  const pathways: VisaPathway[] = [];
  const subclasses = new Set<string>();

  // Each entry begins with "<NNN> - <name> (subclass NNN) [- <stream>]" and runs
  // until the next "<NNN> -" or end of string.
  const entryRe = /(\d{3})\s*-\s*(.+?)(?=\s+\d{3}\s*-\s|$)/g;
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(text)) !== null) {
    const leadCode = m[1];
    const body = m[2].trim();
    const subclassMatch = body.match(/\(subclass\s*(\d{3})\)/i);
    const subclass = subclassMatch?.[1] ?? leadCode;
    const name = body.split(/\(subclass/i)[0].replace(/\s*-\s*$/, "").trim();
    let stream = "";
    if (subclassMatch) {
      stream = body.slice(body.indexOf(subclassMatch[0]) + subclassMatch[0].length);
      stream = stream.replace(/^[\s-]+/, "").trim();
    }
    subclasses.add(subclass);
    pathways.push({ subclass, name, stream });
  }

  return { subclasses: [...subclasses].sort(), pathways };
}

function main() {
  const md = readFileSync(SRC, "utf8");
  const lines = md.split(/\r?\n/);

  const entries: OccupationEntry[] = [];
  const anomalies: string[] = [];
  const byCode = new Map<string, OccupationEntry>();

  for (const line of lines) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c);
    if (cells.length < 5) continue;
    const [occCell, codeCell, visaCell, listCell, authCell] = cells;
    const header = cleanCell(occCell).toLowerCase();
    if (header === "occupation" || /^:?-+:?$/.test(cleanCell(occCell))) continue; // header / separator

    const occupation_name = cleanCell(occCell);
    const anzsco_code = parseAnzscoCode(codeCell);
    if (!occupation_name || !anzsco_code) {
      anomalies.push(`skipped (no name/code): ${cleanCell(occCell)} | ${cleanCell(codeCell)}`);
      continue;
    }

    const lists = parseLists(listCell);
    const { subclasses, pathways } = parseVisas(visaCell);
    const authority = cleanCell(authCell);

    const entry: OccupationEntry = {
      anzsco_code,
      occupation_name,
      lists,
      visa_subclasses: subclasses,
      visa_pathways: pathways,
      authority,
    };

    // De-dupe by code (some occupations appear twice); merge lists/visas.
    const existing = byCode.get(anzsco_code);
    if (existing) {
      existing.lists = [...new Set([...existing.lists, ...lists])];
      existing.visa_subclasses = [...new Set([...existing.visa_subclasses, ...subclasses])].sort();
      const seen = new Set(existing.visa_pathways.map((p) => `${p.subclass}|${p.stream}`));
      for (const p of pathways) {
        const key = `${p.subclass}|${p.stream}`;
        if (!seen.has(key)) {
          existing.visa_pathways.push(p);
          seen.add(key);
        }
      }
    } else {
      byCode.set(anzsco_code, entry);
      entries.push(entry);
    }
  }

  entries.sort((a, b) => a.occupation_name.localeCompare(b.occupation_name));

  const listCounts: Record<string, number> = {};
  const authCounts: Record<string, number> = {};
  for (const e of entries) {
    for (const l of e.lists) listCounts[l] = (listCounts[l] ?? 0) + 1;
    authCounts[e.authority] = (authCounts[e.authority] ?? 0) + 1;
  }

  writeFileSync(
    OUT,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        source: "src/data/sources/skilled-occupation-list.md",
        count: entries.length,
        occupations: entries,
      },
      null,
      2
    )
  );

  console.log(`Parsed ${entries.length} occupations → ${path.relative(process.cwd(), OUT)}`);
  console.log("List distribution:", JSON.stringify(listCounts));
  console.log("Top authorities:", JSON.stringify(Object.entries(authCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)));
  const em = entries.find((e) => e.anzsco_code === "133211");
  console.log("133211 check:", JSON.stringify(em, null, 1));
  if (anomalies.length) console.log(`Anomalies (${anomalies.length}):`, anomalies.slice(0, 5));
}

main();
