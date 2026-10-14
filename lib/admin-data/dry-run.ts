import { SEED_STATUS_CHANGES } from "./seed";
import type { StateProgramData } from "./types";

/** The human-readable dry run of the seed (scripts/seed-admin-data.ts, docs/admin-data-seed-dry-run.md): exactly what would be written, per state. */

const money = (n: number | null) => (n === null ? "—" : `AUD ${n.toLocaleString("en-AU", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2 })}`);
const clip = (s: string, n = 220) => (s.length > n ? `${s.slice(0, n)}…` : s);

export type LegacyAdminRow = { stateCode: string; status: string; feeAud: number | null; customAiNote: string | null; officialWebsite: string | null; updatedAt: string };

export function renderDryRun(programs: StateProgramData[], opts: { existing?: string[]; legacy?: LegacyAdminRow[] | null; legacyError?: string | null; generatedFor?: string } = {}): string {
  const lines: string[] = [];
  const existing = new Set(opts.existing ?? []);
  lines.push("# Seed dry run: state nomination admin data", "");
  lines.push(`Rows that would be inserted: ${programs.filter((p) => !existing.has(p.stateCode)).length} of ${programs.length}. A state that already has a row is skipped, never overwritten.`);
  lines.push("Built from `lib/state-nomination/state-rules-config.ts`, `src/data/state-nomination-status.json` and the carried-over translations. Nothing has been written.", "");

  lines.push("## Summary", "", "| State | Status | Program year | Opening | Allocation 190 / 491 | Fee 190 excl. / incl. GST | Conditions | Residence rule | Translations carried over |", "|---|---|---|---|---|---|---|---|---|");
  for (const p of programs) {
    const s190 = p.subclasses.find((s) => s.subclass === "190");
    const s491 = p.subclasses.find((s) => s.subclass === "491");
    const res = p.conditions.find((c) => c.residenceRule);
    const carried = [p.notes, ...p.conditions.map((c) => c.text), ...p.scoring.specialConditions].filter((f) => f.tr?.origin === "carried_over" || f["zh-Hans"]?.origin === "carried_over").length;
    lines.push(`| ${p.stateCode} | ${p.status} | ${p.programYear} | ${p.openingDate ?? "—"} | ${s190?.allocation ?? "—"} / ${s491?.allocation ?? "—"} | ${money(s190?.feeExclGst ?? null)} / ${money(s190?.feeInclGst ?? null)} | ${p.conditions.length} | ${res ? `${res.residenceRule}${res.subclasses.length ? ` (${res.subclasses.join("/")} only)` : ""}` : "not stated"} | ${carried} |`);
  }
  lines.push("");

  lines.push("## Where the seed differs from the rules file on purpose", "");
  for (const [code, why] of Object.entries(SEED_STATUS_CHANGES)) lines.push(`- **${code}**: ${why}`);
  lines.push("- **TAS**: `Open (Onshore Only)` is stored as `Open (Onshore only)` (spelling only).");
  lines.push("- **ACT** stays `High Demand`, **WA** stays `Check official page`: a legacy status is seeded unchanged so every report score stays exactly as it is today; change it in the admin page when you decide to.", "");
  lines.push("Translations: every Turkish / Chinese text customers already see today is carried over and marked **reviewed (carried over from the code)** so no report changes language on the day of the switch. Untick one in the admin page to make customers see English until you have re-read it.", "");

  for (const p of programs) {
    lines.push(`## ${p.stateName} (${p.stateCode}) ${existing.has(p.stateCode) ? "(already has a row: skipped)" : ""}`, "");
    lines.push(`- Status: **${p.status}**; program year ${p.programYear}; opening ${p.openingDate ?? "—"}; closing ${p.closingDate ?? "—"}; last verified ${p.lastVerifiedAt.slice(0, 10)} (by ${p.lastVerifiedBy})`);
    lines.push(`- Official page: ${p.officialUrl ?? "—"}${p.extraUrls.length ? `; also watched: ${p.extraUrls.join(", ")}` : ""}`);
    lines.push(`- Sources (text): ${clip(p.sourceText, 400)}`);
    if (p.exceptions) lines.push(`- Exceptions (${p.exceptions.subclass ?? "any"}, ${p.exceptions.appliesTo ?? "—"}, deadline ${p.exceptions.deadline ?? "—"}): ${clip(p.exceptions.text.en, 400)}`);
    for (const s of p.subclasses) {
      lines.push(`- Subclass ${s.subclass}: availability ${s.availability}; allocation ${s.allocation ?? "—"}; fee ${money(s.feeExclGst)} excl. / ${money(s.feeInclGst)} incl. GST (${s.gstBasis})${s.feeNote ? `; note: ${clip(s.feeNote.en, 200)}` : ""}`);
    }
    lines.push(`- Note (en): ${clip(p.notes.en, 300)}`);
    lines.push(`- Note translations: tr ${p.notes.tr ? "yes" : "no"}, zh-Hans ${p.notes["zh-Hans"] ? "yes" : "no"}`);
    lines.push(`- Conditions (${p.conditions.length}):`);
    for (const c of p.conditions) lines.push(`  - \`${c.id}\` [${c.kind}${c.residenceRule ? `, residence: ${c.residenceRule}${c.subclasses.length ? ` ${c.subclasses.join("/")}` : ""}` : ""}] ${clip(c.text.en, 160)}${c.text.tr || c.text["zh-Hans"] ? " (translated)" : ""}`);
    lines.push(`- Scoring inputs: onshore ${p.scoring.onshoreAvailability}, offshore ${p.scoring.offshoreAvailability}, min points ${p.scoring.minimumPoints}, min English ${p.scoring.minimumEnglish}, quota pressure ${p.scoring.offshoreQuotaPressure} (rule: ${p.scoring.ruleQuotaPressure}), preferred ${p.scoring.preferredVisaTypes.join("/")}`, "");
  }

  lines.push("## Existing admin rows (`state_nomination_configs`)", "");
  if (opts.legacy) {
    if (opts.legacy.length === 0) lines.push("None.");
    for (const r of opts.legacy) lines.push(`- ${r.stateCode}: status \`${r.status}\`, fee ${r.feeAud ?? "—"}, website ${r.officialWebsite ?? "—"}, saved ${r.updatedAt.slice(0, 10)}${r.customAiNote ? `, note: ${clip(r.customAiNote, 120)}` : ""}. Not merged: it is older than the 2026-10-13 refresh (today the rules file already wins over it); copy anything you want kept in the admin page after the seed.`);
  } else lines.push(`Could not be read here${opts.legacyError ? ` (${opts.legacyError})` : ""}. Run the script yourself to see them; they are listed for information only and are never merged.`);
  lines.push("", "## What `--execute` does", "", "- Inserts the missing states and their subclass rows, and one audit entry per field (action `seed`), in one transaction; refuses to run unless `--expect-rows N` equals the number of rows listed above.", "- Never updates or deletes an existing row; running it twice inserts nothing the second time.", "- Needs the tables from `prisma/manual-migrations/2026-10-15-create-admin-state-data.sql` first.");
  return lines.join("\n") + "\n";
}
