/**
 * "use server" / "use client" must be the first statement of a file (an import above it fails `next build`). The report suite does not run a build, so
 * this scans every source file for a directive preceded by code.
 *
 *   npx tsx scripts/test-directive-order.ts
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const SKIP = new Set(["node_modules", ".next", ".git", "dist", "coverage"]);
const bad: string[] = [];
let scanned = 0;
function walk(dir: string) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(name)) {
      const src = readFileSync(full, "utf8");
      const m = /^["']use (server|client)["'];?[ \t]*$/m.exec(src);
      if (!m) continue;
      scanned++;
      const code = src.slice(0, m.index).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "").trim();
      if (code) bad.push(full);
    }
  }
}
walk(".");
if (bad.length) {
  console.error(`❌ directive is not the first statement in:\n  ${bad.join("\n  ")}`);
  process.exit(1);
}
console.log(`✅ ${scanned} files with "use server" / "use client": the directive is first in every one`);
