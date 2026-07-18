/**
 * Safe, idempotent enricher for src/data/anzsco-list.json. Given a batch of
 * translations keyed by ANZSCO code, it ONLY adds/updates the provided fields
 * on the matching entry — it never removes keys, never drops entries, and never
 * touches entries not named in the batch. Preserves the existing schema and
 * only introduces the additive duties_tr / duties_zh keys where translations
 * are supplied.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export type AnzscoEntry = {
  code: string;
  title: string;
  title_tr?: string;
  title_zh?: string;
  skillLevel?: string;
  duties?: string[];
  duties_tr?: string[];
  duties_zh?: string[];
};

export type BatchEntry = {
  code: string;
  title_tr: string;
  title_zh: string;
  skillLevel: string;
  duties: string[];
  duties_tr: string[];
  duties_zh: string[];
};

const LIST_PATH = path.join(process.cwd(), "src/data/anzsco-list.json");

export function applyBatch(batch: BatchEntry[], label: string) {
  const list = JSON.parse(readFileSync(LIST_PATH, "utf8")) as AnzscoEntry[];
  const beforeCount = list.length;
  const byCode = new Map(list.map((e) => [e.code, e]));

  const notFound: string[] = [];
  let enriched = 0;

  for (const b of batch) {
    const entry = byCode.get(b.code);
    if (!entry) {
      notFound.push(b.code);
      continue;
    }
    // Additive only — never delete existing keys.
    if (b.title_tr) entry.title_tr = b.title_tr;
    if (b.title_zh) entry.title_zh = b.title_zh;
    if (b.skillLevel) entry.skillLevel = b.skillLevel;
    if (b.duties?.length) entry.duties = b.duties;
    if (b.duties_tr?.length) entry.duties_tr = b.duties_tr;
    if (b.duties_zh?.length) entry.duties_zh = b.duties_zh;
    enriched += 1;
  }

  if (list.length !== beforeCount) {
    throw new Error(`Entry count changed (${beforeCount} → ${list.length}) — aborting to avoid data loss.`);
  }

  writeFileSync(LIST_PATH, JSON.stringify(list, null, 2));

  const stillMissing = list.filter((e) => !e.title_tr).length;
  console.log(`[${label}] enriched ${enriched}/${batch.length} entries.`);
  if (notFound.length) console.log(`  codes not found (skipped): ${notFound.join(", ")}`);
  console.log(`  entries still missing title_tr overall: ${stillMissing}`);
}
