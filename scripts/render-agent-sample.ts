/**
 * Renders the dedicated sample report for migration agents from a SYNTHETIC profile through the real PDF route
 * (Software Engineer 261313, 28, in Australia, Superior English, doctoral qualification, skills assessment completed,
 * target visa "not_sure", employment and partner details deliberately not entered). The name is "Sample Applicant" and
 * the report ID prints as SAMPLE-REPORT (lib/reports/sample.ts). Output: docs/agent-sample/LogiVisa-Sample-Report.pdf
 *
 *   npx tsx scripts/render-agent-sample.ts [outFile]
 */
import "./lib/stub-request-context";

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { SAMPLE_APPLICANT_NAME } from "../lib/reports/sample";
import type { ReadinessInput } from "../lib/readiness/types";
import { renderPersonaPdfTexts } from "./render-persona-pdfs";

export const AGENT_SAMPLE_PROFILE: ReadinessInput = {
  locale: "en",
  country: "AU",
  mainGoal: "Researching Australian skilled visa information",
  currentCountry: "AU",
  passportCountry: "IN",
  age: "28",
  occupation: "Software Engineer (261313)",
  occupationConfirmed: "yes",
  englishLevel: "superior",
  qualificationLevel: "PhD/Doctorate",
  qualificationAwardedInAustralia: false,
  isQualificationRecognized: true,
  targetVisa: "not_sure",
  residenceState: "NSW",
  employerSponsorship: "none",
  applicationStage: "planning",
  migrationGoals: ["direct_pr"],
} as ReadinessInput;

async function main() {
  process.env.DATABASE_URL ||= "postgresql://u:p@localhost:5432/d?sslmode=disable";
  const out = process.argv[2] ?? path.join("docs", "agent-sample", "LogiVisa-Sample-Report.pdf");
  mkdirSync(path.dirname(out), { recursive: true });
  await renderPersonaPdfTexts({ agentSample: AGENT_SAMPLE_PROFILE }, ["en"], undefined, "2026-10-21T00:00:00Z", (_id, _l, bytes) => writeFileSync(out, bytes), SAMPLE_APPLICANT_NAME);
  console.log(`wrote ${out}`);
}

if (process.argv[1]?.includes("render-agent-sample")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
