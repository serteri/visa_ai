/**
 * Lists every occupation code for which the codebase names two different assessing authorities
 * (registry vs. occupation dataset). With --write, records each as a "needs human verification"
 * fact (last_verified null) in src/data/fee-provenance.json. Does not decide which authority is right.
 *
 * Usage: npx tsx scripts/audit-authority-conflicts.ts [--write]
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { listAuthorities } from "../lib/skills-assessment";
import { findAuthorityConflicts } from "../lib/skills-assessment/resolve-authority";

const conflicts = findAuthorityConflicts(listAuthorities());
for (const c of conflicts) {
  console.log(`${c.anzscoCode}  ${c.title}: ${c.named.map((n) => `${n.authority} [${n.where}]`).join(" vs ")}`);
}
console.log(`\n${conflicts.length} occupation code(s) name two or more different authorities.`);

if (process.argv.includes("--write")) {
  const file = path.join(process.cwd(), "src/data/fee-provenance.json");
  const raw = readFileSync(file, "utf8");
  const json = JSON.parse(raw) as { facts: Array<Record<string, unknown>> };
  json.facts = json.facts.filter((f) => !String(f.id).startsWith("authority_conflict_"));
  for (const c of conflicts) {
    json.facts.push({
      id: `authority_conflict_${c.anzscoCode}`,
      description: `ANZSCO ${c.anzscoCode} (${c.title}): the codebase names more than one assessing authority -- ${c.named.map((n) => `${n.authority} (${n.where})`).join(" vs ")}. The report resolves ONE authority from the registry (lib/skills-assessment/authorities/*.ts) and suppresses the dataset warning text that names another; which body is correct is not decided here.`,
      value: null,
      currency: null,
      effective_from: null,
      last_verified: null,
      source: "needs human verification -- authority named inconsistently; not checkable against an official source from inside this environment",
      locations: ["lib/skills-assessment/authorities/*.ts", "src/data/occupations.json"],
    });
  }
  writeFileSync(file, JSON.stringify(json, null, 2) + "\n");
  console.log(`Wrote ${conflicts.length} authority_conflict_* facts to ${file}`);
}
