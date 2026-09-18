#!/usr/bin/env node
/**
 * CI guard against reintroducing independent points-threshold arithmetic.
 *
 * Background: several bugs in the Visa Viability Report (cover-page badge,
 * points gauge bar, CRM lead tier, etc.) came from code computing
 * `estimatedPoints >= 65` (or similar) locally instead of reading the
 * canonical `assessmentState.isEoiEligible` / `assessmentState.pathwayPoints`
 * -- see lib/readiness/assessment-state.ts and lib/readiness/eligibility-badge.ts.
 * This script fails the build if a new raw threshold comparison shows up
 * anywhere else in the tracked source tree.
 *
 * Usage: node scripts/check-raw-threshold-comparisons.mjs
 * Exit code 0 = clean, 1 = violations found (or git/exec error).
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Files allowed to compute the threshold directly -- these ARE the
// canonical source (assessment-state.ts) or a canonical derived view
// (eligibility-badge.ts) that every other file must read from instead.
const EXEMPT_FILES = new Set([
  "lib/readiness/assessment-state.ts",
  "lib/readiness/eligibility-badge.ts",
]);

// Only flag comparisons against a numeric LITERAL (e.g. `>= 65`) -- a
// comparison against a named constant like `POINTS_THRESHOLD` is exactly
// the fix this check exists to require, so it must not itself trip the check.
const PATTERNS = [
  { name: "estimatedPoints >= <literal>", re: /estimatedPoints\s*>=\s*\d/ },
  { name: "points >= 65", re: /\bpoints\s*>=\s*65\b/ },
  { name: "pointsScore >= <literal>", re: /pointsScore\s*>=\s*\d/ },
  { name: "raw meetsThreshold/passedThreshold assignment", re: /(meetsThreshold|passedThreshold)\s*=\s*[a-zA-Z_.?]*[Pp]oints\s*>=\s*\d/ },
  // Employer Sponsorship module (CSIT) -- same failure mode as points: a
  // salary comparison against a raw numeric literal instead of the
  // canonical CURRENT_CSIT constant (lib/readiness/constants.ts) /
  // assessmentState.employerSponsorship.au.meetsCsit.
  { name: "annualSalaryAud >= <literal>", re: /annualSalaryAud\s*>=\s*\d/ },
  { name: "meetsCsit raw assignment", re: /meetsCsit\s*=\s*[a-zA-Z_.?]*[Ss]alary[a-zA-Z_.?]*\s*>=\s*\d/ },
];

function isCommentLine(trimmed) {
  return trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*");
}

function stripLineComment(line) {
  const idx = line.indexOf("//");
  return idx === -1 ? line : line.slice(0, idx);
}

function main() {
  let files;
  try {
    const out = execFileSync("git", ["ls-files", "--", "*.ts", "*.tsx"], { encoding: "utf8" });
    files = out.split("\n").filter(Boolean);
  } catch (err) {
    console.error("check-raw-threshold-comparisons: failed to list git-tracked files:", err.message);
    process.exit(1);
  }

  const violations = [];

  for (const file of files) {
    if (EXEMPT_FILES.has(file)) continue;
    if (file.endsWith(".d.ts")) continue;

    let content;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      continue; // deleted-but-still-tracked edge case, skip
    }

    const lines = content.split("\n");
    lines.forEach((rawLine, i) => {
      const trimmed = rawLine.trim();
      if (isCommentLine(trimmed)) return;
      const code = stripLineComment(rawLine);
      for (const { name, re } of PATTERNS) {
        if (re.test(code)) {
          violations.push({ file, line: i + 1, pattern: name, text: trimmed });
        }
      }
    });
  }

  if (violations.length === 0) {
    console.log("check-raw-threshold-comparisons: OK (no raw threshold comparisons found).");
    process.exit(0);
  }

  console.error(`check-raw-threshold-comparisons: found ${violations.length} raw threshold comparison(s) outside the canonical source:\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line} [${v.pattern}]\n    ${v.text}`);
  }
  console.error(
    "\nFix: read `assessmentState.isEoiEligible` (or `assessmentState.pathwayPoints[...].total` / " +
    "`getEligibilityBadgeState(assessmentState, locale)` for UI badges) instead of comparing a raw " +
    "points number against a literal threshold. Import `POINTS_THRESHOLD` from " +
    "`lib/readiness/assessment-state.ts` if you need the literal number for display text only.\n"
  );
  process.exit(1);
}

main();
