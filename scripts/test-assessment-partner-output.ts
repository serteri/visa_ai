import assert from "node:assert/strict";
import fs from "node:fs";
import { renderPersonaPdfTexts } from "./render-persona-pdfs";
import { ensureCountrySpecificReportSchema } from "../lib/readiness/country-scope";
import type { ReadinessInput, ReadinessReport } from "../lib/readiness/types";

async function main() {
  const base: ReadinessInput = {
    locale: "en", country: "AU", targetVisa: "820_801", preferredPathway: "820_801",
    mainGoal: "", currentCountry: "AU", passportCountry: "TR", age: "30",
    sponsorOrFamily: "Relation: married | Duration: more_than_2_years | Sponsor: citizen | Prev Sponsor: no | Evidence: marriage_cert",
  };
  const rows = await renderPersonaPdfTexts({ partner: base, missing: { ...base, sponsorOrFamily: "" } }, ["en", "tr", "zh-Hans"], undefined, undefined,
    process.env.ASSESSMENT_PDF_QA ? (id, locale, bytes) => {
      if (id === "partner" && locale === "en") fs.writeFileSync(process.env.ASSESSMENT_PDF_QA!, bytes);
    } : undefined);
  for (const row of rows) {
    assert.doesNotThrow(() => ensureCountrySpecificReportSchema(row.report as ReadinessReport, "AU"));
    assert(!/No immediate sponsorship bar|personalised readiness assessment|PR strategy|confidential readiness assessment/i.test(row.text));
    assert(row.text.includes("Home Affairs: Partner visa 820"));
    if (row.locale === "en") {
      assert(row.text.includes("Visa Information Report"));
      assert(row.text.includes("User-provided entries"));
      assert(row.text.includes("has not been assessed"));
      if (row.id === "missing") {
        assert((row.text.match(/Not provided/g) ?? []).length >= 4);
        assert(!row.text.includes("Eligible NZ Citizen"));
      } else assert(row.text.includes("You entered No"));
    }
  }
  console.log("PASS 6 Partner PDFs: actual pathway schema, neutral cover, supplied/unknown entries, source and professional boundary");
}
main().catch(error => { console.error(error); process.exit(1); });
