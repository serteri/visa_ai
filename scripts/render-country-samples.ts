/**
 * Renders the two synthetic sample reports through the real PDF route: one Australian, one Canadian. Synthetic applicants only: the name
 * is "Sample Applicant" and the report ID prints as SAMPLE-REPORT (lib/reports/sample.ts).
 *
 *   npx tsx scripts/render-country-samples.ts [outDir]    (default: docs/country-samples)
 *
 * Output: sample-australia-report.pdf, sample-canada-report.pdf
 */
import "./lib/stub-request-context";

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { SAMPLE_APPLICANT_NAME } from "../lib/reports/sample";
import type { ReadinessInput } from "../lib/readiness/types";
import { renderPersonaPdfTexts, type RenderedPersona } from "./render-persona-pdfs";
import { AGENT_SAMPLE_PROFILE } from "./render-agent-sample";

/** Australia: the agent-sample profile with a selected visa, so the selected-visa marker and the 189 / 190 / 491 sections are exercised. */
export const AU_SAMPLE_PROFILE: ReadinessInput = { ...AGENT_SAMPLE_PROFILE, targetVisa: "190", preferredPathway: "190", preferredState: "NSW" } as ReadinessInput;

/** Canada: Express Entry (FSW and CEC selected), with language, education and occupation entered; work experience, ECA and partner details deliberately not entered. */
export const CA_SAMPLE_PROFILE: ReadinessInput = {
  locale: "en",
  country: "CA",
  mainGoal: "Researching Canadian immigration information",
  currentCountry: "IN",
  passportCountry: "IN",
  age: "29",
  occupation: "Software developers and programmers (21232)",
  nocCode: "21232",
  nocTeer: 1,
  englishLevel: "CLB 9",
  qualificationLevel: "Master's Degree (Research)",
  migrationGoals: ["direct_pr"],
  preferredPathway: "canada-express-entry-fsw,canada-express-entry-cec",
} as unknown as ReadinessInput;

/** Renders the two samples in the given locales in ONE call (the PDF route keeps the first database stub it sees); the English PDFs are written to outDir. */
export async function renderCountrySamples(outDir?: string, locales: Array<"en" | "tr" | "zh-Hans"> = ["en"]): Promise<RenderedPersona[]> {
  process.env.DATABASE_URL ||= "postgresql://u:p@localhost:5432/d?sslmode=disable";
  if (outDir) mkdirSync(outDir, { recursive: true });
  const name = (id: string) => (id === "au" ? "sample-australia-report.pdf" : "sample-canada-report.pdf");
  return renderPersonaPdfTexts(
    { au: AU_SAMPLE_PROFILE, ca: CA_SAMPLE_PROFILE },
    locales,
    undefined,
    "2026-10-21T00:00:00Z",
    (id, locale, bytes) => { if (outDir && locale === "en") writeFileSync(path.join(outDir, name(id)), bytes); },
    SAMPLE_APPLICANT_NAME,
  );
}

if (process.argv[1]?.includes("render-country-samples")) {
  const out = process.argv[2] ?? path.join("docs", "country-samples");
  renderCountrySamples(out)
    .then(() => { console.log(`wrote ${out}/sample-australia-report.pdf and ${out}/sample-canada-report.pdf`); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}
