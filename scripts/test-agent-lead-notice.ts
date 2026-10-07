/**
 * Item 3: the agent lead report is labelled "Automated information summary based on user-entered details — not reviewed or
 * assessed by a migration agent" on the portal and in the PDF (cover + every page footer); the customer PDF is not.
 *
 *   npx tsx scripts/test-agent-lead-notice.ts      (real engine + real PDF generator; no database, no network)
 */
import "./lib/stub-request-context";

import { readFileSync } from "node:fs";
import { PDFParse } from "pdf-parse";

process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/d?sslmode=disable"; // never connects

import { AGENT_LEAD_NOTICE } from "../lib/readiness/agent-lead-notice";
import { generateReadinessPDF } from "../lib/readiness/generate-pdf";
import type { Locale, ReadinessInput } from "../lib/readiness/types";
import { runReadinessEngine } from "../src/lib/readiness-engine";

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (cond) console.log(`  ✅ ${msg}`);
  else {
    failures++;
    console.error(`  ❌ ${msg}${detail ? ` -- ${detail}` : ""}`);
  }
};
const LOCALES: Locale[] = ["en", "tr", "zh-Hans"];
const base: ReadinessInput = { locale: "en", country: "AU", currentCountry: "AU", passportCountry: "TR", age: "30", occupation: "Software Engineer 261313", englishLevel: "superior", qualificationLevel: "Bachelor's Degree", residenceState: "WA", preferredPathway: "491" };
const squash = (t: string) => t.replace(/\s+/g, "");

async function textOf(bytes: Uint8Array) {
  const parser = new PDFParse({ data: bytes.slice() });
  const pages = (await parser.getText()).pages.map((p: { text: string }) => p.text);
  await parser.destroy();
  return pages;
}

async function main() {
  console.log("1. portal");
  check(AGENT_LEAD_NOTICE.en === "Automated information summary based on user-entered details — not reviewed or assessed by a migration agent", "the English label is the approved wording");
  for (const f of ["app/[locale]/(portal)/agent/lead/[id]/page.tsx", "app/[locale]/(portal)/admin/crm/lead/[id]/page.tsx"]) {
    const src = readFileSync(f, "utf8");
    check(/AGENT_LEAD_NOTICE\.en/.test(src) && !/>Assessment report</.test(src), `${f}: label shown above the report, card no longer titled "Assessment report"`);
  }
  check(/audience:\s*"agent"/.test(readFileSync("app/api/agent/lead/[id]/pdf/route.ts", "utf8")), "the agent PDF route requests the agent label");

  console.log("\n2. PDFs");
  for (const locale of LOCALES) {
    const input = { ...base, locale };
    const report = runReadinessEngine(input);
    const mk = (audience?: "agent") => generateReadinessPDF({ report, locale, audience, userInputSummary: { name: "Test Lead", occupation: input.occupation } });
    const agent = await textOf(await mk("agent"));
    const customer = await textOf(await mk());
    const notice = squash(AGENT_LEAD_NOTICE[locale]);
    check(squash(agent[0]).includes(notice), `${locale}: label on the cover`);
    check(agent.slice(1).every((p) => squash(p).includes(notice.slice(0, 20))), `${locale}: label start on every following page footer (${agent.length - 1} pages)`);
    check(!customer.some((p) => squash(p).includes(notice.slice(0, 20))), `${locale}: the customer PDF does not carry it`);
  }
  if (failures) { console.error(`\n❌ ${failures} check(s) failed`); process.exit(1); }
  console.log("\n✅ ALL CHECKS PASSED");
}
main().catch((e) => { console.error(e); process.exit(1); });
