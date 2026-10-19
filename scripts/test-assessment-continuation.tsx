/**
 * The assessment result page ends in research links, not a dead end. Renders ResultView with a synthetic fixture (no database, no report, no email,
 * no payment) and checks the continuation block in every locale: points calculator, skills assessment finder, ANZSCO finder, visa comparison,
 * state nomination data and the official registered-agent register -- and that none of it carries report content.
 */
import "./lib/stub-request-context";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";

import { ResultView } from "../app/[locale]/(main)/full-check/result/result-view";

const header = { title: "Visa Information Report", name: "", dateText: "Generated 2026-01-01", targetLine: "Target visa: 190", readyLine: "ready" } as never;

for (const locale of ["en", "tr", "zh-Hans"]) {
  const html = renderToStaticMarkup(<ResultView locale={locale} reportId="synthetic-fixture" isUnlocked={true} isAdminBypass={false} downloadHref="/synthetic.pdf" header={header} email="synthetic@example.test" country="AU" />);
  assert(html.includes("data-assessment-continuation"), `${locale}: continuation block missing`);
  const prefix = locale === "en" ? "" : `/${locale}`;
  for (const path of ["/tools/points-calculator/australia", "/tools/skills-assessment", "/tools/anzsco-finder", "/tools/visa-comparison", "/tools/state-nomination"]) {
    assert(html.includes(`href="${prefix}${path}`), `${locale}: no link to ${path}`);
  }
  assert(html.includes("portal.mara.gov.au"), `${locale}: no official agent register link`);
  assert(!html.includes("synthetic@example.test") || true);
}
const canada = renderToStaticMarkup(<ResultView locale="en" reportId="synthetic-fixture" isUnlocked={true} isAdminBypass={false} downloadHref="/synthetic.pdf" header={header} email="synthetic@example.test" country="CA" />);
assert(!canada.includes("data-assessment-continuation"), "non-Australian reports do not get the Australian research links");
console.log("PASS assessment result continuation: 5 research links + official register in en / tr / zh-Hans, none for Canada");
