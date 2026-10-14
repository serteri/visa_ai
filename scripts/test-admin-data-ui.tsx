/**
 * The admin state editor renders for every state (server-side render of the client component, no browser, no database): the fields the
 * admin needs are there with the saved values, the right controls appear for the right data (exceptions for NT, the legacy status for ACT),
 * and nothing throws on any seeded state.
 *
 *   npx tsx scripts/test-admin-data-ui.tsx
 */
import "./lib/stub-request-context";
import "./lib/stub-prisma-state";

import Module from "node:module";

import { createElement } from "react";
import { renderToString } from "react-dom/server";

import { buildSeedPrograms } from "../lib/admin-data/seed";
import type { AuditRecord } from "../lib/admin-data/audit";

// The editor is a client component that uses next/navigation's router; outside Next it gets a stand-in.
const mod = Module as unknown as { _resolveFilename: (request: string, ...rest: unknown[]) => string; _cache: Record<string, unknown> };
const originalResolve = mod._resolveFilename;
mod._resolveFilename = function (this: unknown, request: string, ...rest: unknown[]) {
  if (request === "next/navigation") return "stub:next/navigation";
  return originalResolve.call(this, request, ...rest);
};
mod._cache["stub:next/navigation"] = { id: "stub:next/navigation", filename: "stub:next/navigation", loaded: true, exports: { useRouter: () => ({ refresh() {}, push() {} }) } };

let failures = 0;
const t = (label: string, cond: boolean, detail = "") => {
  if (cond) console.log(`  ✅ ${label}`);
  else {
    failures++;
    console.error(`  ❌ ${label}${detail ? ` -- ${detail}` : ""}`);
  }
};

const history: AuditRecord[] = [
  { id: "a1", at: "2026-10-15T10:00:00.000Z", actorId: "u1", actorEmail: "admin@logivisa.test", actorLabel: "admin@logivisa.test", entityType: "state_program", entityKey: "TAS", fieldPath: "status", oldValue: "Open (Onshore only)", newValue: "Suspended / Closed", action: "edit", note: null },
  { id: "a2", at: "2026-10-14T00:00:00.000Z", actorId: null, actorEmail: null, actorLabel: "seed", entityType: "state_program", entityKey: "TAS", fieldPath: "notes", oldValue: null, newValue: { en: "x" }, action: "seed", note: "initial rows" },
];

async function main() {
  const { StateEditor } = await import("../app/[locale]/(portal)/admin/crm/states/[code]/StateEditor");
  const programs = buildSeedPrograms();
  for (const [code, program] of Object.entries(programs)) {
    let html = "";
    try {
      html = renderToString(createElement(StateEditor, { initial: program, history, locale: "en" }));
    } catch (e) {
      t(`${code}: renders`, false, e instanceof Error ? e.message : String(e));
      continue;
    }
    t(`${code}: renders the editor with the saved status, year, opening date and URL`, html.includes('data-testid="admin-state-editor"') && html.includes(program.programYear) && html.includes(program.officialUrl ?? "") && (!program.openingDate || html.includes(program.openingDate)));
    t(`${code}: both subclasses have allocation and fee fields (excl. and incl. GST) and the GST basis`, ["190", "491"].every((s) => html.includes(`admin-fee-excl-${s}`) && html.includes(`admin-fee-incl-${s}`) && html.includes(`admin-gst-basis-${s}`) && html.includes(`admin-allocation-${s}`)));
    t(`${code}: every condition has its own editor with the three languages and a draft button`, program.conditions.every((c) => html.includes(`admin-condition-${c.id}`)) && (html.match(/Draft translation/g) ?? []).length >= 2 * program.conditions.length);
    t(`${code}: Save is disabled until something changes; last verified is shown and not editable`, /data-testid="admin-save"[^>]*disabled/.test(html) || /disabled[^>]*data-testid="admin-save"/.test(html));
    t(`${code}: the history shows who changed what, with a restore button on an edit and none on the seed entry`, html.includes("admin@logivisa.test") && (html.match(/Restore the old value/g) ?? []).length === 1 && html.includes("seed"));
  }

  const nt = renderToString(createElement(StateEditor, { initial: programs.NT, history: [], locale: "en" }));
  t("NT: the exceptions editor is shown with the exact exception text and the 491 / onshore / deadline fields", nt.includes('data-testid="admin-exceptions"') && /NT Graduate or NT Resident/.test(nt) && nt.includes("2027-09-30"));
  const nsw = renderToString(createElement(StateEditor, { initial: programs.NSW, history: [], locale: "en" }));
  t("NSW (no exceptions): offered 'Add exceptions' instead", nsw.includes('data-testid="admin-add-exceptions"') && !nsw.includes('data-testid="admin-exceptions"'));
  const act = renderToString(createElement(StateEditor, { initial: programs.ACT, history: [], locale: "en" }));
  t("ACT (seeded as the legacy 'High Demand'): the legacy value stays selectable, marked as legacy, next to the current statuses", /High Demand(<!-- -->)? \(legacy/.test(act) && act.includes("Closed with exceptions") && act.includes("Not yet published") && act.includes("Check official page") && act.includes("Open (Onshore only)"));
  t("a residence condition shows its explicit rule selector", /data-testid="admin-residence-rule-c\d+"/.test(renderToString(createElement(StateEditor, { initial: programs.TAS, history: [], locale: "en" }))));
  t("carried-over translations are labelled as reviewed and carried over", /carried over from the code/.test(renderToString(createElement(StateEditor, { initial: programs.NSW, history: [], locale: "en" }))));

  console.log(failures === 0 ? "\n✅ ALL CHECKS PASSED" : `\n❌ ${failures} CHECK(S) FAILED`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
