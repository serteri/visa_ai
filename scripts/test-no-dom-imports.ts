/**
 * Production regression guard (DOMMatrix is not defined on Vercel): the admin State pages, the editor and the server actions must be importable in a
 * plain Node process with no browser globals, and a PDF must be read by the real extraction code (loaded lazily) in that same environment.
 *
 *   npx tsx scripts/test-no-dom-imports.ts
 */
import "./lib/stub-request-context";

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { jsPDF } from "jspdf";

for (const g of ["DOMMatrix", "DOMPoint", "DOMRect", "window", "document", "navigator", "ImageData", "Path2D"]) {
  try {
    delete (globalThis as Record<string, unknown>)[g];
  } catch {
    /* read-only in this Node: the check below reports it */
  }
}

let failures = 0;
const t = (label: string, cond: boolean, detail = "") => {
  if (cond) console.log(`  ✅ ${label}`);
  else {
    failures++;
    console.error(`  ❌ ${label}${detail ? ` -- ${detail}` : ""}`);
  }
};

const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));

async function main() {
  const g = globalThis as Record<string, unknown>;
  t("the environment has no DOMMatrix, window or document", typeof g.DOMMatrix === "undefined" && typeof g.window === "undefined" && typeof g.document === "undefined");

  console.log("module evaluation without DOM globals");
  const modules: Array<[string, string]> = [
    ["states page", "../app/[locale]/(portal)/admin/crm/states/page"],
    ["state editor page", "../app/[locale]/(portal)/admin/crm/states/[code]/page"],
    ["state editor", "../app/[locale]/(portal)/admin/crm/states/[code]/StateEditor"],
    ["source update panel", "../app/[locale]/(portal)/admin/crm/states/[code]/SourceUpdatePanel"],
    ["server actions", "../app/[locale]/(portal)/admin/crm/states/actions"],
    ["source update workflow", "../lib/admin-data/source-update/update"],
  ];
  for (const [name, path] of modules) {
    try {
      await import(path);
      t(`${name} imports`, true);
    } catch (e) {
      t(`${name} imports`, false, e instanceof Error ? e.message : String(e));
    }
  }
  const routes = walk("app/api").filter((f) => /route\.ts$/.test(f));
  for (const f of routes) {
    try {
      await import(`../${f.split(String.fromCharCode(92)).join("/")}`);
      t(`${f.split(String.fromCharCode(92)).join("/")} imports`, true);
    } catch (e) {
      t(`${f.split(String.fromCharCode(92)).join("/")} imports`, false, e instanceof Error ? e.message : String(e));
    }
  }
  try {
    await import("../lib/document-processor");
    t("lib/document-processor imports", true);
  } catch (e) {
    t("lib/document-processor imports", false, e instanceof Error ? e.message : String(e));
  }
  t("importing them did not define DOMMatrix (no parser was evaluated)", typeof g.DOMMatrix === "undefined");

  console.log("no parser is imported at module level");
  const files = [...walk("app"), ...walk("lib"), ...walk("components")].filter((f) => /\.(ts|tsx)$/.test(f));
  const offenders = files.filter((f) => /^\s*import[^;\n]*from\s+["'](pdf-parse|pdfjs-dist[^"']*|unpdf|mammoth)["']/m.test(readFileSync(f, "utf8")));
  t("nothing under app, lib or components imports pdf-parse, pdfjs-dist, unpdf or mammoth statically", offenders.length === 0, offenders.join(", "));

  console.log("a PDF through the real extraction code");
  const doc = new jsPDF();
  doc.text("The 2026-27 allocation for subclass 190 is 1,350 places.", 10, 20);
  doc.text("The program will open to new registrations on 3 November 2026.", 10, 30);
  const bytes = new Uint8Array(doc.output("arraybuffer"));
  const { extractUpload } = await import("../lib/admin-data/source-update/extract");
  const out = await extractUpload("sample.pdf", bytes);
  t("the sample PDF is read (text of both lines)", out.kind === "pdf" && /allocation for subclass 190 is 1,350 places/.test(out.text) && /3 November 2026/.test(out.text), out.text.slice(0, 120));
  let msg = "";
  try {
    await extractUpload("broken.pdf", new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 1, 2, 3, 4, 5]));
  } catch (e) {
    msg = (e as Error).message;
  }
  t("a PDF that cannot be read gives the clear message, not a crash", /PDF could not be read; paste the text instead/.test(msg), msg);
  const { pdfPages, PdfReadError } = await import("../lib/pdf-text");
  const pages = await pdfPages(bytes);
  t("lib/pdf-text (used by document-processor and /api/document-analyze) reads the sample PDF page by page", pages.length === 1 && /allocation for subclass 190/.test(pages[0]));
  let perr: unknown;
  try { await pdfPages(new Uint8Array([1, 2, 3])); } catch (e) { perr = e; }
  t("an unreadable PDF raises PdfReadError", perr instanceof PdfReadError);
  const route = readFileSync("app/api/document-analyze/route.ts", "utf8");
  t("/api/document-analyze answers an unreadable PDF with a clear message", /The PDF could not be read\. Upload a clearer copy/.test(route) && !/pdf-parse/.test(route));
  const actions = readFileSync("app/[locale]/(portal)/admin/crm/states/actions.ts", "utf8");
  t("the action loads the extractor only when a file arrives (dynamic import)", /await import\("@\/lib\/admin-data\/source-update\/extract"\)/.test(actions));

  console.log(failures === 0 ? "\n✅ ALL CHECKS PASSED" : `\n❌ ${failures} CHECK(S) FAILED`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
